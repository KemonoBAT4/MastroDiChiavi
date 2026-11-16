
# import uuid
# from datetime import datetime, timezone
# from typing import Optional

# from pydantic import NaiveDatetime
# from sqlmodel import Field, SQLModel

# from typing import Annotated, Literal, Optional
# from pydantic import BaseModel, EmailStr, Field


from core._common import *

def utcnow() -> datetime.datetime:
    return datetime.now(datetime.timezone.utc).replace(tzinfo=None)
# #enddef utcnow

class BaseModel(sm.SQLModel):
    id: str = sm.Field(default_factory=uuid.uuid4().hex, primary_key=True, unique=True)

    created_at: pydantic.NaiveDatetime = sm.Field(default_factory=utcnow)
    updated_at: pydantic.NaiveDatetime = sm.Field(default_factory=utcnow)
# #endclass BaseModel
