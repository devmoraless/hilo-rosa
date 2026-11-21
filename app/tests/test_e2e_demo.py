"""The demo of IDEA.md §4, steps 1-6, end to end through the public API on the fictitious seed.

Step 1 (matching) runs in the browser (web/src/lib/match.ts, tested with node --test); here the
capturista confirms "Es ella" and queues the ops offline, exactly as the jornada screen sends them.
"""

from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

PDFS = Path(__file__).resolve().parent.parent / "fixtures" / "pdfs"
CAPTURISTA = {"X-Demo-Role": "capturista"}
LAB = {"X-Demo-Role": "laboratorio"}
MEDICA = {"X-Demo-Role": "medica"}
DIAGNOSIS_WORDS = ("NILM", "normal", "Bethesda", "negativo", "lesión", "HSIL", "cáncer")


def test_full_demo_flow_from_offline_registration_to_family_access() -> None:
    c = TestClient(app)
    assert c.post("/api/demo/reset").json()["ok"] is True

    # 1. Offline snapshot of the Tamazula jornada contains María (matching happens on the device).
    snap = c.get("/api/jornadas/jor-tamazula-2026-11/snapshot", headers=CAPTURISTA).json()
    maria = next(p for p in snap["patients"] if p["folio"] == "EIRA-7K3P")
    assert maria["nombre"] == "María" and "qr_token" not in maria

    # 2. "Es ella" -> trusted contact + visit + Pap queued offline, then synced (twice: idempotent).
    ops = [
        {"op_id": "op-1", "tipo": "contact.create", "payload": {"patient_id": maria["id"], "nombre": "Laura Martínez López", "parentesco": "hija", "telefono": "+523411000001", "consentimiento": True}},
        {"op_id": "op-2", "tipo": "visit.create", "payload": {"patient_id": maria["id"], "jornada_id": "jor-tamazula-2026-11", "local_visit_id": "v-1"}},
        {"op_id": "op-3", "tipo": "study.create", "payload": {"patient_id": maria["id"], "local_visit_id": "v-1", "tipo": "papanicolaou", "fecha": "2026-11-21"}},
    ]
    first = c.post("/api/sync", json={"device_id": "tablet-1", "ops": ops}, headers=CAPTURISTA).json()
    assert first["applied"] == ["op-1", "op-2", "op-3"] and first["conflicts"] == []
    again = c.post("/api/sync", json={"device_id": "tablet-1", "ops": ops}, headers=CAPTURISTA).json()
    assert again["applied"] == [] and sorted(again["duplicates"]) == ["op-1", "op-2", "op-3"]
    card = c.get(f"/api/patients/{maria['id']}/credential.png", headers=CAPTURISTA)
    assert card.status_code == 200 and card.headers["content-type"] == "image/png"

    # 3. The lab uploads 2 PDFs: one associates by folio, the other goes to the unassociated tray.
    files = [("files", (p.name, p.read_bytes(), "application/pdf")) for p in sorted(PDFS.glob("*.pdf"))]
    uploaded = c.post("/api/results/upload", files=files, headers=LAB).json()["results"]
    by_folio = {r["folio_detectado"]: r for r in uploaded}
    result = by_folio["EIRA-7K3P"]
    assert result["estado"] == "por_revisar"
    assert any(r["estado"] == "pendiente_asociar" for r in uploaded)
    assert result.get("paciente_nombre") is None  # the lab never sees the record

    # 4. The doctor authorizes NILM with her cédula; the notice carries no diagnosis.
    auth = c.post(
        f"/api/results/{result['id']}/authorize",
        json={"bethesda": "NILM", "conducta": "rutina 1 año", "nombre": "Dra. Ana Ruiz", "cedula": "12345678"},
        headers=MEDICA,
    ).json()
    assert auth["result"]["estado"] == "notificado" and auth["result"]["clasificacion"] == "normal"
    mensaje = auth["notification"]["mensaje"]
    assert not any(w.lower() in mensaje.lower() for w in DIAGNOSIS_WORDS)

    # 5. Laura scans the credential -> birthdate -> 6-digit code (simulated SMS without Telegram).
    token = "Xb7nQ2vRk9TzWm4pHs8dLc"  # María's QR token in the seed (opaque, no personal data)
    who = c.get(f"/api/access/token/{token}").json()
    laura = next(k for k in who["contactos"] if k["parentesco"] == "hija")
    start = c.post("/api/access/start", json={"token": token, "quien": "contacto", "contacto_id": laura["id"], "fecha_nacimiento": "2026-06-02"}).json()
    assert start["codigo_demo"] and len(start["codigo_demo"]) == 6
    session = c.post("/api/access/verify", json={"challenge_id": start["challenge_id"], "codigo": start["codigo_demo"]}).json()
    bearer = {"Authorization": f"Bearer {session['session_token']}"}

    # 6. She sees the plain-language result and the PDF; the audit log records it with integrity.
    mine = c.get("/api/access/me/results", headers=bearer).json()
    assert len(mine) == 1 and mine[0]["clasificacion"] == "normal"
    assert "un año" in mine[0]["explicacion_clara"]
    pdf = c.get(mine[0]["pdf_url"], headers=bearer)
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")
    audit = c.get("/api/audit", headers=MEDICA).json()
    assert audit["integridad_ok"] is True
    assert any("visto" in e["accion"] for e in audit["entries"])
