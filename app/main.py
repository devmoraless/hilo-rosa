import importlib
import pkgutil
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

from app import routers
from app.services import store


@asynccontextmanager
async def lifespan(_: FastAPI):
    store.init_db()
    if store.is_empty():
        store.reset_demo()
    yield


app = FastAPI(title="Hilo Rosa", lifespan=lifespan)

# Adding an endpoint = creating app/routers/<f>.py with `router`; nobody edits this file.
# `routers` (not `app.routers`): the `app` variable shadows the package of the same name.
for module in pkgutil.iter_modules(routers.__path__):
    router = getattr(importlib.import_module(f"{routers.__name__}.{module.name}"), "router", None)
    if router is not None:
        app.include_router(router)

# The frontend build is mounted last: /api/* always wins. Unknown paths (/p/<token>, /medica…)
# fall back to index.html so the React router handles them.
WEB_DIST = Path(__file__).resolve().parent.parent / "web" / "dist"
if WEB_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=WEB_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        file = WEB_DIST / path
        if path and file.is_file() and WEB_DIST in file.resolve().parents:
            return FileResponse(file)
        return FileResponse(WEB_DIST / "index.html")
