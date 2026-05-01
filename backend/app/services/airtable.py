"""Bidirectional Airtable sync service."""
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Encounter, Plot, Survey, Turtle
from app.services.airtable_client import AirtableClient
from app.services.sync_state import get_cursor, set_cursor

logger = logging.getLogger(__name__)


def _join_multi(val) -> Optional[str]:
    if val is None:
        return None
    if isinstance(val, list):
        return ", ".join(str(v) for v in val) or None
    return str(val)


def _parse_date(val) -> Optional[datetime]:
    if not val:
        return None
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


class AirtableSync:
    def __init__(self, db: Session, dry_run: bool = False):
        self.db = db
        self.client = AirtableClient(dry_run=dry_run)
        self.dry_run = dry_run
        from app.config import settings
        self.tables = {
            "plots": settings.airtable_plots_table,
            "turtles": settings.airtable_turtles_table,
            "surveys": settings.airtable_surveys_table,
            "encounters": settings.airtable_encounters_table,
        }

    # ---------- Plots ----------

    def pull_plots(self, incremental: bool = False) -> dict:
        cursor = get_cursor(self.db, "plots") if incremental else None
        created = updated = 0
        for rec in self.client.iter_records(self.tables["plots"], modified_since=cursor):
            rid = rec["id"]
            f = rec["fields"]
            existing = self.db.query(Plot).filter(Plot.airtable_record_id == rid).first()
            if existing:
                existing.name = f.get("Plot Location", existing.name)
                existing.notes = f.get("Notes")
                existing.last_synced_at = datetime.now()
                updated += 1
            else:
                if not f.get("Plot Location"):
                    continue
                self.db.add(Plot(
                    name=f["Plot Location"], notes=f.get("Notes"),
                    airtable_record_id=rid, last_synced_at=datetime.now(),
                ))
                created += 1
        self.db.commit()
        if not self.dry_run:
            set_cursor(self.db, "plots")
        return {"created": created, "updated": updated}

    # ---------- Surveys ----------

    def pull_surveys(self, incremental: bool = False) -> dict:
        cursor = get_cursor(self.db, "surveys") if incremental else None
        created = updated = 0
        for rec in self.client.iter_records(self.tables["surveys"], modified_since=cursor):
            rid = rec["id"]
            f = rec["fields"]
            existing = self.db.query(Survey).filter(Survey.airtable_record_id == rid).first()
            data = dict(
                external_id=f.get("Survey ID"),
                survey_datetime=_parse_date(f.get("Survey Date & Time")),
                temperature=f.get("Temperature"),
                surveyors=_join_multi(f.get("Surveyor")),
                conditions=_join_multi(f.get("Conditions")),
                turtle_day=f.get("Turtle Day"),
                notes=f.get("Notes"),
                last_synced_at=datetime.now(),
            )
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                updated += 1
            else:
                self.db.add(Survey(airtable_record_id=rid, **data))
                created += 1
        self.db.commit()
        if not self.dry_run:
            set_cursor(self.db, "surveys")
        return {"created": created, "updated": updated}

    # ---------- Turtles ----------

    def pull_turtles(self, incremental: bool = False) -> dict:
        cursor = get_cursor(self.db, "turtles") if incremental else None
        created = updated = 0
        for rec in self.client.iter_records(self.tables["turtles"], modified_since=cursor):
            rid = rec["id"]
            f = rec["fields"]
            first_seen = _parse_date(f.get("Date First Identified"))
            data = dict(
                external_id=f.get("Turtle ID") or f"AT-{rid[:8]}",
                name=f.get("Nickname"),
                nickname=f.get("Nickname"),
                site="wallkill",
                first_seen=first_seen.date() if first_seen else datetime.now().date(),
                notes=f.get("Notes"),
                species=f.get("Species"),
                gender=f.get("Gender"),
                pattern=_join_multi(f.get("Pattern")),
                carapace_flare=_join_multi(f.get("Carapace Flare")),
                health_status=f.get("Health Status"),
                residence_status=f.get("Residence Status"),
                identifying_marks=_join_multi(f.get("Identifying Marks")),
                eye_color=_join_multi(f.get("Eye Color")),
                plastron_depression=_join_multi(f.get("Plastron Depression")),
                plots_text=f.get("Plots"),
                last_synced_at=datetime.now(),
            )
            existing = self.db.query(Turtle).filter(Turtle.airtable_record_id == rid).first()
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                updated += 1
            else:
                self.db.add(Turtle(airtable_record_id=rid, **data))
                created += 1
        self.db.commit()
        if not self.dry_run:
            set_cursor(self.db, "turtles")
        return {"created": created, "updated": updated}

    def _turtle_id_for(self, airtable_rid: str) -> Optional[int]:
        t = self.db.query(Turtle).filter(Turtle.airtable_record_id == airtable_rid).first()
        return t.id if t else None

    def _survey_fk_for(self, airtable_rid: str) -> Optional[int]:
        s = self.db.query(Survey).filter(Survey.airtable_record_id == airtable_rid).first()
        return s.id if s else None

    def _plot_fk_for(self, airtable_rid: str) -> Optional[int]:
        p = self.db.query(Plot).filter(Plot.airtable_record_id == airtable_rid).first()
        return p.id if p else None

    # ---------- Encounters ----------

    def pull_encounters(self, incremental: bool = False) -> dict:
        cursor = get_cursor(self.db, "encounters") if incremental else None
        created = updated = skipped = 0
        for rec in self.client.iter_records(self.tables["encounters"], modified_since=cursor):
            rid = rec["id"]
            f = rec["fields"]

            turtle_links = f.get("Turtle ID") or []
            turtle_id = self._turtle_id_for(turtle_links[0]) if turtle_links else None
            if turtle_id is None:
                skipped += 1
                continue

            plot_links = f.get("Plot") or []
            plot_fk = self._plot_fk_for(plot_links[0]) if plot_links else None
            survey_links = f.get("Survey ID") or []
            survey_fk = self._survey_fk_for(survey_links[0]) if survey_links else None

            plot_lookup = f.get("Plot Location (from Plots)") or []
            survey_lookup = f.get("Survey ID (from Survey ID)") or []
            data = dict(
                turtle_id=turtle_id,
                external_id=f.get("Encounter ID"),
                encounter_date=_parse_date(f.get("Date")),
                plot_name=plot_lookup[0] if plot_lookup else None,
                plot_fk=plot_fk,
                survey_id=survey_lookup[0] if survey_lookup else None,
                survey_fk=survey_fk,
                identified=f.get("Identified"),
                health_status=_join_multi(f.get("Health Status")),
                behavior=_join_multi(f.get("Behavior")),
                notes=f.get("Notes"),
                last_synced_at=datetime.now(),
            )
            existing = self.db.query(Encounter).filter(Encounter.airtable_record_id == rid).first()
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                updated += 1
            else:
                self.db.add(Encounter(airtable_record_id=rid, **data))
                created += 1
        self.db.commit()
        if not self.dry_run:
            set_cursor(self.db, "encounters")
        return {"created": created, "updated": updated, "skipped_no_turtle": skipped}
