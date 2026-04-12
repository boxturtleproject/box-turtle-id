def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_root_returns_api_info(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "BoxTurtle ID API"


def test_openapi_docs_available(client):
    response = client.get("/docs")
    assert response.status_code == 200
