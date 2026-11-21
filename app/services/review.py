"""Médica review (HR-009): the doctor's capture -> rules (HR-005) -> authorize -> neutral notice or call task.

The patient notice is a fixed sentence: it NEVER carries the diagnosis, the classification or the text.
The result itself is only shown after the patient (or her trusted contact) verifies identity (HR-010).
"""

from __future__ import annotations

import calendar
from datetime import date

from sqlmodel import Session, select

from app.db import FollowUpTask, Patient, Result, now_iso
from app.schemas import AuthorizeRequest, AuthorizeResponse, ResultOut
from app.services import rules
from app.services.notifier import Notifier, get_notifier
from app.services.sync import record_audit

AVISO_LISTO = (
    "Hola, tu resultado de EIRA ya está listo. Abre tu credencial Hilo Rosa "
    "(escanea el QR) para verlo de forma segura."
)
PAP = ("papanicolaou",)


class ReviewError(Exception):
    def __init__(self, status: int, detail: str):
        super().__init__(detail)
        self.status = status
        self.detail = detail


def add_months(d: date, months: int) -> date:
    m = d.month - 1 + months
    y, m = d.year + m // 12, m % 12 + 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def to_out(s: Session, r: Result) -> ResultOut:
    p = s.get(Patient, r.patient_id) if r.patient_id else None
    return ResultOut(
        **r.model_dump(include=set(ResultOut.model_fields) - {"paciente_nombre"}),
        paciente_nombre=f"{p.nombre} {p.apellidos}" if p else None,
    )


def list_results(s: Session, estado: str | None = None) -> list[ResultOut]:
    q = select(Result).where(Result.estado == estado) if estado else select(Result).where(Result.estado != "pendiente_asociar")
    rows = s.exec(q.order_by(Result.created_at)).all()
    return [to_out(s, r) for r in rows]


def classify_capture(tipo_estudio: str, bethesda: str | None, birads: int | None, conducta: str | None) -> rules.Clasificacion:
    if tipo_estudio in PAP:
        if not bethesda:
            raise ReviewError(422, "Falta el resultado Bethesda")
        return rules.classify(tipo_estudio, bethesda=bethesda, conducta=conducta)
    if birads is None:
        raise ReviewError(422, "Falta BIRADS (campo 22)")
    return rules.classify(tipo_estudio, birads=birads, conducta=conducta)


def authorize(s: Session, result_id: str, req: AuthorizeRequest, notifier: Notifier | None = None) -> AuthorizeResponse:
    nombre, cedula = req.nombre.strip(), req.cedula.strip()
    if not nombre or not cedula:
        raise ReviewError(422, "Nombre y cédula profesional son obligatorios (campo 21)")
    r = s.get(Result, result_id)
    if r is None:
        raise ReviewError(404, "Resultado no encontrado")
    if r.estado != "por_revisar":
        raise ReviewError(409, f"El resultado ya está en estado {r.estado}")
    if not r.patient_id:
        raise ReviewError(409, "El resultado no está asociado a una paciente")
    c = classify_capture(r.tipo_estudio, req.bethesda, req.birads, req.conducta)

    today = date.today()
    r.bethesda, r.birads, r.conducta, r.notas = req.bethesda, req.birads, req.conducta, req.notas
    r.clasificacion, r.prioridad = c.clasificacion, c.prioridad
    r.proximo_control = add_months(today, c.proximo_control_meses).isoformat() if c.proximo_control_meses else None
    alta = c.prioridad == "alta" or c.caso_abierto
    edited = (req.explicacion_clara or "").strip()
    r.explicacion_clara = None if alta else (edited or c.explicacion_clara)
    r.autorizado_por_nombre, r.autorizado_por_cedula, r.autorizado_at = nombre, cedula, now_iso()
    r.estado = "autorizado"
    s.add(r)
    record_audit(s, nombre, "medica", "resultado.autorizado", r.id)

    tareas = [t for t in c.tareas if t != "aviso"]
    for t in tareas:
        tipo = "recordatorio" if t.startswith("recordatorio") else t
        objetivo = r.proximo_control if tipo == "recordatorio" else today.isoformat()
        s.add(FollowUpTask(patient_id=r.patient_id, result_id=r.id, tipo=tipo, fecha_objetivo=objetivo))

    note = None
    if alta:
        record_audit(s, nombre, "medica", "tarea.llamar", r.id)
    else:
        patient = s.get(Patient, r.patient_id)
        note = (notifier or get_notifier()).send(patient.telefono or "", AVISO_LISTO)
        r.estado, r.notificado_at = "notificado", now_iso()
        s.add(r)
        record_audit(s, "sistema", "notifier", "resultado.notificado", r.id)
    s.commit()
    s.refresh(r)
    return AuthorizeResponse(result=to_out(s, r), notification=note, tareas=tareas)


def open_tasks(s: Session, tipo: str | None = None) -> list[dict]:
    q = select(FollowUpTask).where(FollowUpTask.estado == "abierta")
    if tipo:
        q = q.where(FollowUpTask.tipo == tipo)
    out = []
    for t in s.exec(q.order_by(FollowUpTask.created_at)).all():
        p = s.get(Patient, t.patient_id)
        out.append({
            "id": t.id, "tipo": t.tipo, "result_id": t.result_id, "patient_id": t.patient_id,
            "paciente_nombre": f"{p.nombre} {p.apellidos}" if p else None,
            "folio": p.folio if p else None, "fecha_objetivo": t.fecha_objetivo,
        })
    return out
