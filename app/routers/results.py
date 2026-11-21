from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, Header, HTTPException, Response, UploadFile
from sqlmodel import Session

from app.schemas import AssociateRequest, ResultOut, ResultState, UploadResponse
from app.services import results as service
from app.services.store import get_session

SessionDep = Annotated[Session, Depends(get_session)]
RESULT_ROLES = ("laboratorio", "medica")


def result_role(x_demo_role: Annotated[str | None, Header()] = None) -> str:
    """Simulated login: the lab uploads and associates; the doctor reviews. Nobody else touches results."""
    if x_demo_role not in RESULT_ROLES:
        raise HTTPException(403, "solo laboratorio o médica (X-Demo-Role)")
    return x_demo_role


RoleDep = Annotated[str, Depends(result_role)]
router = APIRouter(prefix="/api/results", tags=["results"])


def _call(fn, *args):
    try:
        return fn(*args)
    except service.ResultError as e:
        raise HTTPException(e.status, e.detail) from e


@router.post("/upload", response_model=UploadResponse)
async def upload(files: list[UploadFile], s: SessionDep, role: RoleDep) -> UploadResponse:
    if len(files) > service.MAX_BATCH_FILES:
        raise HTTPException(413, f"sube como máximo {service.MAX_BATCH_FILES} PDFs por vez")
    payload: list[tuple[str, bytes]] = []
    total = 0
    for f in files:
        data = await f.read(service.MAX_PDF_BYTES + 1)
        total += len(data)
        if len(data) > service.MAX_PDF_BYTES:
            raise HTTPException(413, f"{f.filename} pesa más de 10 MB")
        if total > service.MAX_BATCH_BYTES:
            raise HTTPException(413, "el lote pesa más de 50 MB")
        payload.append((f.filename or "resultado.pdf", data))
    return UploadResponse(results=_call(service.upload, s, payload, role))


@router.get("", response_model=list[ResultOut])
def list_results(s: SessionDep, role: RoleDep, estado: ResultState | None = None) -> list[ResultOut]:
    return service.list_results(s, role, estado)


@router.post("/{result_id}/associate", response_model=ResultOut)
def associate(result_id: str, req: AssociateRequest, s: SessionDep, role: RoleDep) -> ResultOut:
    return _call(service.associate, s, result_id, req.patient_id, role)


@router.get("/{result_id}/pdf")
def pdf(result_id: str, s: SessionDep, _: RoleDep) -> Response:
    name, data = _call(service.pdf_bytes, s, result_id)
    fallback = "".join(c if c.isascii() and c.isprintable() and c not in '"\\' else "_" for c in name)
    disposition = f"inline; filename=\"{fallback}\"; filename*=UTF-8''{quote(name)}"
    return Response(data, media_type="application/pdf", headers={"Content-Disposition": disposition})
