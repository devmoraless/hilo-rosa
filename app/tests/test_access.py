import pytest
from fastapi.testclient import TestClient

from app.db import Patient, Result
from app.fixtures.seed_data import LAURA, MARIA
from app.main import app
from app.services import store
from app.services.otp import OTPStore


@pytest.fixture
def access_client(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr("app.services.otp.time.time", lambda: clock[0])
    with TestClient(app) as client:
        yield client, clock


def start(client, **changes):
    return client.post("/api/access/start", json={
        "token": MARIA["qr_token"], "quien": "contacto", "contacto_id": LAURA["id"],
        "fecha_nacimiento": MARIA["fecha_nacimiento"], **changes,
    })


def test_wrong_birthdate_is_rejected(access_client):
    client, _ = access_client
    response = start(client, fecha_nacimiento="2000-01-01")
    assert response.status_code == 403


def test_otp_expires_after_five_minutes(access_client):
    client, clock = access_client
    challenge = start(client).json()
    assert "challenge_id" in challenge
    clock[0] += 300
    response = client.post("/api/access/verify", json={"challenge_id": challenge["challenge_id"], "codigo": challenge["codigo_demo"]})
    assert response.status_code == 410


def test_sixth_attempt_is_blocked(access_client):
    client, _ = access_client
    challenge = start(client).json()
    assert "codigo_demo" in challenge
    wrong = "000000" if challenge["codigo_demo"] != "000000" else "111111"
    for _ in range(5):
        response = client.post("/api/access/verify", json={"challenge_id": challenge["challenge_id"], "codigo": wrong})
        assert response.status_code == 403
    response = client.post("/api/access/verify", json={"challenge_id": challenge["challenge_id"], "codigo": challenge["codigo_demo"]})
    assert response.status_code == 429


def test_revoked_token_returns_410(access_client):
    client, _ = access_client
    with store.session() as s:
        patient = s.get(Patient, MARIA["id"])
        patient.qr_revocado = True
        s.add(patient)
        s.commit()
    assert start(client).status_code == 410


def test_trusted_contact_view_is_logged_in_audit(access_client):
    client, _ = access_client
    with store.session() as s:
        s.add(Result(id="visible", patient_id=MARIA["id"], estado="notificado", pdf_path="demo.pdf", explicacion_clara="Tu resultado salió normal", clasificacion="normal"))
        s.add(Result(id="hidden", patient_id=MARIA["id"], estado="autorizado", pdf_path="demo.pdf"))
        s.commit()
    challenge = start(client).json()
    assert "challenge_id" in challenge
    verified = client.post("/api/access/verify", json={"challenge_id": challenge["challenge_id"], "codigo": challenge["codigo_demo"]})
    assert verified.status_code == 200
    response = client.get("/api/access/me/results", headers={"Authorization": f"Bearer {verified.json()['session_token']}"})
    assert response.status_code == 200
    assert [r["id"] for r in response.json()] == ["visible"]
    assert response.json()[0]["explicacion_clara"] == "Tu resultado salió normal"
    assert response.json()[0]["pdf_url"] == "/api/results/visible/pdf"
    audit = client.get("/api/audit").json()
    assert audit["integridad_ok"] is True
    assert audit["entries"][-1]["accion"] == "visto por Laura (hija)"
