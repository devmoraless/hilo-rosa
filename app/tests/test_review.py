"""HR-009 · Médica: revisión, autorización con cédula y aviso sin diagnóstico."""

import unicodedata

import pytest
from fastapi.testclient import TestClient
from sqlmodel import select

from app.db import AuditLog, FollowUpTask, Result
from app.main import app
from app.services import notifier as notifier_mod
from app.services import store
from app.services.sync import verify_chain

client = TestClient(app)
MEDICA = {"X-Demo-Role": "medica"}
FIRMA = {"nombre": "Dra. Ana Ruiz Campos", "cedula": "12345678"}


@pytest.fixture(autouse=True)
def _clean_feed(monkeypatch):
    monkeypatch.setattr(notifier_mod.settings, "telegram_bot_token", "")
    notifier_mod.LogNotifier.clear()


def _plain(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn").lower()


def _pap_result(result_id: str = "res-maria-pap") -> str:
    with store.session() as s:
        s.add(Result(id=result_id, patient_id="pat-maria", pdf_path="app/fixtures/pdfs/resultado_EIRA-7K3P.pdf",
                     pdf_nombre="resultado_EIRA-7K3P.pdf", folio_detectado="EIRA-7K3P",
                     estado="por_revisar", tipo_estudio="papanicolaou"))
        s.commit()
    return result_id


def _authorize(rid: str, body: dict, headers: dict | None = MEDICA):
    return client.post(f"/api/results/{rid}/authorize", json=body, headers=headers or {})


def test_authorize_requires_medica_role_and_cedula():
    rid = _pap_result()
    body = {"bethesda": "NILM", "conducta": "rutina", **FIRMA}
    assert _authorize(rid, body, {"X-Demo-Role": "laboratorio"}).status_code == 403
    assert _authorize(rid, body, None).status_code == 403
    assert _authorize(rid, {**body, "cedula": "  "}).status_code == 422
    assert _authorize(rid, {**body, "nombre": ""}).status_code == 422
    with store.session() as s:
        assert s.get(Result, rid).estado == "por_revisar"

    r = _authorize(rid, body)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["result"]["estado"] == "notificado"
    assert data["result"]["clasificacion"] == "normal"
    assert data["result"]["autorizado_por_nombre"] == FIRMA["nombre"]
    assert data["result"]["proximo_control"]
    with store.session() as s:
        row = s.get(Result, rid)
        assert row.autorizado_por_cedula == "12345678"
        assert row.notificado_at
        entries = s.exec(select(AuditLog).order_by(AuditLog.id)).all()
        acciones = [e.accion for e in entries if e.entidad_id == rid]
        assert "resultado.autorizado" in acciones and "resultado.notificado" in acciones
        ok, _ = verify_chain([e.model_dump() for e in entries])
        assert ok
    # Shows up in the review board under its new state
    board = client.get("/api/review/results", params={"estado": "notificado"}, headers=MEDICA).json()
    assert [x["id"] for x in board] == [rid]
    # Already authorized: cannot be authorized twice
    assert _authorize(rid, body).status_code == 409


def test_notification_text_never_contains_diagnosis():
    forbidden = ["nilm", "normal", "cancer", "bethesda", "lsil", "hsil", "birads", "negativ", "positiv",
                 "benign", "seguimiento", "repetir", "insatisfactoria", "diagnost"]
    cases = [("res-a", {"bethesda": "NILM", "conducta": "rutina"}),
             ("res-b", {"bethesda": "insatisfactoria", "conducta": "repetir"})]
    for rid, capture in cases:
        _pap_result(rid)
        r = _authorize(rid, {**capture, **FIRMA})
        assert r.status_code == 200, r.text
        note = r.json()["notification"]
        assert note is not None
        text = _plain(note["mensaje"])
        assert not [w for w in forbidden if w in text], note["mensaje"]
        assert "listo" in text
        assert "3411000001" not in note["destino_enmascarado"]
        assert note["destino_enmascarado"].endswith("01")

    feed = client.get("/api/notifications").json()
    assert len(feed) == 2
    assert all(n["canal"] == "log" for n in feed)
    assert all(not [w for w in forbidden if w in _plain(n["mensaje"])] for n in feed)


def test_abnormal_result_creates_call_task_instead_of_notification():
    rid = _pap_result()
    r = _authorize(rid, {"bethesda": "HSIL", "conducta": "colposcopia", **FIRMA,
                         "explicacion_clara": "Texto editado que no debe usarse"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["notification"] is None
    assert "llamar" in data["tareas"]
    assert data["result"]["estado"] == "autorizado"
    assert data["result"]["prioridad"] == "alta"
    assert data["result"]["explicacion_clara"] is None
    with store.session() as s:
        tareas = s.exec(select(FollowUpTask).where(FollowUpTask.result_id == rid)).all()
        assert "llamar" in [t.tipo for t in tareas]
        assert all(t.patient_id == "pat-maria" for t in tareas)
        assert s.get(Result, rid).notificado_at is None
    assert client.get("/api/notifications").json() == []
    calls = client.get("/api/review/tasks", headers=MEDICA).json()
    assert any(t["tipo"] == "llamar" and t["result_id"] == rid for t in calls)


def test_falls_back_to_log_notifier_without_token(monkeypatch):
    assert isinstance(notifier_mod.get_notifier(), notifier_mod.LogNotifier)
    sent = notifier_mod.get_notifier().send("+523411000001", "Hola, tu resultado ya está listo.")
    assert sent.canal == "log"
    assert sent.destino_enmascarado == "+52 •••• ••01"

    # With a token but a failing Telegram API, the notice still goes out through the log.
    monkeypatch.setattr(notifier_mod.settings, "telegram_bot_token", "fake-token")
    monkeypatch.setattr(notifier_mod.settings, "telegram_demo_chat_id", "42")

    def boom(*_a, **_k):
        raise notifier_mod.httpx.ConnectError("sin red")

    monkeypatch.setattr(notifier_mod.httpx, "post", boom)
    n = notifier_mod.get_notifier()
    assert isinstance(n, notifier_mod.TelegramNotifier)
    out = n.send("+523411000001", "Hola, tu resultado ya está listo.")
    assert out.canal == "log"
    assert len(notifier_mod.LogNotifier.feed()) == 2
