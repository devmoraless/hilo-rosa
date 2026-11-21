"""Laboratorio results (HR-008): PDF upload, folio detection and manual association."""

from sqlmodel import Session

from app.schemas import ResultOut


def upload(s: Session, files: list[tuple[str, bytes]], role: str) -> list[ResultOut]:
    return []


def associate(s: Session, result_id: str, patient_ref: str, role: str) -> ResultOut:
    raise NotImplementedError
