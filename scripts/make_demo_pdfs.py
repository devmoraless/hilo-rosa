"""Generate the 2 fictitious lab result PDFs for the demo (IDEA.md §4 step 3).

- resultado_EIRA-7K3P.pdf: Pap result of María López Hernández; the folio is in the text,
  so the lab upload associates it automatically.
- resultado_sin_folio.pdf: a result whose folio is not legible; it goes to the "sin asociar"
  tray with a suggestion.

Run: uv run python scripts/make_demo_pdfs.py
"""

from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

OUT = Path(__file__).resolve().parent.parent / "app" / "fixtures" / "pdfs"


def write(name: str, lines: list[str]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT / name), pagesize=letter)
    c.setTitle("Resultado de citología (DATOS FICTICIOS)")
    y = 740
    c.setFont("Helvetica-Bold", 14)
    c.drawString(60, y, "Laboratorio Aliado de Citología (FICTICIO)")
    c.setFont("Helvetica", 11)
    for line in lines:
        y -= 22
        c.drawString(60, y, line)
    c.setFont("Helvetica-Oblique", 9)
    c.drawString(60, 60, "Documento generado para la demo de Hilo Rosa. Datos ficticios, sin valor clínico.")
    c.save()


write(
    "resultado_EIRA-7K3P.pdf",
    [
        "Folio de paciente: EIRA-7K3P",
        "Paciente: María López Hernández",
        "Estudio: Citología cervicovaginal (Papanicolaou)",
        "Fecha de toma: 21/11/2026 · Jornada Tamazula de Gordiano",
        "Calidad de la muestra: satisfactoria",
        "Interpretación (Bethesda): Negativo para lesión intraepitelial o malignidad (NILM)",
        "Sugerencia: control de rutina en 1 año",
    ],
)
write(
    "resultado_sin_folio.pdf",
    [
        "Folio de paciente: [ilegible]",
        "Paciente: Guadalupe ... (nombre incompleto)",
        "Estudio: Citología cervicovaginal (Papanicolaou)",
        "Fecha de toma: 21/11/2026 · Jornada Tamazula de Gordiano",
        "Calidad de la muestra: satisfactoria",
        "Interpretación (Bethesda): ver reporte anexo",
    ],
)
print(f"PDFs escritos en {OUT}")
