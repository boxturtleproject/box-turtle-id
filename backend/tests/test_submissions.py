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
