"""Reglas clínicas determinísticas (IDEA.md §6).

Funciones puras: sin red, sin LLM. El texto claro sale solo de plantillas fijas.
Prioridad alta → sin texto automático: EIRA llama antes de mostrar el resultado.
"""
from __future__ import annotations

import unicodedata
from dataclasses import asdict, dataclass, field

TEXTO_NORMAL = (
    "Tu resultado salió normal / con hallazgos benignos. No es cáncer. Regresa en un año."
)
TEXTO_SEGUIMIENTO = "Necesitamos revisarte otra vez en 6 meses. Es una medida de cuidado."
TEXTO_REPETIR = "Tu muestra no se pudo leer. Hay que tomarla otra vez, no es por algo malo."

BETHESDA_VALORES = ("NILM", "ASC-US", "LSIL", "ASC-H", "HSIL", "AGC", "INSATISFACTORIA")

# Conducta mama (campo 23): 1 rutina 1 año · 2 mastografía de tamizaje ·
# 3 imagen complementaria · 4 evaluación 6 meses
CONDUCTA_MAMA_RUTINA = 1
CONDUCTA_MAMA_ALTA = (2, 3)
CONDUCTA_MAMA_SEIS_MESES = 4
BIRADS_ALTA = (0, 4, 5)


@dataclass(frozen=True)
class Clasificacion:
    clasificacion: str  # normal | seguimiento | repetir
    prioridad: str  # normal | alta
    proximo_control_meses: int | None
    tareas: list[str] = field(default_factory=list)
    explicacion_clara: str | None = None
    caso_abierto: bool = False

    def to_dict(self) -> dict:
        return asdict(self)


def _norm(texto: object) -> str:
    s = unicodedata.normalize("NFKD", str(texto or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.strip().upper().replace("_", "-").replace(" ", "-")


def _normal() -> Clasificacion:
    return Clasificacion("normal", "normal", 12, ["recordatorio_12_meses"], TEXTO_NORMAL)


def _seis_meses() -> Clasificacion:
    return Clasificacion(
        "seguimiento", "normal", 6, ["recordatorio_6_meses", "aviso"], TEXTO_SEGUIMIENTO
    )


def _alta() -> Clasificacion:
    return Clasificacion(
        "seguimiento", "alta", None, ["llamar", "referencia_2o_nivel"], None, caso_abierto=True
    )


def _repetir() -> Clasificacion:
    return Clasificacion("repetir", "normal", None, ["citar_nueva_muestra"], TEXTO_REPETIR)


def _conducta_pap(conducta: object) -> str:
    """rutina | repetir | referencia | '' (sin conducta)."""
    c = _norm(conducta)
    if not c:
        return ""
    if c in ("1",) or "RUTINA" in c:
        return "rutina"
    if c in ("2",) or "REPETIR" in c:
        return "repetir"
    if c in ("3",) or "COLPO" in c or "REFERENCIA" in c:
        return "referencia"
    return "referencia"  # conducta desconocida: no se cierra sin que alguien la vea


def classify_pap(bethesda: str, conducta: str | int | None = None) -> Clasificacion:
    b = _norm(bethesda)
    if b.startswith("INSATISF"):
        return _repetir()
    if b != "NILM":
        return _alta()
    c = _conducta_pap(conducta)
    if c == "referencia":
        return _alta()
    if c == "repetir":
        return _repetir()
    return _normal()


def classify_breast(birads: int | str, conducta: int | str | None = None) -> Clasificacion:
    try:
        b = int(birads)
    except (TypeError, ValueError):
        return _alta()
    try:
        c = int(conducta) if conducta not in (None, "") else None
    except (TypeError, ValueError):
        c = None
    if b in BIRADS_ALTA or c in CONDUCTA_MAMA_ALTA or not 0 <= b <= 5:
        return _alta()
    if b == 3 or c == CONDUCTA_MAMA_SEIS_MESES:
        return _seis_meses()
    return _normal()


def classify(
    tipo_estudio: str,
    *,
    bethesda: str | None = None,
    birads: int | str | None = None,
    conducta: str | int | None = None,
) -> Clasificacion:
    t = _norm(tipo_estudio)
    if t in ("PAP", "PAPANICOLAOU", "CITOLOGIA"):
        return classify_pap(bethesda, conducta)
    if t in ("BREAST", "MAMA", "ULTRASONIDO", "MASTOGRAFIA"):
        return classify_breast(birads, conducta)
    raise ValueError(f"tipo_estudio desconocido: {tipo_estudio!r}")
