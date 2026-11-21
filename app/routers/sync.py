from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlmodel import Session

from app.schemas import SyncRequest, SyncResponse
from app.services import sync as sync_service
from app.services.store import get_session

SessionDep = Annotated[Session, Depends(get_session)]


def require_capturista(x_demo_role: Annotated[str | None, Header()] = None) -> None:
    """Simulated login (see app.schemas): only jornada staff read the registry, sync or print credentials."""
    if x_demo_role != "capturista":
        raise HTTPException(403, "solo personal de jornada (X-Demo-Role: capturista)")

router = APIRouter(prefix="/api", dependencies=[Depends(require_capturista)], tags=["sync"])


@router.post("/sync", response_model=SyncResponse)
def sync(req: SyncRequest, s: SessionDep) -> SyncResponse:
    return sync_service.apply_batch(s, req)
