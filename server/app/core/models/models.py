

from ._common import *

class User(BaseModel, table=True):
    email      : str  = sm.Field(index=True, unique=True)
    version    : int  = 1
    salt       : str               # base64, non segreto
    auth_hash  : str               # Argon2id(auth_key): hash di un hash
    kdf_params : str               # JSON
    vault_blob : str               # vault cifrato con vault_key (blob opaco)

    failed_attempts     : int = 0
    protected_vault_key : str      # vault_key cifrata con enc_key (blob opaco)

    locked_until : typing.Optional[datetime.datetime] = None
# #endclass User

class RefreshToken(BaseModel, table=True):
    user_id    : str               = sm.Field(foreign_key="user.id", index=True)
    token_hash : str               = sm.Field(index=True, unique=True)   # SHA-256 del token
    revoked    : bool              = False
    expires_at : datetime.datetime
# #endclass RefreshToken
