def test_identify_returns_submission_id(client, sample_image_bytes):
    response = client.post(
        "/api/submissions/identify",
        data={"site": "patuxent"},
        files={"top": ("top.jpg", sample_image_bytes, "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "submission_id" in data
    assert "candidates" in data
    assert "total_compared" in data
    assert "processing_time_ms" in data
    assert data["submission_id"] != ""


def test_identify_requires_top_image(client):
    response = client.post(
        "/api/submissions/identify",
        data={"site": "patuxent"},
    )
    assert response.status_code == 422


def test_identify_with_optional_images(client, sample_image_bytes):
    response = client.post(
        "/api/submissions/identify",
        data={"site": "wallkill"},
        files={
            "top": ("top.jpg", sample_image_bytes, "image/jpeg"),
            "left": ("left.jpg", sample_image_bytes, "image/jpeg"),
            "right": ("right.jpg", sample_image_bytes, "image/jpeg"),
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["submission_id"] != ""


from datetime import date

from app.models import Turtle


def _create_test_submission(client, sample_image_bytes):
    """Helper: create a submission via the identify endpoint."""
    response = client.post(
        "/api/submissions/identify",
        data={"site": "patuxent"},
        files={"top": ("top.jpg", sample_image_bytes, "image/jpeg")},
    )
    return response.json()["submission_id"]


def _create_test_turtle(db):
    """Helper: insert a turtle into the DB."""
    turtle = Turtle(
        external_id="T999",
        name="Test Turtle",
        site="patuxent",
        first_seen=date(2025, 1, 1),
    )
    db.add(turtle)
    db.commit()
    db.refresh(turtle)
    return turtle


def test_confirm_creates_encounter(client, db, sample_image_bytes):
    submission_id = _create_test_submission(client, sample_image_bytes)
    turtle = _create_test_turtle(db)

    response = client.post(
        f"/api/submissions/{submission_id}/confirm",
        json={
            "turtle_id": turtle.id,
            "encounter_data": {
                "date": "2026-03-28",
                "location": "Upper Meadow",
                "setting": ["Woods"],
                "conditions": ["Sunny"],
                "behaviors": ["Basking"],
                "health": "Healthy",
                "observation_notes": "Found near stream",
                "nickname": "Observer1",
                "notify_me": False,
                "email": "",
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "encounter_id" in data


def test_confirm_invalid_submission_returns_404(client):
    response = client.post(
        "/api/submissions/nonexistent/confirm",
        json={
            "turtle_id": 1,
            "encounter_data": {
                "date": "2026-03-28",
                "location": "",
                "health": "",
                "observation_notes": "",
                "nickname": "",
                "email": "",
            },
        },
    )
    assert response.status_code == 404


def test_new_turtle_creates_turtle_and_encounter(client, db, sample_image_bytes):
    submission_id = _create_test_submission(client, sample_image_bytes)

    response = client.post(
        f"/api/submissions/{submission_id}/new-turtle",
        json={
            "nickname": "Shelly",
            "site": "patuxent",
            "encounter_data": {
                "date": "2026-03-28",
                "location": "Lower Field",
                "setting": ["Field"],
                "conditions": ["Cloudy"],
                "behaviors": ["Locomoting"],
                "health": "Healthy",
                "observation_notes": "New individual",
                "nickname": "Observer2",
                "notify_me": True,
                "email": "obs@example.com",
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "turtle_id" in data
