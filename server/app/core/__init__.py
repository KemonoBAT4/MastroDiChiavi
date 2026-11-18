from .database import *
from .handlers import *
from .models   import *
from .security import *

_bearer = fa_security.HTTPBearer(auto_error=False)

def current_user(
    creds   : fa_security.HTTPAuthorizationCredentials | None = fa.Depends(_bearer)    ,
    session : sm.Session                                      = fa.Depends(get_session),
) -> User:

    unauthorized = fa.HTTPException(fa.status.HTTP_401_UNAUTHORIZED, "Not authenticated", headers={"WWW-Authenticate": "Bearer"})

    if creds is None:
        raise unauthorized
    # #endif

    try:
        user_id : str = decode_access_token(creds.credentials)
    except jwt.PyJWTError:
        raise unauthorized
    # #entry

    user: User | None = session.get(User, user_id)

    if user is None:
        raise unauthorized
    # #endif

    return user
# #enddef current_user


def norm_email(email: str) -> str:
    return email.strip().lower()
# #enddef norm_email

def issue_tokens(session: sm.Session, user_id: str) -> TokenOut:
    raw, hashed = new_refresh_token()

    session.add(
        RefreshToken(
            user_id    = user_id,
            token_hash = hashed,
            expires_at = utcnow() + datetime.timedelta(days=settings.refresh_token_days),
        )
    )
    session.commit()

    return TokenOut(
        access_token  = create_access_token(user_id),
        refresh_token = raw,
        expires_in    = settings.access_token_minutes * 60,
    )
# #enddef issue_tokens

def revoke_all_refresh(session: sm.Session, user_id: str) -> None:
    session.exec(
        sa.update(
            RefreshToken
        ).where(
            RefreshToken.user_id == user_id, RefreshToken.revoked == False
        ).values(  # noqa: E712
            revoked=True
        )
    )
    session.commit()
# #enddef revoke_all_refresh

def check_credentials(session: sm.Session, user: User, auth_key: str) -> None:
    """Verifica l'auth_key con blocco progressivo dell'account dopo troppi errori."""

    if ((user.locked_until is not None) and (user.locked_until > utcnow())):
        raise fa.HTTPException(fa.status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts, retry later")
    # #endif

    if (verify_auth_key(user.auth_hash, auth_key) == True):

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
        user.locked_until = utcnow() + datetime.timedelta(minutes=minutes)
    # #endif

    session.add(user)
    session.commit()

    raise fa.HTTPException(fa.status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
# #enddef check_credentials

