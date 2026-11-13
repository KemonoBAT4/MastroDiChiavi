import base64
import hashlib
import hmac
import secrets
from datetime import timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from .config import settings
from .models import utcnow

_ph = PasswordHasher()
_DUMMY_HASH = _ph.hash("dummy-auth-key")


def hash_auth_key(auth_key: str) -> str:
    return _ph.hash(auth_key)
# #enddef hash_auth_key

def verify_auth_key(auth_hash: str, auth_key: str) -> bool:
    try:
        return _ph.verify(auth_hash, auth_key)
    except (VerificationError, InvalidHashError):
        return False
    # #endtry
# #enddef verify_auth_key

def burn_time() -> None:
    """Verifica fittizia: stesso tempo di risposta per utenti inesistenti."""
    verify_auth_key(_DUMMY_HASH, "x")
# #enddef burn_time

def fake_salt(email: str) -> str:
    """Salt finto ma costante per email sconosciute (evita di rivelare chi ha un account)."""
    digest = hmac.new(settings.secret_key.encode(), b"fake-salt:" + email.encode(), hashlib.sha256).digest()

    return base64.b64encode(digest[:16]).decode()
# #enddef fake_salt

def create_access_token(user_id: str) -> str:
    now = utcnow()
    payload = {"sub": user_id, "typ": "access", "iat": now, "exp": now + timedelta(minutes=settings.access_token_minutes)}

    return jwt.encode(payload, settings.secret_key, algorithm="HS256")
# #enddef create_access_token

def decode_access_token(token: str) -> str:
    payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"], options={"require": ["exp", "sub"]})

    if payload.get("typ") != "access":
        raise jwt.InvalidTokenError("wrong token type")
    # #endif

    return payload["sub"]
# #enddef decode_access_token

def hash_refresh(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()
# #enddef hash_refresh

def new_refresh_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(48)

    return raw, hash_refresh(raw)
# #enddef new_refresh_token
