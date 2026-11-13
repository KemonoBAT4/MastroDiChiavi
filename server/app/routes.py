
from .main import app
from .utils import *

@app.get("/health")
def health():
    return {"status": "ok"}
# #enddef health

@app.post("/prelogin", response_model=PreloginOut)
def prelogin(body: PreloginIn, session: Session = Depends(get_session)):
    email: str = norm_email(body.email)
    user : User | None = session.exec(select(User).where(User.email == email)).first()

    if (user is None):
        return PreloginOut(salt=sec.fake_salt(email), kdf_params=KdfParams(**DEFAULT_KDF))
    # #endif

    return PreloginOut(salt=user.salt, kdf_params=KdfParams.model_validate_json(user.kdf_params))
# #enddef prelogin

@app.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, session: Session = Depends(get_session)):

    if (not settings.allow_registration):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Registration is closed")
    # #endif

    email = norm_email(body.email)

    if (session.exec(select(User).where(User.email == email)).first() is not None):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    # #endif

    session.add(
        User(
            email               = email,
            salt                = body.salt,
            kdf_params          = body.kdf_params.model_dump_json(),
            auth_hash           = sec.hash_auth_key(body.auth_key),
            protected_vault_key = body.protected_vault_key,
            vault_blob          = body.vault_blob,
        )
    )
    session.commit()

    return {"status": "created"}
# #enddef register

@app.post("/login", response_model=LoginOut)
def login(body: LoginIn, session: Session = Depends(get_session)):
    user: User | None = session.exec(select(User).where(User.email == norm_email(body.email))).first()

    if (user is None):
        sec.burn_time()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
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

@app.post("/refresh", response_model=TokenOut)
def refresh(body: RefreshIn, session: Session = Depends(get_session)):
    rt: RefreshToken | None = session.exec(
        select(
            RefreshToken
        ).where(
            RefreshToken.token_hash == sec.hash_refresh(body.refresh_token)
        )
    ).first()

    invalid = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")

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

@app.get("/vault", response_model=VaultOut)
def get_vault(user: User = Depends(current_user)):
    return VaultOut(vault_blob=user.vault_blob, version=user.version)
# #enddef get_vault

@app.put("/vault", response_model=VersionOut)
def put_vault(body: VaultPutIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
    result = session.execute(
        update(User)
        .where(User.id == user.id, User.version == body.base_version)
        .values(vault_blob=body.vault_blob, version=User.version + 1, updated_at=utcnow())
    )

    session.commit()
    session.refresh(user)

    if result.rowcount == 0:
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"error": "version_conflict", "current_version": user.version})
    # #endif

    return VersionOut(version=user.version)
# #enddef put_vault

@app.post("/change-password", response_model=TokenOut)
def change_password(body: ChangePasswordIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
    check_credentials(session, user, body.old_auth_key)

    user.auth_hash           = sec.hash_auth_key(body.new_auth_key)
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
