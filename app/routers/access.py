from fastapi import APIRouter

router = APIRouter(prefix="/api/access")


@router.post("/start")
def start():
    return {}


@router.post("/verify")
def verify():
    return {}
