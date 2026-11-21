from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from sqlmodel import Session, select

from app.db import Jornada, Patient, Study, now_iso
from app.schemas import JornadaOut, SnapshotPatient, SnapshotResponse, StudySummary
from app.services import credential
from app.services.store import get_session

SessionDep = Annotated[Session, Depends(get_session)]


def require_capturista(x_demo_role: Annotated[str | None, Header()] = None) -> None:
    """Simulated login (see app.schemas): only jornada staff read the registry, sync or print credentials."""
    if x_demo_role != "capturista":
        raise HTTPException(403, "solo personal de jornada (X-Demo-Role: capturista)")

router = APIRouter(prefix="/api", dependencies=[Depends(require_capturista)], tags=["jornadas"])


@router.get("/jornadas", response_model=list[JornadaOut])
def list_jornadas(s: SessionDep) -> list[JornadaOut]:
    rows = s.exec(select(Jornada).order_by(Jornada.fecha.desc())).all()  # type: ignore[attr-defined]
    return [JornadaOut.model_validate(j, from_attributes=True) for j in rows]


@router.get("/jornadas/{jornada_id}/snapshot", response_model=SnapshotResponse)
def snapshot(jornada_id: str, s: SessionDep) -> SnapshotResponse:
    """Minimal data of the jornada's municipality for IndexedDB (never the qr_token)."""
    jornada = s.get(Jornada, jornada_id)
    if jornada is None:
        raise HTTPException(404, "jornada no encontrada")
    patients = s.exec(select(Patient).where(Patient.municipio == jornada.municipio).order_by(Patient.apellidos)).all()
    studies: dict[str, list[StudySummary]] = {}
    ids = [p.id for p in patients]
    for st in s.exec(select(Study).where(Study.patient_id.in_(ids)).order_by(Study.fecha)).all():  # type: ignore[attr-defined]
        studies.setdefault(st.patient_id, []).append(StudySummary(id=st.id, tipo=st.tipo, fecha=st.fecha))
    return SnapshotResponse(
        jornada=JornadaOut.model_validate(jornada, from_attributes=True),
        patients=[
            SnapshotPatient(
                id=p.id, folio=p.folio, nombre=p.nombre, apellidos=p.apellidos, fecha_nacimiento=p.fecha_nacimiento,
                municipio=p.municipio, telefono=p.telefono, version=p.version, estudios=studies.get(p.id, []),
            )
            for p in patients
        ],
        generated_at=now_iso(),
    )


@router.get("/patients/{patient_id}/credential.png")
def credential_png(patient_id: str, s: SessionDep) -> Response:
    patient = s.get(Patient, patient_id)
    if patient is None or patient.qr_revocado:
        raise HTTPException(404, "credencial no disponible")
    return Response(credential.render_credential_png(patient), media_type="image/png", headers={"Cache-Control": "no-store"})
