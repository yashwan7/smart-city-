import pytest
import tempfile
import os
from pathlib import Path
from fastapi.testclient import TestClient
from hub.main import app
from hub.database import init_db, get_connection
from hub.engine.emission_engine import load_factors_from_yaml
from hub.config import settings

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    # Create temporary database for testing
    fd, temp_db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    
    settings.SQLITE_DB_PATH = temp_db_path
    conn = init_db(temp_db_path)
    load_factors_from_yaml(conn)
    conn.close()
    
    yield temp_db_path
    
    # Cleanup
    try:
        if os.path.exists(temp_db_path):
            os.remove(temp_db_path)
    except Exception:
        pass

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def db_conn():
    conn = get_connection()
    yield conn
    conn.close()
