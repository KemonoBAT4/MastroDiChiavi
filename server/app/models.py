import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import NaiveDatetime
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    """UTC naive (SQLite non conserva il fuso orario)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
# #enddef utcnow

def new_id() -> str:
    return uuid.uuid4().hex
# #enddef new_id

class User(SQLModel, table=True):
    id: str = Field(default_factory=new_id, primary_key=True)
    email: str = Field(index=True, unique=True)
    salt: str                      # base64, non segreto
    kdf_params: str                # JSON
    auth_hash: str                 # Argon2id(auth_key): hash di un hash
    protected_vault_key: str       # vault_key cifrata con enc_key (blob opaco)
    vault_blob: str                # vault cifrato con vault_key (blob opaco)
    version: int = 1
    failed_attempts: int = 0
    locked_until: Optional[NaiveDatetime] = None
    created_at: NaiveDatetime = Field(default_factory=utcnow)
    updated_at: NaiveDatetime = Field(default_factory=utcnow)
# #endclass User

class RefreshToken(SQLModel, table=True):
    id: str = Field(default_factory=new_id, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    token_hash: str = Field(index=True, unique=True)   # SHA-256 del token
    expires_at: NaiveDatetime
    revoked: bool = False
    created_at: NaiveDatetime = Field(default_factory=utcnow)
# #endclass RefreshToken
