from datetime import UTC, datetime

from fastapi import HTTPException
from sqlmodel import Session, select

from app.config import settings
from app.db import Patient, Result, Study, TrustedContact, now_iso
from app.schemas import AccessStartRequest, PatientResultView
from app.services.otp import OTPStore
from app.services.sync import record_audit

try:
    from app.services.notifier import LogNotifier
except ModuleNotFoundError:

    class LogNotifier:
        def send_otp(self, telefono: str, codigo: str):
            return {"canal": "SMS simulado", "codigo_demo": codigo}


otp = OTPStore(valkey_url=settings.valkey_url)
notifier = LogNotifier()


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
    delivery = notifier.send_otp(phone, code)
    return {
        "challenge_id": challenge,
        "destino_enmascarado": mask(phone),
        "expira_en_segundos": 300,
        **delivery,
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
                pdf_url=f"/api/results/{result.id}/pdf",
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
