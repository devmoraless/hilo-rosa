"""SQLite storage shared by every router. Import `session()` and the tables from app.db."""

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app import db  # noqa: F401  (registers the tables)
from app.config import settings


def _make_engine():
    url = settings.hilo_database_url
    if url.startswith("sqlite"):
        if url in ("sqlite://", "sqlite:///:memory:"):
            return create_engine(url, connect_args={"check_same_thread": False}, poolclass=StaticPool)
        settings.hilo_data_dir.mkdir(parents=True, exist_ok=True)
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(url)


engine = _make_engine()


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


@contextmanager
def session() -> Iterator[Session]:
    with Session(engine) as s:
        yield s


def get_session() -> Iterator[Session]:
    """FastAPI dependency: `s: Session = Depends(get_session)`."""
    with Session(engine) as s:
        yield s


def reset_demo() -> None:
    """Drop everything and load the fictitious demo data (IDEA.md §3). Idempotent."""
    from app.db import Jornada, Patient, Study, TrustedContact, Visit
    from app.fixtures import seed_data as sd

    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        s.add(Jornada(**sd.JORNADA))
        s.add(Jornada(**sd.PAST_JORNADA))
        for p in sd.PATIENTS:
            s.add(Patient(**p))
        s.flush()
        s.add(TrustedContact(**sd.LAURA, consentimiento_at="2025-03-08T10:00:00+00:00"))
        # Every patient already came once (EIRA: ~2.15 studies per woman). María: ultrasound, March 2025.
        for idx, p in enumerate(sd.PATIENTS):
            visit = Visit(id=f"vis-{p['id']}", patient_id=p["id"], jornada_id=sd.PAST_JORNADA["id"] if p["municipio"] == sd.JORNADA["municipio"] else None, created_at="2025-03-08T10:00:00+00:00")
            s.add(visit)
            tipo = "ultrasonido" if p["id"] == "pat-maria" or idx % 3 == 0 else ("papanicolaou" if idx % 3 == 1 else "mastografia")
            s.add(Study(id=f"est-{p['id']}-2025", visit_id=visit.id, patient_id=p["id"], tipo=tipo, fecha="2025-03-08"))
        s.commit()


def is_empty() -> bool:
    from sqlmodel import select

    from app.db import Patient

    with Session(engine) as s:
        return s.exec(select(Patient)).first() is None
