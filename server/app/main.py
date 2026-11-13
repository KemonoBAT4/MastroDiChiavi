from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import init_db

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield
# #enddef lifespan

app = FastAPI(title="Vault server (zero-knowledge)", lifespan=lifespan)

ORIGINS: list[str] = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

if (ORIGINS is not None):
    app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["*"], allow_headers=["*"])
# #endif
