
from ._common import *

_URL        : sa.engine.url.URL = sa.engine.make_url(settings.database_url)
_IS_SQLLITE : bool              = _URL.get_backend_name() == "sqlite"

engine = sm.create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if _IS_SQLLITE else {},
)

def init_db() -> None:
    if _IS_SQLLITE and _URL.database:
        os.makedirs(os.path.dirname(os.path.abspath(_URL.database)), exist_ok=True)
    # #endif

    sm.SQLModel.metadata.create_all(engine)
# #enddef init_db

def get_session():
    with sm.Session(engine) as session:
        yield session
    # #endwith
# #enddef get_session
