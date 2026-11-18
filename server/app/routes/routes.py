
from fastapi import APIRouter

from ._common import *

api = APIRouter(prefix="")

@api.get("/health")
def health():
    return {"status": "ok"}
# #enddef health

@api.post("/prelogin", response_model=PreloginOut)
def prelogin(body: PreloginIn, session: sm.Session = fa.Depends(get_session)):
    email: str = norm_email(body.email)
    user : User | None = session.exec(sm.select(User).where(User.email == email)).first()

    if (user is None):
        return PreloginOut(salt=fake_salt(email), kdf_params=KdfParams(**DEFAULT_KDF))
    # #endif

    return PreloginOut(salt=user.salt, kdf_params=KdfParams.model_validate_json(user.kdf_params))
# #enddef prelogin

@api.post("/register", status_code=fa.status.HTTP_201_CREATED)
def register(body: RegisterIn, session: sm.Session = fa.Depends(get_session)):

    if (not settings.allow_registration):
        raise fa.HTTPException(fa.status.HTTP_403_FORBIDDEN, "Registration is closed")
    # #endif

    email = norm_email(body.email)

    if (session.exec(sm.select(User).where(User.email == email)).first() is not None):
        raise fa.HTTPException(fa.status.HTTP_409_CONFLICT, "Email already registered")
    # #endif

    session.add(
        User(
            email               = email,
            salt                = body.salt,
            kdf_params          = body.kdf_params.model_dump_json(),
            auth_hash           = hash_auth_key(body.auth_key),
            protected_vault_key = body.protected_vault_key,
            vault_blob          = body.vault_blob,
        )
    )
    session.commit()

    return {"status": "created"}
# #enddef register

@api.post("/login", response_model=LoginOut)
def login(body: LoginIn, session: sm.Session = fa.Depends(get_session)):
    user: User | None = session.exec(sm.select(User).where(User.email == norm_email(body.email))).first()

    if (user is None):
        burn_time()
        raise fa.HTTPException(fa.status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    # #endif

    check_credentials(session, user, body.auth_key)
    tokens: TokenOut = issue_tokens(session, user.id)

    return LoginOut(
        **tokens.model_dump(),
        protected_vault_key = user.protected_vault_key,
        vault_blob          = user.vault_blob,
        version             = user.version,
    )
# #enddef login

@api.post("/refresh", response_model=TokenOut)
def refresh(body: RefreshIn, session: sm.Session = fa.Depends(get_session)):
    rt: RefreshToken | None = session.exec(
        sm.select(
            RefreshToken
        ).where(
            RefreshToken.token_hash == hash_refresh(body.refresh_token)
        )
    ).first()

    invalid = fa.HTTPException(fa.status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")

    if (rt is None):
        raise invalid
    # #endif

    if (rt.revoked):
        revoke_all_refresh(session, rt.user_id)
        raise invalid
    # #endif

    if rt.expires_at < utcnow():
        raise invalid
    # #endif

    rt.revoked = True

    session.add(rt)
    session.commit()

    return issue_tokens(session, rt.user_id)
# #enddef refresh

@api.get("/vault", response_model=VaultOut)
def get_vault(user: User = fa.Depends(current_user)):
    return VaultOut(vault_blob=user.vault_blob, version=user.version)
# #enddef get_vault

@api.put("/vault", response_model=VersionOut)
def put_vault(body: VaultPutIn, user: User = fa.Depends(current_user), session: sm.Session = fa.Depends(get_session)):
    result = session.execute(
        sm.update(
            User
        ).where(
            User.id == user.id,
            User.version == body.base_version
        ).values(
            vault_blob=body.vault_blob,
            version=User.version + 1,
            updated_at=utcnow()
        )
    )

    session.commit()
    session.refresh(user)

    if result.rowcount == 0:
        raise fa.HTTPException(fa.status.HTTP_409_CONFLICT, detail={"error": "version_conflict", "current_version": user.version})
    # #endif

    return VersionOut(version=user.version)
# #enddef put_vault

@api.post("/change-password", response_model=TokenOut)
def change_password(body: ChangePasswordIn, user: User = fa.Depends(current_user), session: sm.Session = fa.Depends(get_session)):
    check_credentials(session, user, body.old_auth_key)

    user.auth_hash           = hash_auth_key(body.new_auth_key)
    user.protected_vault_key = body.new_protected_vault_key

    if body.new_salt:
        user.salt = body.new_salt
    # #endif

    if body.new_kdf_params:
        user.kdf_params = body.new_kdf_params.model_dump_json()
    # #endif

    user.updated_at = utcnow()

    session.add(user)
    session.commit()

    revoke_all_refresh(session, user.id)

    return issue_tokens(session, user.id)
# #enddef change_password
