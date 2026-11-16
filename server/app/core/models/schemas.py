
from ._common import *

MAX_BLOB = 5_000_000  # base64 chars (~3,7 MB of data)

AuthKey  = typing.Annotated[str, sm.Field(min_length = 32, max_length = 512     )]
SmallB64 = typing.Annotated[str, sm.Field(min_length = 16, max_length = 4096    )]
Blob     = typing.Annotated[str, sm.Field(min_length = 1 , max_length = MAX_BLOB)]

class KdfParams(pydantic.BaseModel):
    algorithm   : typing.Literal["argon2id"] = "argon2id"
    memory_kib  : int                        = pydantic.Field(ge=8192, le=1_048_576)
    iterations  : int                        = pydantic.Field(ge=1   , le=20       )
    parallelism : int                        = pydantic.Field(ge=1   , le=16       )
# #endclass KdfParams

class PreloginIn(pydantic.BaseModel):
    email: pydantic.EmailStr
# #endclass PreloginIn

class PreloginOut(pydantic.BaseModel):
    salt       : str
    kdf_params : KdfParams
# #endclass PreloginOut

class RegisterIn(pydantic.BaseModel):
    email               : pydantic.EmailStr
    salt                : SmallB64
    kdf_params          : KdfParams
    auth_key            : AuthKey
    protected_vault_key : SmallB64
    vault_blob          : Blob
# #endclass RegisterIn

class LoginIn(pydantic.BaseModel):
    email    : pydantic.EmailStr
    auth_key : AuthKey
# #endclass LoginIn

class TokenOut(pydantic.BaseModel):
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
    refresh_token: typing.Annotated[str, pydantic.Field(min_length=16, max_length=256)]
# #endclass RefreshIn

class VaultOut(pydantic.BaseModel):
    vault_blob : str
    version    : int
# #endclass VaultOut

class VaultPutIn(pydantic.BaseModel):
    vault_blob   : Blob
    base_version : int = pydantic.Field(ge=1)
# #endclass VaultPutIn

class VersionOut(pydantic.BaseModel):
    version: int
# #endclass VersionOut

class ChangePasswordIn(pydantic.BaseModel):
    old_auth_key            : AuthKey
    new_auth_key            : AuthKey
    new_protected_vault_key : SmallB64
    new_salt                : typing.Optional[SmallB64]  = None
    new_kdf_params          : typing.Optional[KdfParams] = None
# #endclass ChangePasswordIn
