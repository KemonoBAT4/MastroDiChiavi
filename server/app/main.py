from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.database.db import init_db
from .routes.routes import api

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield
# #enddef lifespan

app = FastAPI(title="Vault server (zero-knowledge)", lifespan=lifespan)

app.include_router(api)

ORIGINS: list[str] = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

if (ORIGINS is not None):
    app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["*"], allow_headers=["*"])
# #endif
