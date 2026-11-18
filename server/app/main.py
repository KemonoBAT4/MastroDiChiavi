
from fastapi.middleware.cors import CORSMiddleware
from app.core import *
from app.routes import api

@contextlib.asynccontextmanager
async def lifespan(_: fa.FastAPI):
    init_db()
    yield
# #enddef lifespan

app = fa.FastAPI(title="Vault server (zero-knowledge)", lifespan=lifespan)

app.include_router(api)

ORIGINS: list[str] = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

if (ORIGINS is not None):
    app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["*"], allow_headers=["*"])
# #endif
