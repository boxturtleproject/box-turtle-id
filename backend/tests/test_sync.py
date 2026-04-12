from unittest.mock import patch
from datetime import date

from app.models import Turtle
from app.services.airtable import AirtableSyncService


def test_sync_service_init_without_credentials(db):
    service = AirtableSyncService(db)
    assert service.enabled is False


def test_sync_service_init_with_credentials(db):
    with patch.object(AirtableSyncService, "__init__", lambda self, db: None):
        pass
    # Patch settings to have credentials
    from app.config import settings
    orig = (settings.airtable_token, settings.airtable_base_id,
            settings.airtable_turtles_table, settings.airtable_encounters_table)
    try:
        settings.airtable_token = "fake_token"
        settings.airtable_base_id = "fake_base"
        settings.airtable_turtles_table = "Turtles"
        settings.airtable_encounters_table = "Encounters"
        service = AirtableSyncService(db)
        assert service.enabled is True
    finally:
        (settings.airtable_token, settings.airtable_base_id,
         settings.airtable_turtles_table, settings.airtable_encounters_table) = orig


def test_push_turtle_builds_correct_payload(db):
    turtle = Turtle(
        external_id="T001",
        name="Shelly",
        site="patuxent",
        gender="Female",
        first_seen=date(2025, 6, 15),
    )
    db.add(turtle)
    db.commit()
    db.refresh(turtle)

    service = AirtableSyncService(db)
    payload = service._build_turtle_payload(turtle)

    assert payload["Turtle ID"] == "T001"
    assert payload["Name"] == "Shelly"
    assert payload["Gender"] == "Female"
    assert payload["Date First Identified"] == "2025-06-15"
