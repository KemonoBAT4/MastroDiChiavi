
from ._common import *

# KDF default parameters , returned by /prelogin for unknown emails
# (must be the same with the one proposed by the client during the registration)
DEFAULT_KDF = {"algorithm": "argon2id", "memory_kib": 65536, "iterations": 3, "parallelism": 4}

_DATABASE_URL = "sqlite:///./data/vault.db"

class Settings(pydantic_settings.BaseSettings):
    model_config = pydantic_settings.SettingsConfigDict(env_file=".env", extra="ignore")

    secret_key           : str                                # at leas 32 chars
    database_url         : str  = _DATABASE_URL
    allow_registration   : bool = True                        # set False after creating the users
    access_token_minutes : int  = 15
    refresh_token_days   : int  = 30
    lockout_threshold    : int  = 5                           # available errors before account lockout
    cors_origins         : str  = ""                          # list speraated by "," (used for WebView/Capacitator)
# #endclass Settings

settings = Settings()
