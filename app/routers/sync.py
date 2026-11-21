from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.schemas import SyncRequest, SyncResponse
from app.services import sync as sync_service
from app.services.store import get_session

SessionDep = Annotated[Session, Depends(get_session)]

router = APIRouter(prefix="/api", tags=["sync"])


@router.post("/sync", response_model=SyncResponse)
def sync(req: SyncRequest, s: SessionDep) -> SyncResponse:
    return sync_service.apply_batch(s, req)
