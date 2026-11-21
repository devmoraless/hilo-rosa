from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlmodel import Session, select

from app.db import TrustedContact
from app.schemas import (
    AccessIdentity,
    AccessStartRequest,
    AccessStartResponse,
    AccessVerifyRequest,
    AccessVerifyResponse,
    PatientResultView,
    TrustedContactOut,
)
from app.services import access
from app.services.store import get_session

router = APIRouter(prefix="/api/access")
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/token/{token}", response_model=AccessIdentity)
def identity(token: str, s: SessionDep):
    patient = access.patient_for(s, token)
    contacts = s.exec(
        select(TrustedContact).where(
            TrustedContact.patient_id == patient.id, TrustedContact.activo == True
        )
    ).all()
    return AccessIdentity(
        paciente_nombre_corto=f"{patient.nombre.split()[0]} {patient.apellidos[:1]}.",
        contactos=[
            TrustedContactOut(
                id=c.id,
                nombre=c.nombre,
                parentesco=c.parentesco,
                telefono_enmascarado=access.mask(c.telefono),
                activo=c.activo,
            )
            for c in contacts
        ],
    )


@router.post("/start", response_model=AccessStartResponse)
def start(request: AccessStartRequest, s: SessionDep):
    return access.start(s, request)


@router.post("/verify", response_model=AccessVerifyResponse)
def verify(request: AccessVerifyRequest, s: SessionDep):
    return access.verify(s, request.challenge_id, request.codigo)


@router.get("/me/results", response_model=list[PatientResultView])
def results(s: SessionDep, authorization: Annotated[str | None, Header()] = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Verifica tu identidad para ver el resultado.")
    return access.results(s, authorization[7:])
