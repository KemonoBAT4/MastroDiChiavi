import base64
import os

KDF = {"algorithm": "argon2id", "memory_kib": 65536, "iterations": 3, "parallelism": 4}


def b64(n=32):
    return base64.b64encode(os.urandom(n)).decode()


def register(client, email="marco@example.com", auth_key=None):
    auth_key = auth_key or b64()
    r = client.post("/register", json={
        "email": email, "salt": b64(16), "kdf_params": KDF, "auth_key": auth_key,
        "protected_vault_key": b64(60), "vault_blob": b64(100),
    })
    assert r.status_code == 201, r.text
    return auth_key


def login(client, auth_key, email="marco@example.com"):
    return client.post("/login", json={"email": email, "auth_key": auth_key})


def auth(tokens):
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def test_prelogin_hides_unknown_users(client):
    a = client.post("/prelogin", json={"email": "nobody@example.com"}).json()
    b = client.post("/prelogin", json={"email": "nobody@example.com"}).json()
    assert a == b and a["salt"]


def test_register_login_and_vault_sync(client):
    key = register(client)
    assert client.post("/register", json={"email": "MARCO@example.com", "salt": b64(16), "kdf_params": KDF,
        "auth_key": b64(), "protected_vault_key": b64(60), "vault_blob": b64(10)}).status_code == 409
    assert login(client, b64()).status_code == 401

    r = login(client, key)
    assert r.status_code == 200
    tokens = r.json()
    assert tokens["version"] == 1

    assert client.get("/vault").status_code == 401
    new_blob = b64(200)
    r = client.put("/vault", json={"vault_blob": new_blob, "base_version": 1}, headers=auth(tokens))
    assert r.json()["version"] == 2
    r = client.put("/vault", json={"vault_blob": b64(10), "base_version": 1}, headers=auth(tokens))
    assert r.status_code == 409 and r.json()["detail"]["current_version"] == 2
    assert client.get("/vault", headers=auth(tokens)).json() == {"vault_blob": new_blob, "version": 2}


def test_refresh_rotation_and_reuse_detection(client):
    key = register(client)
    t1 = login(client, key).json()
    t2 = client.post("/refresh", json={"refresh_token": t1["refresh_token"]}).json()
    assert t2["refresh_token"] != t1["refresh_token"]
    # riuso del vecchio token -> rifiutato e revoca di tutta la famiglia
    assert client.post("/refresh", json={"refresh_token": t1["refresh_token"]}).status_code == 401
    assert client.post("/refresh", json={"refresh_token": t2["refresh_token"]}).status_code == 401


def test_lockout_after_failed_attempts(client):
    key = register(client)
    for _ in range(5):
        assert login(client, b64()).status_code == 401
    assert login(client, key).status_code == 429


def test_change_password(client):
    old = register(client)
    tokens = login(client, old).json()
    new = b64()
    r = client.post("/change-password", headers=auth(tokens), json={
        "old_auth_key": old, "new_auth_key": new, "new_protected_vault_key": b64(60)})
    assert r.status_code == 200
    assert client.post("/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code == 401
    assert login(client, old).status_code == 401
    assert login(client, new).status_code == 200
