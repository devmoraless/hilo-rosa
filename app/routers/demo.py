from fastapi import APIRouter

from app.services import store

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.post("/reset")
def reset() -> dict:
    """Reload the fictitious demo data (IDEA.md §3). Used by scripts/reset_demo.py and the demo."""
    store.reset_demo()
    return {"ok": True, "demo_data": True}
