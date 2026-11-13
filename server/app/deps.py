import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from . import security as sec
from .db import get_session
from .models import User

_bearer = HTTPBearer(auto_error=False)

def current_user(
    creds   : HTTPAuthorizationCredentials | None = Depends(_bearer)    ,
    session : Session                             = Depends(get_session),
) -> User:

    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated", headers={"WWW-Authenticate": "Bearer"})

    if creds is None:
        raise unauthorized
    # #endif

    try:
        user_id : str = sec.decode_access_token(creds.credentials)
    except jwt.PyJWTError:
        raise unauthorized
    # #entry

    user: User | None = session.get(User, user_id)

    if user is None:
        raise unauthorized
    # #endif

    return user
# #enddef current_user
