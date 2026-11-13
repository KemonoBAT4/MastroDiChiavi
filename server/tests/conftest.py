import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["SECRET_KEY"] = "test-secret-key-test-secret-key-1234"
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel

from app.db import engine
from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as c:
        SQLModel.metadata.drop_all(engine)
        SQLModel.metadata.create_all(engine)
        yield c
