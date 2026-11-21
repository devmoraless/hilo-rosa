import re
import unicodedata

from fastapi.testclient import TestClient
from sqlmodel import select

from app.db import AuditLog, Patient, Study, SyncOp, TrustedContact, Visit
from app.fixtures.seed_data import JORNADA
from app.main import app
from app.services import store
from app.services.sync import verify_chain

client = TestClient(app, headers={"X-Demo-Role": "capturista"})
SNAPSHOT = f"/api/jornadas/{JORNADA['id']}/snapshot"


def _plain(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn").lower()


def _new_patient_batch(op_prefix: str = "op") -> dict:
    return {
        "device_id": "tablet-rosa",
        "ops": [
            {"op_id": f"{op_prefix}-1", "tipo": "patient.create", "payload": {
                "local_id": "loc-1", "nombre": "Karla", "apellidos": "Villaseñor Ibarra",
                "fecha_nacimiento": "1995-07-04", "municipio": "Tamazula de Gordiano",
                "telefono": "+523411234567", "telefono_propio": True, "canal_aviso": "telegram"}},
            {"op_id": f"{op_prefix}-2", "tipo": "contact.create", "payload": {
                "local_id": "loc-1", "nombre": "Laura Ibarra", "parentesco": "hermana",
                "telefono": "+523417654321", "consentimiento": True}},
            {"op_id": f"{op_prefix}-3", "tipo": "visit.create", "payload": {
                "local_id": "loc-1", "jornada_id": JORNADA["id"], "local_visit_id": "lv-1"}},
            {"op_id": f"{op_prefix}-4", "tipo": "study.create", "payload": {
                "local_id": "loc-1", "local_visit_id": "lv-1", "tipo": "papanicolaou", "fecha": "2026-11-21"}},
        ],
    }


def _counts() -> tuple[int, int, int, int]:
    with store.session() as s:
        return tuple(len(s.exec(select(t)).all()) for t in (Patient, TrustedContact, Visit, Study))


def test_snapshot_returns_tamazula_patients_only() -> None:
    r = client.get(SNAPSHOT)
    assert r.status_code == 200
    body = r.json()
    assert body["jornada"]["municipio"] == "Tamazula de Gordiano"
    with store.session() as s:
        expected = {p.id for p in s.exec(select(Patient).where(Patient.municipio == JORNADA["municipio"])).all()}
        total = len(s.exec(select(Patient)).all())
    ids = {p["id"] for p in body["patients"]}
    assert ids == expected and 0 < len(ids) < total
    assert "pat-maria" in ids
    maria = next(p for p in body["patients"] if p["id"] == "pat-maria")
    assert maria["folio"] == "EIRA-7K3P"
    assert any(e["tipo"] == "ultrasonido" and e["fecha"].startswith("2025-03") for e in maria["estudios"])
    assert all("qr_token" not in p for p in body["patients"]), "minimal data: the token never leaves the server"
    assert client.get("/api/jornadas/no-existe/snapshot").status_code == 404
    assert client.get(SNAPSHOT, headers={"X-Demo-Role": "paciente"}).status_code == 403
    assert TestClient(app).post("/api/sync", json=_new_patient_batch()).status_code == 403
    assert TestClient(app).get("/api/patients/pat-maria/credential.png").status_code == 403


def test_sync_is_idempotent_by_op_id() -> None:
    before = _counts()
    first = client.post("/api/sync", json=_new_patient_batch()).json()
    assert first["applied"] == ["op-1", "op-2", "op-3", "op-4"]
    assert first["duplicates"] == [] and first["conflicts"] == []
    assert len(first["created_patients"]) == 1 and first["created_patients"][0]["local_id"] == "loc-1"
    after_first = _counts()
    assert after_first == tuple(n + 1 for n in before)

    again = client.post("/api/sync", json=_new_patient_batch()).json()
    assert again["applied"] == []
    assert again["duplicates"] == ["op-1", "op-2", "op-3", "op-4"]
    assert again["created_patients"] == first["created_patients"], "a retried create returns the same folio"
    assert _counts() == after_first

    new_id = first["created_patients"][0]["id"]
    with store.session() as s:
        study = s.exec(select(Study).where(Study.patient_id == new_id)).one()
        visit = s.get(Visit, study.visit_id)
        assert visit is not None and visit.jornada_id == JORNADA["id"] and visit.device_id == "tablet-rosa"
        assert len(s.exec(select(SyncOp)).all()) == 4

    later = client.post("/api/sync", json={"device_id": "tablet-rosa", "ops": [
        {"op_id": "op-5", "tipo": "contact.create", "payload": {
            "local_id": "loc-1", "nombre": "Otra", "parentesco": "hija", "telefono": "+523410000000", "consentimiento": True}},
    ]}).json()
    assert later["applied"] == ["op-5"], "a local_id from an earlier batch still resolves"


def test_stale_base_version_reports_conflict() -> None:
    stale = client.post("/api/sync", json={"device_id": "tablet-b", "ops": [
        {"op_id": "upd-1", "tipo": "patient.update", "base_version": 0,
         "payload": {"patient_id": "pat-maria", "telefono": "+520000000000"}},
    ]}).json()
    assert stale["applied"] == []
    assert len(stale["conflicts"]) == 1
    c = stale["conflicts"][0]
    assert c["op_id"] == "upd-1" and c["server_version"] == 1 and c["reason"]
    with store.session() as s:
        maria = s.get(Patient, "pat-maria")
        assert maria.telefono != "+520000000000" and maria.version == 1

    missing = client.post("/api/sync", json={"device_id": "tablet-b", "ops": [
        {"op_id": "upd-2", "tipo": "patient.update", "payload": {"patient_id": "pat-maria", "telefono": "+520000000000"}},
    ]}).json()
    assert [x["op_id"] for x in missing["conflicts"]] == ["upd-2"]

    ok = client.post("/api/sync", json={"device_id": "tablet-b", "ops": [
        {"op_id": "upd-3", "tipo": "patient.update", "base_version": 1,
         "payload": {"patient_id": "pat-maria", "telefono": "+523419999999", "folio": "EIRA-HACK"}},
    ]}).json()
    assert ok["applied"] == ["upd-3"] and ok["conflicts"] == []
    with store.session() as s:
        maria = s.get(Patient, "pat-maria")
        assert maria.telefono == "+523419999999" and maria.version == 2
        assert maria.folio == "EIRA-7K3P", "folio and qr_token are server-owned"


def test_new_patient_gets_folio_and_opaque_qr_token() -> None:
    created = client.post("/api/sync", json=_new_patient_batch("np")).json()["created_patients"][0]
    assert re.fullmatch(r"EIRA-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}", created["folio"])
    with store.session() as s:
        p = s.get(Patient, created["id"])
        assert p.folio == created["folio"] and p.qr_token == created["qr_token"] and not p.qr_revocado
        folios = [x.folio for x in s.exec(select(Patient)).all()]
        assert len(folios) == len(set(folios))
        token = p.qr_token.lower()
        assert len(token) >= 20
        for piece in [*_plain(p.nombre).split(), *_plain(p.apellidos).split(), p.folio[5:].lower(), p.fecha_nacimiento[:4], "7234567"]:
            assert piece not in token, piece

        entries = s.exec(select(AuditLog).order_by(AuditLog.id)).all()
        assert {e.accion for e in entries} >= {"patient.create", "contact.create", "visit.create", "study.create"}
        assert any(e.entidad_id == p.id for e in entries)
        assert verify_chain([e.model_dump() for e in entries]) == (True, None)

    png = client.get(f"/api/patients/{created['id']}/credential.png")
    assert png.status_code == 200 and png.headers["content-type"] == "image/png"
    assert png.content[:8] == b"\x89PNG\r\n\x1a\n" and len(png.content) > 1000
    assert client.get("/api/patients/no-existe/credential.png").status_code == 404


def test_sync_rejects_invalid_payloads_and_other_devices_local_ids() -> None:
    client.post("/api/sync", json=_new_patient_batch())
    other = client.post("/api/sync", json={"device_id": "tablet-otra", "ops": [
        {"op_id": "x-1", "tipo": "contact.create", "payload": {
            "local_id": "loc-1", "nombre": "Ajena", "parentesco": "hija", "telefono": "+523410000001", "consentimiento": True}},
        {"op_id": "x-2", "tipo": "study.create", "payload": {"patient_id": "pat-maria", "tipo": "pap", "fecha": "2026-11-21"}},
        {"op_id": "x-3", "tipo": "patient.create", "payload": {"local_id": "loc-9", "nombre": "Sin apellidos"}},
    ]}).json()
    assert other["applied"] == [] and [c["op_id"] for c in other["conflicts"]] == ["x-1", "x-2", "x-3"]
    with store.session() as s:
        assert s.exec(select(TrustedContact).where(TrustedContact.nombre == "Ajena")).first() is None
        assert s.exec(select(Study).where(Study.tipo == "pap")).first() is None
    assert client.get(SNAPSHOT).status_code == 200
