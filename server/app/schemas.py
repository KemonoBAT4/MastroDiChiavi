from typing import Annotated, Literal, Optional

from pydantic import BaseModel, EmailStr, Field

MAX_BLOB = 5_000_000  # base64 chars (~3,7 MB of data)

AuthKey  = Annotated[str, Field(min_length = 32, max_length = 512     )]
SmallB64 = Annotated[str, Field(min_length = 16, max_length = 4096    )]
Blob     = Annotated[str, Field(min_length = 1 , max_length = MAX_BLOB)]

class KdfParams(BaseModel):
    algorithm   : Literal["argon2id"] = "argon2id"
    memory_kib  : int                 = Field(ge=8192, le=1_048_576)
    iterations  : int                 = Field(ge=1, le=20)
    parallelism : int                 = Field(ge=1, le=16)
# #endclass KdfParams

class PreloginIn(BaseModel):
    email: EmailStr
# #endclass PreloginIn

class PreloginOut(BaseModel):
    salt       : str
    kdf_params : KdfParams
# #endclass PreloginOut

class RegisterIn(BaseModel):
    email               : EmailStr
    salt                : SmallB64
    kdf_params          : KdfParams
    auth_key            : AuthKey
    protected_vault_key : SmallB64
    vault_blob          : Blob
# #endclass RegisterIn

class LoginIn(BaseModel):
    email    : EmailStr
    auth_key : AuthKey
# #endclass LoginIn

class TokenOut(BaseModel):
    access_token  : str
    refresh_token : str
    token_type    : str = "bearer"
    expires_in    : int
# #endclass TokenOut

class LoginOut(TokenOut):
    protected_vault_key : str
    vault_blob          : str
    version             : int
# #endclass LoginOut

class RefreshIn(BaseModel):
    refresh_token: Annotated[str, Field(min_length=16, max_length=256)]
# #endclass RefreshIn

class VaultOut(BaseModel):
    vault_blob : str
    version    : int
# #endclass VaultOut

class VaultPutIn(BaseModel):
    vault_blob   : Blob
    base_version : int = Field(ge=1)
# #endclass VaultPutIn

class VersionOut(BaseModel):
    version: int
# #endclass VersionOut

class ChangePasswordIn(BaseModel):
    old_auth_key            : AuthKey
    new_auth_key            : AuthKey
    new_protected_vault_key : SmallB64
    new_salt                : Optional[SmallB64]  = None
    new_kdf_params          : Optional[KdfParams] = None
# #endclass ChangePasswordIn
