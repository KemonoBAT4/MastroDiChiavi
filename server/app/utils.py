from datetime import timedelta

from fastapi import Depends, HTTPException, status
from sqlalchemy import update
from sqlmodel import Session, select

from . import security as sec
from .config import DEFAULT_KDF, settings
from .db import get_session
from .deps import current_user
from .models import RefreshToken, User, utcnow
from .schemas import *

def norm_email(email: str) -> str:
    return email.strip().lower()
# #enddef norm_email

def issue_tokens(session: Session, user_id: str) -> TokenOut:
    raw, hashed = sec.new_refresh_token()

    session.add(
        RefreshToken(
            user_id    = user_id,
            token_hash = hashed,
            expires_at = utcnow() + timedelta(days=settings.refresh_token_days),
        )
    )
    session.commit()

    return TokenOut(
        access_token  = sec.create_access_token(user_id),
        refresh_token = raw,
        expires_in    = settings.access_token_minutes * 60,
    )
# #enddef issue_tokens

def revoke_all_refresh(session: Session, user_id: str) -> None:
    session.execute(
        update(
            RefreshToken
        ).where(
            RefreshToken.user_id == user_id, RefreshToken.revoked == False
        ).values(  # noqa: E712
            revoked=True
        )
    )
    session.commit()
# #enddef revoke_all_refresh

def check_credentials(session: Session, user: User, auth_key: str) -> None:
    """Verifica l'auth_key con blocco progressivo dell'account dopo troppi errori."""

    if ((user.locked_until is not None) and (user.locked_until > utcnow())):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts, retry later")
    # #endif

    if (sec.verify_auth_key(user.auth_hash, auth_key) == True):

        if user.failed_attempts or user.locked_until:
            user.failed_attempts = 0
            user.locked_until    = None

            session.add(user)
            session.commit()
        # #endif

        return
    # #endif

    user.failed_attempts += 1

    if (user.failed_attempts >= settings.lockout_threshold):
        minutes = min(2 ** (user.failed_attempts - settings.lockout_threshold), 60)
        user.locked_until = utcnow() + timedelta(minutes=minutes)
    # #endif

    session.add(user)
    session.commit()

    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
# #enddef check_credentials

