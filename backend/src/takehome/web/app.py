from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Running database migrations...")
    alembic_cfg = Config("alembic.ini")
    # Run in a thread because alembic's env.py uses asyncio.run(),
    # which cannot nest inside the already-running event loop.
    await asyncio.to_thread(command.upgrade, alembic_cfg, "head")
    logger.info("Migrations complete")
    yield


app = FastAPI(title="Orbital Document Q&A", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from takehome.web.routers import conversations, documents, messages  # noqa: E402

# Include API routers
app.include_router(conversations.router)
app.include_router(messages.router)
app.include_router(documents.router)

# Serve frontend static files in production
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

frontend_build_path = "/app/frontend/dist"

if os.path.exists(frontend_build_path):
    logger.info("Frontend build found, serving static files", path=frontend_build_path)

    # Mount static assets first
    app.mount("/assets", StaticFiles(directory=f"{frontend_build_path}/assets"), name="assets")

    # SPAStaticFiles handles serving index.html for all non-matched routes
    from starlette.staticfiles import StaticFiles as BaseStaticFiles

    class SPAStaticFiles(BaseStaticFiles):
        async def get_response(self, path: str, scope):
            try:
                return await super().get_response(path, scope)
            except:
                # Serve index.html for any non-existent path (SPA routing)
                return await super().get_response("index.html", scope)

    # Mount frontend - this must be LAST so API routes are matched first
    app.mount("/", SPAStaticFiles(directory=frontend_build_path, html=True), name="frontend")
else:
    logger.warning("Frontend build not found, serving API only", path=frontend_build_path)
