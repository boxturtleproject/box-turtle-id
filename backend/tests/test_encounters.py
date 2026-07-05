from datetime import date, datetime

from app.config import settings
from app.models import Encounter, Turtle

# /api/encounters is a gated (admin) route. Authenticate with whatever the app
# is configured to require; when no password is set the gate is off and these
# credentials are simply ignored.
AUTH = (settings.admin_user, settings.admin_password) if settings.admin_password else None


def _get(client, path, **params):
    return client.get(path, params=params or None, auth=AUTH)


def _seed(db):
    """Two turtles at different sites with encounters spread across years."""
    pat = Turtle(external_id="T001", name="Patty", site="patuxent", first_seen=date(2020, 1, 1))
    wal = Turtle(external_id="T002", name="Wally", site="wallkill", first_seen=date(2020, 1, 1))
    db.add_all([pat, wal])
    db.flush()  # assign ids

    db.add_all([
        Encounter(turtle_id=pat.id, external_id="E-P-2023", encounter_date=datetime(2023, 5, 1)),
        Encounter(turtle_id=pat.id, external_id="E-P-2024", encounter_date=datetime(2024, 6, 1)),
        Encounter(turtle_id=wal.id, external_id="E-W-2024", encounter_date=datetime(2024, 7, 1)),
        Encounter(turtle_id=wal.id, external_id="E-W-2025", encounter_date=datetime(2025, 8, 1)),
        # Null-dated encounter: has no year, should be excluded by any year filter.
        Encounter(turtle_id=wal.id, external_id="E-W-NULL", encounter_date=None),
    ])
    db.commit()
    return pat, wal


def test_encounters_unfiltered_returns_all(client, db):
    _seed(db)
    body = _get(client, "/api/encounters").json()
    assert body["total"] == 5
    assert len(body["items"]) == 5


def test_encounters_filter_by_site(client, db):
    _seed(db)
    body = _get(client, "/api/encounters", site="patuxent").json()
    assert body["total"] == 2
    assert {i["external_id"] for i in body["items"]} == {"E-P-2023", "E-P-2024"}
    assert all(i["site"] == "patuxent" for i in body["items"])


def test_encounters_filter_by_year_excludes_null_dates(client, db):
    _seed(db)
    body = _get(client, "/api/encounters", year=2024).json()
    assert body["total"] == 2
    assert {i["external_id"] for i in body["items"]} == {"E-P-2024", "E-W-2024"}


def test_encounters_filter_by_site_and_year(client, db):
    _seed(db)
    body = _get(client, "/api/encounters", site="wallkill", year=2024).json()
    assert body["total"] == 1
    assert body["items"][0]["external_id"] == "E-W-2024"


def test_encounters_filter_no_matches(client, db):
    _seed(db)
    body = _get(client, "/api/encounters", year=2099).json()
    assert body["total"] == 0
    assert body["items"] == []


def test_encounter_facets_shape(client, db):
    _seed(db)
    facets = _get(client, "/api/encounters/facets").json()
    assert len(facets) == 5

    for f in facets:
        assert set(f) == {"turtle_id", "turtle_external_id", "turtle_name", "site", "year"}

    # Years derived from encounter_date; null date -> null year.
    years = sorted(f["year"] for f in facets if f["year"] is not None)
    assert years == [2023, 2024, 2024, 2025]
    assert any(f["year"] is None for f in facets)

    # Turtle context is carried on each row.
    pat_rows = [f for f in facets if f["site"] == "patuxent"]
    assert pat_rows and all(f["turtle_external_id"] == "T001" for f in pat_rows)
    assert all(f["turtle_name"] == "Patty" for f in pat_rows)


def test_encounter_facets_year_matches_list_filter(client, db):
    """Facet years must agree with what the year filter actually returns."""
    _seed(db)
    facets = _get(client, "/api/encounters/facets").json()
    facet_years = {f["year"] for f in facets if f["year"] is not None}
    for year in facet_years:
        listed = _get(client, "/api/encounters", year=year).json()
        facet_count = sum(1 for f in facets if f["year"] == year)
        assert listed["total"] == facet_count
