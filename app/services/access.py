from datetime import UTC, datetime
from io import BytesIO
from xml.sax.saxutils import escape

from fastapi import HTTPException
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from sqlmodel import Session, select

from app.config import settings
from app.db import Patient, Result, Study, TrustedContact, now_iso
from app.schemas import AccessStartRequest, PatientResultView
from app.services.notifier import LogNotifier, get_notifier
from app.services.otp import OTPStore
from app.services.sync import record_audit

otp = OTPStore(valkey_url=settings.valkey_url)


def mask(phone: str) -> str:
    return "•••• " + phone[-4:]


def patient_for(s: Session, token: str) -> Patient:
    patient = s.exec(select(Patient).where(Patient.qr_token == token)).first()
    if patient is None:
        raise HTTPException(404, "No encontramos esta credencial. Revisa el enlace.")
    if patient.qr_revocado:
        raise HTTPException(410, "Esta credencial fue revocada. Pide una nueva a EIRA.")
    return patient


def check_viewer(s: Session, entry: dict):
    patient = patient_for(s, entry["token"])
    if patient.id != entry["patient_id"]:
        raise HTTPException(403, "Credencial inválida.")
    if entry["viewer_rol"] == "contacto":
        contact = s.get(TrustedContact, entry["contacto_id"])
        if not contact or not contact.activo or contact.patient_id != patient.id:
            raise HTTPException(403, "La persona de confianza ya no está autorizada.")
    return patient


def start(s: Session, request: AccessStartRequest):
    patient = patient_for(s, request.token)
    if request.fecha_nacimiento != patient.fecha_nacimiento:
        raise HTTPException(
            403, "La fecha no coincide. Revisa la fecha de nacimiento de la paciente."
        )
    contact = None
    if request.quien == "contacto":
        contact = (
            s.get(TrustedContact, request.contacto_id) if request.contacto_id else None
        )
        if not contact or not contact.activo or contact.patient_id != patient.id:
            raise HTTPException(403, "Elige una persona de confianza autorizada.")
    phone = contact.telefono if contact else patient.telefono
    if not phone:
        raise HTTPException(409, "No hay teléfono registrado. Pide ayuda a EIRA.")
    payload = {
        "token": request.token,
        "patient_id": patient.id,
        "contacto_id": contact.id if contact else None,
        "viewer_nombre": contact.nombre if contact else patient.nombre,
        "viewer_rol": request.quien,
        "parentesco": contact.parentesco if contact else None,
    }
    challenge, code = otp.challenge(payload)
    notifier = get_notifier()
    delivery = notifier.send_otp(phone, code)
    if not isinstance(notifier, LogNotifier) and delivery["canal"] == "log":
        otp.delete("otp", challenge)
        raise HTTPException(503, "No pudimos enviar el código, intenta de nuevo.")
    return {
        "challenge_id": challenge,
        "destino_enmascarado": mask(phone),
        "expira_en_segundos": 300,
        **delivery,
        "codigo_demo": code if isinstance(notifier, LogNotifier) else None,
    }


def verify(s: Session, challenge: str, code: str):
    entry = otp.verify(challenge, code)
    check_viewer(s, entry)
    payload = {
        k: v for k, v in entry.items() if k not in ("digest", "attempts", "expires")
    }
    token, expires = otp.put("session", payload, 900)
    return {
        "session_token": token,
        "expires_at": datetime.fromtimestamp(expires, UTC).isoformat(),
        "viewer_nombre": entry["viewer_nombre"],
        "viewer_rol": entry["viewer_rol"],
    }


def results(s: Session, session_token: str):
    viewer = otp.get("session", session_token)
    patient = check_viewer(s, viewer)
    rows = s.exec(
        select(Result).where(
            Result.patient_id == patient.id, Result.estado == "notificado"
        )
    ).all()
    views = []
    name = viewer["viewer_nombre"].split()[0]
    seen_by = (
        f"{name} ({viewer['parentesco']})"
        if viewer["parentesco"]
        else f"{name} (paciente)"
    )
    for result in rows:
        study = s.get(Study, result.study_id) if result.study_id else None
        views.append(
            PatientResultView(
                id=result.id,
                tipo_estudio=result.tipo_estudio,
                fecha=study.fecha if study else result.created_at[:10],
                clasificacion=result.clasificacion,
                explicacion_clara=result.explicacion_clara,
                proximo_control=result.proximo_control,
                pdf_url=f"/api/access/me/results/{result.id}/pdf",
            )
        )
        result.visto_por = seen_by
        result.visto_at = now_iso()
        s.add(result)
        record_audit(
            s,
            viewer["viewer_nombre"],
            viewer["viewer_rol"],
            f"visto por {seen_by}",
            result.id,
        )
    s.commit()
    return views


def patient_pdf(s: Session, session_token: str, result_id: str) -> bytes:
    patient = check_viewer(s, otp.get("session", session_token))
    result = s.get(Result, result_id)
    if not result or result.patient_id != patient.id or result.estado != "notificado":
        raise HTTPException(404, "Resultado no disponible.")
    styles = getSampleStyleSheet()
    output = BytesIO()
    content = [Paragraph("Hilo Rosa · Resumen de tu resultado", styles["Title"])]
    for text in (
        f"Paciente: {patient.nombre} {patient.apellidos}",
        f"Estudio: {result.tipo_estudio}",
        result.explicacion_clara or "Consulta tu resultado con el equipo de EIRA.",
        f"Próximo control: {result.proximo_control or 'Consulta al equipo médico'}",
        "Resumen para la paciente. No sustituye el informe del laboratorio.",
    ):
        content.extend([Spacer(1, 12), Paragraph(escape(text), styles["BodyText"])])
    SimpleDocTemplate(output).build(content)
    return output.getvalue()
