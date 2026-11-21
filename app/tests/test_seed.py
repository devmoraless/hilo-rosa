from fastapi.testclient import TestClient
from sqlmodel import select

from app.db import Jornada, Patient, Result, Study
from app.fixtures.seed_data import MATCH_CASES, NON_MATCH_CASES
from app.main import app
from app.schemas import RESULT_STATES, ResultOut
from app.services import store


def test_health_returns_ok() -> None:
    assert TestClient(app).get("/api/health").json() == {"status": "ok"}


def test_reset_demo_loads_maria_and_tamazula_jornada() -> None:
    client = TestClient(app)
    body = client.post("/api/demo/reset").json()
    assert body["ok"] is True
    with store.session() as s:
        maria = s.exec(select(Patient).where(Patient.apellidos == "López Hernández", Patient.nombre == "María")).one()
        assert maria.fecha_nacimiento.startswith("2026")
        assert maria.municipio == "Tamazula de Gordiano"
        assert maria.folio == "EIRA-7K3P"
        assert "-" not in maria.qr_token and maria.nombre not in maria.qr_token
        jornada = s.get(Jornada, "jor-tamazula-2026-11")
        assert jornada is not None and jornada.municipio == "Tamazula de Gordiano"
        prev = s.exec(select(Study).where(Study.patient_id == maria.id, Study.tipo == "ultrasonido")).all()
        assert len(prev) == 1 and prev[0].fecha.startswith("2025-03")
        # reset is idempotent: a second call leaves the same counts
        n = len(s.exec(select(Patient)).all())
    client.post("/api/demo/reset")
    with store.session() as s:
        assert len(s.exec(select(Patient)).all()) == n
        assert s.exec(select(Result)).all() == []


def test_seed_contains_40_patients_and_10_non_matches() -> None:
    assert len(MATCH_CASES) == 40
    assert len(NON_MATCH_CASES) == 10
    TestClient(app).post("/api/demo/reset")
    with store.session() as s:
        ids = {p.id for p in s.exec(select(Patient)).all()}
    assert all(case["expected_patient_id"] in ids for case in MATCH_CASES)
    assert all(case["expected_patient_id"] is None for case in NON_MATCH_CASES)


def test_schemas_roundtrip_result_states() -> None:
    assert RESULT_STATES == ("pendiente_asociar", "por_revisar", "autorizado", "notificado", "visto")
    for estado in RESULT_STATES:
        out = ResultOut(id="r1", estado=estado, tipo_estudio="papanicolaou")
        assert ResultOut.model_validate_json(out.model_dump_json()) == out


def test_qr_tokens_carry_no_personal_data() -> None:
    import unicodedata

    def plain(text: str) -> str:
        return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn").lower()

    with store.session() as s:
        for p in s.exec(select(Patient)).all():
            token = p.qr_token.lower()
            assert len(token) >= 20
            for piece in [*plain(p.nombre).split(), *plain(p.apellidos).split(), p.folio.split("-")[1].lower(), p.fecha_nacimiento[:4]]:
                assert piece not in token, (p.id, piece)
