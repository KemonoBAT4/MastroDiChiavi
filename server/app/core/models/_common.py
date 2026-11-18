
from app.core._common import *

def _new_id() -> str:
    return uuid.uuid4().hex

class BaseModel(sm.SQLModel):
    id: str = sm.Field(default_factory=_new_id, primary_key=True, unique=True)

    created_at: datetime.datetime = sm.Field(default_factory=utcnow)
    updated_at: datetime.datetime = sm.Field(default_factory=utcnow)
# #endclass BaseModel
