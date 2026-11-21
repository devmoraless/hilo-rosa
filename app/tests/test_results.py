"""HR-008 · Laboratorio: PDF upload, folio association and the lab's minimal view."""

from pathlib import Path

from fastapi.testclient import TestClient
from sqlmodel import select

from app.db import AuditLog, Result, Study
from app.main import app
from app.services.store import session

PDFS = Path(__file__).resolve().parents[1] / "fixtures" / "pdfs"
CON_FOLIO = "resultado_EIRA-7K3P.pdf"
SIN_FOLIO = "resultado_sin_folio.pdf"

lab = TestClient(app, headers={"X-Demo-Role": "laboratorio"})
medica = TestClient(app, headers={"X-Demo-Role": "medica"})


def _upload(client: TestClient, *names: str):
    files = [("files", (n, (PDFS / n).read_bytes(), "application/pdf")) for n in names]
    return client.post("/api/results/upload", files=files)


def test_pdf_with_folio_is_associated_automatically():
    r = _upload(lab, CON_FOLIO)
    assert r.status_code == 200
    [out] = r.json()["results"]
    assert out["estado"] == "por_revisar"
    assert out["folio_detectado"] == "EIRA-7K3P"
    assert out["pdf_nombre"] == CON_FOLIO
    with session() as s:
        row = s.get(Result, out["id"])
        assert row.patient_id == "pat-maria"
        study = s.get(Study, row.study_id)
        assert study.patient_id == "pat-maria" and study.tipo == "papanicolaou"
        assert s.exec(select(AuditLog).where(AuditLog.entidad_id == out["id"])).first() is not None
    pdf = lab.get(f"/api/results/{out['id']}/pdf")
    assert pdf.status_code == 200 and pdf.content == (PDFS / CON_FOLIO).read_bytes()


def test_pdf_without_folio_goes_to_unassociated_tray():
    r = _upload(lab, CON_FOLIO, SIN_FOLIO)
    assert r.status_code == 200
    by_name = {o["pdf_nombre"]: o for o in r.json()["results"]}
    sin = by_name[SIN_FOLIO]
    assert sin["estado"] == "pendiente_asociar"
    assert sin["folio_detectado"] is None
    assert by_name[CON_FOLIO]["estado"] == "por_revisar"
    tray = medica.get("/api/results", params={"estado": "pendiente_asociar"}).json()
    assert [t["id"] for t in tray] == [sin["id"]]
    # "Paciente: Guadalupe ..." in Tamazula with a Pap on file: Guadalupe Ortiz Sánchez (EIRA-JN4W).
    assert tray[0]["sugerencia_patient_id"] == "pat-001"
    assert tray[0]["sugerencia_nombre"].startswith("Guadalupe Ortiz")


def test_manual_association_moves_result_to_review():
    [sin] = _upload(lab, SIN_FOLIO).json()["results"]
    by_folio = lab.post(f"/api/results/{sin['id']}/associate", json={"patient_id": "eira-jn4w"})
    assert by_folio.status_code == 200
    assert by_folio.json()["estado"] == "por_revisar"
    assert by_folio.json()["folio_detectado"] == "EIRA-JN4W"
    with session() as s:
        row = s.get(Result, sin["id"])
        assert row.patient_id == "pat-001" and row.study_id is not None
    again = lab.post(f"/api/results/{sin['id']}/associate", json={"patient_id": "pat-021"})
    assert again.status_code == 409
    [otro] = _upload(lab, SIN_FOLIO).json()["results"]
    assert medica.post(f"/api/results/{otro['id']}/associate", json={"patient_id": "EIRA-ZZZZ"}).status_code == 404
    ok = medica.post(f"/api/results/{otro['id']}/associate", json={"patient_id": "pat-021"})
    assert ok.json()["estado"] == "por_revisar" and ok.json()["paciente_nombre"].startswith("Guadalupe Ramírez")


def test_lab_role_cannot_see_patient_record():
    r = _upload(lab, CON_FOLIO, SIN_FOLIO)
    listed = lab.get("/api/results").json()
    for out in r.json()["results"] + listed:
        assert out["patient_id"] is None
        assert out["paciente_nombre"] is None
        assert out["sugerencia_patient_id"] is None
        assert out["sugerencia_nombre"] is None
    body = r.text + lab.get("/api/results").text
    for secreto in ("María", "López", "Guadalupe", "1974-05-12", "+52341", "pat-"):
        assert secreto not in body
    assert medica.get("/api/results").json()[0]["paciente_nombre"] is not None
    for role in (None, "capturista", "paciente"):
        client = TestClient(app, headers={"X-Demo-Role": role} if role else {})
        assert _upload(client, CON_FOLIO).status_code == 403
        assert client.get("/api/results").status_code == 403
    not_pdf = lab.post("/api/results/upload", files=[("files", ("nota.txt", b"hola", "text/plain"))])
    assert not_pdf.status_code == 422
