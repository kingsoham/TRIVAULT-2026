from fastapi.testclient import TestClient


def test_register_user_success(client: TestClient):
    response = client.post(
        "/auth/register",
        json={
            "username": "charlie",
            "email": "charlie@example.com",
            "password": "SecurePassword123!"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "charlie"
    assert data["email"] == "charlie@example.com"
    assert "password" not in data
    assert "password_hash" not in data
    assert "id" in data


def test_register_duplicate_username(client: TestClient):
    client.post(
        "/auth/register",
        json={
            "username": "duplicate_user",
            "email": "user1@example.com",
            "password": "Password123!"
        }
    )
    response = client.post(
        "/auth/register",
        json={
            "username": "duplicate_user",
            "email": "user2@example.com",
            "password": "Password123!"
        }
    )
    assert response.status_code == 409
    assert "username already exists" in response.json()["detail"].lower()


def test_register_duplicate_email(client: TestClient):
    client.post(
        "/auth/register",
        json={
            "username": "user_a",
            "email": "shared@example.com",
            "password": "Password123!"
        }
    )
    response = client.post(
        "/auth/register",
        json={
            "username": "user_b",
            "email": "shared@example.com",
            "password": "Password123!"
        }
    )
    assert response.status_code == 409
    assert "email address already exists" in response.json()["detail"].lower()


def test_login_success(client: TestClient):
    # Register first
    client.post(
        "/auth/register",
        json={
            "username": "david",
            "email": "david@example.com",
            "password": "DavidSecretPassword!"
        }
    )
    # Login with username
    response = client.post(
        "/auth/login",
        json={
            "username": "david",
            "password": "DavidSecretPassword!"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "david"


def test_login_with_email_success(client: TestClient):
    client.post(
        "/auth/register",
        json={
            "username": "emily",
            "email": "emily@example.com",
            "password": "EmilyPassword123!"
        }
    )
    response = client.post(
        "/auth/login",
        json={
            "username": "emily@example.com",
            "password": "EmilyPassword123!"
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_incorrect_password(client: TestClient):
    client.post(
        "/auth/register",
        json={
            "username": "frank",
            "email": "frank@example.com",
            "password": "CorrectPassword123!"
        }
    )
    response = client.post(
        "/auth/login",
        json={
            "username": "frank",
            "password": "WrongPassword!"
        }
    )
    assert response.status_code == 401
    assert "invalid username or password" in response.json()["detail"].lower()


def test_login_nonexistent_user(client: TestClient):
    response = client.post(
        "/auth/login",
        json={
            "username": "ghost_user",
            "password": "Password123!"
        }
    )
    assert response.status_code == 401
    assert "invalid username or password" in response.json()["detail"].lower()


def test_get_me_success(client: TestClient, auth_headers: dict):
    response = client.get("/auth/me", headers={"Authorization": auth_headers["Authorization"]})
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "alice_test"
    assert data["email"] == "alice@example.com"


def test_get_me_missing_token(client: TestClient):
    response = client.get("/auth/me")
    assert response.status_code == 401
    assert "token is missing" in response.json()["detail"].lower()


def test_get_me_invalid_token(client: TestClient):
    response = client.get("/auth/me", headers={"Authorization": "Bearer invalid.token.payload"})
    assert response.status_code == 401
    assert "token is invalid" in response.json()["detail"].lower()
