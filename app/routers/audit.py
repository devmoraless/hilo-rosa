from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.db import AuditLog
from app.schemas import AuditResponse
from app.services.audit import verify
from app.services.store import get_session

router = APIRouter(prefix="/api/audit")
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", response_model=AuditResponse)
def audit(s: SessionDep):
    entries = [
        row.model_dump() for row in s.exec(select(AuditLog).order_by(AuditLog.id)).all()
    ]
    ok, bad = verify(entries)
    return {"entries": entries, "integridad_ok": ok, "primer_registro_alterado": bad}
