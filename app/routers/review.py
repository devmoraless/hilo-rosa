"""HR-009 · Médica review board, authorization and the notice feed.

  GET  /api/review/results?estado=   (medica) -> list[ResultOut]
  POST /api/review/preview           (medica) -> rules.classify(...).to_dict()  (live plain-language text)
  GET  /api/review/tasks             (medica) -> open follow-up tasks ("llamar" for high priority)
  POST /api/results/{id}/authorize   (medica) AuthorizeRequest -> AuthorizeResponse
  GET  /api/notifications            -> list[NotificationOut]  (LogNotifier feed, "SMS simulado"; no diagnosis)
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.schemas import (
    AuthorizeRequest,
    AuthorizeResponse,
    Bethesda,
    NotificationOut,
    ResultOut,
    StudyType,
)
from app.services import review
from app.services.notifier import LogNotifier
from app.services.store import get_session

SessionDep = Annotated[Session, Depends(get_session)]


def require_medica(x_demo_role: Annotated[str | None, Header()] = None) -> None:
    if x_demo_role != "medica":
        raise HTTPException(403, "solo la médica autoriza resultados (X-Demo-Role: medica)")


Medica = Depends(require_medica)
router = APIRouter(prefix="/api", tags=["review"])


class PreviewRequest(BaseModel):
    tipo_estudio: StudyType = "papanicolaou"
    bethesda: Bethesda | None = None
    birads: int | None = Field(default=None, ge=0, le=5)
    conducta: str | None = None


@router.get("/review/results", response_model=list[ResultOut], dependencies=[Medica])
def review_results(s: SessionDep, estado: str | None = None) -> list[ResultOut]:
    return review.list_results(s, estado)


@router.post("/review/preview", dependencies=[Medica])
def review_preview(req: PreviewRequest) -> dict:
    try:
        return review.classify_capture(req.tipo_estudio, req.bethesda, req.birads, req.conducta).to_dict()
    except review.ReviewError as e:
        raise HTTPException(e.status, e.detail) from e


@router.get("/review/tasks", dependencies=[Medica])
def review_tasks(s: SessionDep, tipo: str | None = None) -> list[dict]:
    return review.open_tasks(s, tipo)


@router.post("/results/{result_id}/authorize", response_model=AuthorizeResponse, dependencies=[Medica])
def authorize(result_id: str, req: AuthorizeRequest, s: SessionDep) -> AuthorizeResponse:
    try:
        return review.authorize(s, result_id, req)
    except review.ReviewError as e:
        raise HTTPException(e.status, e.detail) from e


@router.get("/notifications", response_model=list[NotificationOut])
def notifications() -> list[NotificationOut]:
    return LogNotifier.feed()
