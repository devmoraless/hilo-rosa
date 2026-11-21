"""HR-005 · reglas clínicas determinísticas (IDEA.md §6)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.services.rules import (
    TEXTO_NORMAL,
    TEXTO_REPETIR,
    TEXTO_SEGUIMIENTO,
    classify,
    classify_breast,
    classify_pap,
)


def test_nilm_is_normal_with_12_month_reminder():
    r = classify_pap("NILM", "rutina 1 año")
    assert r.clasificacion == "normal"
    assert r.prioridad == "normal"
    assert r.proximo_control_meses == 12
    assert r.explicacion_clara == TEXTO_NORMAL
    assert "llamar" not in r.tareas
    # BIRADS 1-2 con conducta 1 también es normal
    b = classify_breast(2, 1)
    assert b.clasificacion == "normal" and b.proximo_control_meses == 12
    assert b.explicacion_clara == TEXTO_NORMAL
    assert classify("pap", bethesda="nilm").to_dict()["clasificacion"] == "normal"


def test_birads_3_is_six_month_followup():
    r = classify_breast(3, None)
    assert r.clasificacion == "seguimiento"
    assert r.prioridad == "normal"
    assert r.proximo_control_meses == 6
    assert r.explicacion_clara == TEXTO_SEGUIMIENTO
    # conducta 4 (evaluación 6 meses) con BIRADS 2 también
    c4 = classify_breast(2, 4)
    assert c4.clasificacion == "seguimiento" and c4.proximo_control_meses == 6
    assert classify("breast", birads=3).proximo_control_meses == 6


def test_abnormal_bethesda_has_no_automatic_text_and_creates_call_task():
    for bethesda in ["ASC-US", "LSIL", "ASC-H", "HSIL", "AGC"]:
        r = classify_pap(bethesda, None)
        assert r.prioridad == "alta", bethesda
        assert r.clasificacion == "seguimiento"
        assert r.explicacion_clara is None
        assert "llamar" in r.tareas
        assert "referencia_2o_nivel" in r.tareas
        assert r.caso_abierto is True
    # BIRADS 0/4/5 y conducta 2/3 también son prioridad alta sin texto
    for birads, conducta in [(0, None), (4, None), (5, 1), (1, 2), (2, 3)]:
        b = classify_breast(birads, conducta)
        assert b.prioridad == "alta", (birads, conducta)
        assert b.explicacion_clara is None
        assert "llamar" in b.tareas
    # NILM pero con conducta de colposcopía/referencia → alta
    assert classify_pap("NILM", "colposcopía/referencia").prioridad == "alta"


def test_unsatisfactory_sample_asks_to_repeat():
    r = classify_pap("insatisfactoria", None)
    assert r.clasificacion == "repetir"
    assert r.explicacion_clara == TEXTO_REPETIR
    assert r.tareas == ["citar_nueva_muestra"]
    assert "llamar" not in r.tareas
