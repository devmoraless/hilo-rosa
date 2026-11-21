"""Laboratorio results (HR-008): PDF upload, exact-folio association and the manual tray.

A PDF whose text carries an exact folio (EIRA-XXXX of a registered patient) is linked to that patient's
study and goes to `por_revisar`. Anything else waits in `pendiente_asociar` with a suggestion built from
the "Paciente:" line, the jornada's municipio and the studies on file. The laboratorio role only ever
sees folio + estado: never a patient id, a name or a suggestion.
"""

import io
import re
import unicodedata
from datetime import date

from pypdf import PdfReader
from pypdf.errors import PdfReadError
from sqlmodel import Session, select

from app.config import settings
from app.db import Patient, Result, Study, new_id
from app.schemas import ResultOut
from app.services.sync import record_audit

FOLIO_RE = re.compile(r"\bEIRA-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}\b")
MAX_PDF_BYTES = 10 * 1024 * 1024
STUDY_WORDS = (("papanicolaou", "papanicolaou"), ("mastograf", "mastografia"), ("ultrasonido", "ultrasonido"))


class ResultError(Exception):
    def __init__(self, status: int, detail: str):
        super().__init__(detail)
        self.status = status
        self.detail = detail


def _plain(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn").lower()


def _pdf_text(data: bytes) -> str:
    try:
        return "\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(data)).pages)
    except (PdfReadError, ValueError, OSError):
        return ""


def _line(text: str, label: str) -> str:
    for line in text.splitlines():
        if _plain(line).startswith(_plain(label)):
            return line.split(":", 1)[1].strip() if ":" in line else ""
    return ""


def _study_type(text: str) -> str:
    plain = _plain(text)
    return next((tipo for word, tipo in STUDY_WORDS if word in plain), "papanicolaou")


def _fecha_toma(text: str) -> str:
    m = re.search(r"(\d{2})/(\d{2})/(\d{4})", _line(text, "Fecha de toma"))
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else date.today().isoformat()


def _suggest(s: Session, text: str, tipo: str) -> Patient | None:
    words = [w for w in re.findall(r"[a-zñ]+", _plain(_line(text, "Paciente"))) if len(w) > 2 and w not in {"nombre", "incompleto"}]
    if not words:
        return None
    jornada = _plain(_line(text, "Fecha de toma"))
    with_study = {p for p in s.exec(select(Study.patient_id).where(Study.tipo == tipo))}
    ranked: list[tuple[int, str, Patient]] = []
    for p in s.exec(select(Patient)):
        name = _plain(f"{p.nombre} {p.apellidos}").split()
        hits = sum(w in name for w in words)
        if hits:
            score = hits * 4 + (2 if _plain(p.municipio) in jornada else 0) + (1 if p.id in with_study else 0)
            ranked.append((-score, p.folio, p))
    return min(ranked, key=lambda r: (r[0], r[1]))[2] if ranked else None


def _study_for(s: Session, patient: Patient, tipo: str, fecha: str) -> Study:
    studies = list(s.exec(select(Study).where(Study.patient_id == patient.id, Study.tipo == tipo)))
    same_day = [st for st in studies if st.fecha == fecha]
    if same_day:
        return same_day[0]
    study = Study(patient_id=patient.id, tipo=tipo, fecha=fecha)
    s.add(study)
    s.flush()
    return study


def _link(s: Session, result: Result, patient: Patient, fecha: str) -> None:
    study = _study_for(s, patient, result.tipo_estudio, fecha)
    result.patient_id = patient.id
    result.study_id = study.id
    result.sugerencia_patient_id = None
    result.estado = "por_revisar"


def to_out(s: Session, r: Result, role: str) -> ResultOut:
    patient = s.get(Patient, r.patient_id) if r.patient_id else None
    out = ResultOut.model_validate(r, from_attributes=True)
    out.folio_detectado = r.folio_detectado or (patient.folio if patient else None)
    if role == "laboratorio":
        out.patient_id = out.paciente_nombre = out.sugerencia_patient_id = out.sugerencia_nombre = None
        return out
    out.paciente_nombre = f"{patient.nombre} {patient.apellidos}" if patient else None
    suggestion = s.get(Patient, r.sugerencia_patient_id) if r.sugerencia_patient_id else None
    out.sugerencia_nombre = f"{suggestion.nombre} {suggestion.apellidos} · {suggestion.folio}" if suggestion else None
    return out


def upload(s: Session, files: list[tuple[str, bytes]], role: str) -> list[ResultOut]:
    if not files:
        raise ResultError(422, "sube al menos un PDF")
    for name, data in files:
        if not data.startswith(b"%PDF"):
            raise ResultError(422, f"{name} no es un PDF")
        if len(data) > MAX_PDF_BYTES:
            raise ResultError(413, f"{name} pesa más de 10 MB")
    folder = settings.hilo_data_dir / "results"
    folder.mkdir(parents=True, exist_ok=True)
    rows: list[Result] = []
    for name, data in files:
        text = _pdf_text(data)
        rid = new_id()
        path = folder / f"{rid}.pdf"
        path.write_bytes(data)
        result = Result(id=rid, pdf_path=str(path), pdf_nombre=name, tipo_estudio=_study_type(text))
        folios = FOLIO_RE.findall(text)
        patient = s.exec(select(Patient).where(Patient.folio == folios[0])).first() if folios else None
        if patient:
            result.folio_detectado = patient.folio
            _link(s, result, patient, _fecha_toma(text))
        else:
            suggestion = _suggest(s, text, result.tipo_estudio)
            result.sugerencia_patient_id = suggestion.id if suggestion else None
        s.add(result)
        s.flush()
        record_audit(s, role, role, f"result.upload:{result.estado}", rid)
        rows.append(result)
    s.commit()
    return [to_out(s, r, role) for r in rows]


def associate(s: Session, result_id: str, patient_ref: str, role: str) -> ResultOut:
    """`patient_ref` is the patient's id or the folio read off the sample label (case-insensitive)."""
    result = s.get(Result, result_id)
    if result is None:
        raise ResultError(404, "resultado no encontrado")
    if result.estado != "pendiente_asociar":
        raise ResultError(409, "este resultado ya está asociado")
    ref = patient_ref.strip()
    patient = s.get(Patient, ref) or s.exec(select(Patient).where(Patient.folio == ref.upper())).first()
    if patient is None:
        raise ResultError(404, "no hay una paciente con ese folio")
    _link(s, result, patient, _fecha_toma(_pdf_text(_read(result))))
    s.add(result)
    record_audit(s, role, role, "result.associate", result.id)
    s.commit()
    return to_out(s, result, role)


def _read(result: Result) -> bytes:
    try:
        with open(result.pdf_path, "rb") as fh:
            return fh.read()
    except OSError:
        return b""


def list_results(s: Session, role: str, estado: str | None = None) -> list[ResultOut]:
    query = select(Result).order_by(Result.created_at, Result.pdf_nombre)
    if estado:
        query = query.where(Result.estado == estado)
    return [to_out(s, r, role) for r in s.exec(query)]


def pdf_bytes(s: Session, result_id: str) -> tuple[str, bytes]:
    result = s.get(Result, result_id)
    data = _read(result) if result else b""
    if not data:
        raise ResultError(404, "PDF no encontrado")
    return result.pdf_nombre or f"{result.id}.pdf", data
