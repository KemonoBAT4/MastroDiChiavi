import os

from sqlalchemy.engine import make_url
from sqlmodel import Session, SQLModel, create_engine

from .config import settings

_url       = make_url(settings.database_url)
_is_sqlite = _url.get_backend_name() == "sqlite"

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)

def init_db() -> None:

    if _is_sqlite and _url.database:
        os.makedirs(os.path.dirname(os.path.abspath(_url.database)), exist_ok=True)
    # #endif

    SQLModel.metadata.create_all(engine)
# #enddef init_db

def get_session():
    with Session(engine) as session:
        yield session
    # #endwith
# #enddef get_session
