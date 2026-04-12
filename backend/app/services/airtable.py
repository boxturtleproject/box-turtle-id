import logging
from datetime import datetime
from typing import Optional

import requests
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Encounter, Turtle

logger = logging.getLogger(__name__)

AIRTABLE_API = "https://api.airtable.com/v0"


class AirtableSyncService:
    def __init__(self, db: Session):
        self.db = db
        self.token = settings.airtable_token
        self.base_id = settings.airtable_base_id
        self.turtles_table = settings.airtable_turtles_table
        self.encounters_table = settings.airtable_encounters_table
        self.enabled = all([self.token, self.base_id, self.turtles_table, self.encounters_table])

    @property
    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    def _table_url(self, table: str) -> str:
        return f"{AIRTABLE_API}/{self.base_id}/{table}"

    def _build_turtle_payload(self, turtle: Turtle) -> dict:
        fields = {
            "Turtle ID": turtle.external_id,
        }
        if turtle.name:
            fields["Name"] = turtle.name
        if turtle.gender:
            fields["Gender"] = turtle.gender
        if turtle.first_seen:
            fields["Date First Identified"] = turtle.first_seen.isoformat()
        return fields

    def _build_encounter_payload(self, encounter: Encounter) -> dict:
        fields = {}
        if encounter.encounter_date:
            fields["Date"] = encounter.encounter_date.strftime("%Y-%m-%d")
        if encounter.plot_name:
            fields["Plot Name"] = encounter.plot_name
        if encounter.health_status:
            fields["Health Status"] = encounter.health_status
        if encounter.behavior:
            fields["Behavior"] = encounter.behavior
        if encounter.notes:
            fields["Notes"] = encounter.notes
        if encounter.identified:
            fields["Identified"] = encounter.identified
        # Link to turtle via Airtable record ID
        turtle = self.db.query(Turtle).filter(Turtle.id == encounter.turtle_id).first()
        if turtle and turtle.airtable_record_id:
            fields["Turtle ID"] = [turtle.airtable_record_id]
        return fields

    async def push_turtle(self, turtle_id: int) -> Optional[str]:
        if not self.enabled:
            return None

        turtle = self.db.query(Turtle).filter(Turtle.id == turtle_id).first()
        if not turtle:
            return None

        fields = self._build_turtle_payload(turtle)

        try:
            if turtle.airtable_record_id:
                url = f"{self._table_url(self.turtles_table)}/{turtle.airtable_record_id}"
                resp = requests.patch(url, json={"fields": fields}, headers=self._headers)
                resp.raise_for_status()
            else:
                url = self._table_url(self.turtles_table)
                resp = requests.post(url, json={"fields": fields}, headers=self._headers)
                resp.raise_for_status()
                turtle.airtable_record_id = resp.json()["id"]

            turtle.last_synced_at = datetime.now()
            self.db.commit()
            return turtle.airtable_record_id

        except requests.RequestException as e:
            logger.error(f"Failed to push turtle {turtle_id} to Airtable: {e}")
            return None

    async def push_encounter(self, encounter_id: int) -> Optional[str]:
        if not self.enabled:
            return None

        encounter = self.db.query(Encounter).filter(Encounter.id == encounter_id).first()
        if not encounter:
            return None

        fields = self._build_encounter_payload(encounter)

        try:
            if encounter.airtable_record_id:
                url = f"{self._table_url(self.encounters_table)}/{encounter.airtable_record_id}"
                resp = requests.patch(url, json={"fields": fields}, headers=self._headers)
                resp.raise_for_status()
            else:
                url = self._table_url(self.encounters_table)
                resp = requests.post(url, json={"fields": fields}, headers=self._headers)
                resp.raise_for_status()
                encounter.airtable_record_id = resp.json()["id"]

            encounter.last_synced_at = datetime.now()
            self.db.commit()
            return encounter.airtable_record_id

        except requests.RequestException as e:
            logger.error(f"Failed to push encounter {encounter_id} to Airtable: {e}")
            return None

    async def pull_all_turtles(self) -> dict:
        if not self.enabled:
            return {"created": 0, "updated": 0}

        created = 0
        updated = 0
        offset = None

        while True:
            params = {}
            if offset:
                params["offset"] = offset

            try:
                resp = requests.get(
                    self._table_url(self.turtles_table),
                    headers=self._headers,
                    params=params,
                )
                resp.raise_for_status()
                data = resp.json()
            except requests.RequestException as e:
                logger.error(f"Failed to pull turtles from Airtable: {e}")
                break

            for record in data.get("records", []):
                fields = record["fields"]
                record_id = record["id"]

                existing = self.db.query(Turtle).filter(
                    Turtle.airtable_record_id == record_id
                ).first()

                if existing:
                    if fields.get("Turtle ID"):
                        existing.external_id = fields["Turtle ID"]
                    if fields.get("Name"):
                        existing.name = fields["Name"]
                    if fields.get("Gender"):
                        existing.gender = fields["Gender"]
                    if fields.get("Date First Identified"):
                        from datetime import date as date_type
                        try:
                            existing.first_seen = date_type.fromisoformat(
                                fields["Date First Identified"]
                            )
                        except ValueError:
                            pass
                    existing.last_synced_at = datetime.now()
                    updated += 1
                else:
                    from datetime import date as date_type
                    first_seen = date_type.today()
                    if fields.get("Date First Identified"):
                        try:
                            first_seen = date_type.fromisoformat(fields["Date First Identified"])
                        except ValueError:
                            pass

                    turtle = Turtle(
                        external_id=fields.get("Turtle ID", f"AT-{record_id[:8]}"),
                        name=fields.get("Name"),
                        gender=fields.get("Gender"),
                        first_seen=first_seen,
                        airtable_record_id=record_id,
                        last_synced_at=datetime.now(),
                    )
                    self.db.add(turtle)
                    created += 1

            self.db.commit()

            offset = data.get("offset")
            if not offset:
                break

        return {"created": created, "updated": updated}

    async def pull_all_encounters(self) -> dict:
        if not self.enabled:
            return {"created": 0, "updated": 0}

        created = 0
        updated = 0
        offset = None

        while True:
            params = {}
            if offset:
                params["offset"] = offset

            try:
                resp = requests.get(
                    self._table_url(self.encounters_table),
                    headers=self._headers,
                    params=params,
                )
                resp.raise_for_status()
                data = resp.json()
            except requests.RequestException as e:
                logger.error(f"Failed to pull encounters from Airtable: {e}")
                break

            for record in data.get("records", []):
                fields = record["fields"]
                record_id = record["id"]

                existing = self.db.query(Encounter).filter(
                    Encounter.airtable_record_id == record_id
                ).first()

                if existing:
                    existing.last_synced_at = datetime.now()
                    updated += 1
                else:
                    # Try to link to a turtle
                    turtle_id = None
                    linked_records = fields.get("Turtle ID", [])
                    if linked_records:
                        turtle = self.db.query(Turtle).filter(
                            Turtle.airtable_record_id == linked_records[0]
                        ).first()
                        if turtle:
                            turtle_id = turtle.id

                    if turtle_id is None:
                        continue

                    enc_date = None
                    if fields.get("Date"):
                        try:
                            enc_date = datetime.strptime(fields["Date"], "%Y-%m-%d")
                        except ValueError:
                            pass

                    encounter = Encounter(
                        turtle_id=turtle_id,
                        encounter_date=enc_date,
                        health_status=fields.get("Health Status"),
                        behavior=fields.get("Behavior"),
                        notes=fields.get("Notes"),
                        identified=fields.get("Identified"),
                        airtable_record_id=record_id,
                        last_synced_at=datetime.now(),
                    )
                    self.db.add(encounter)
                    created += 1

            self.db.commit()

            offset = data.get("offset")
            if not offset:
                break

        return {"created": created, "updated": updated}

    async def full_sync(self) -> dict:
        turtles_result = await self.pull_all_turtles()
        encounters_result = await self.pull_all_encounters()
        return {
            "turtles": turtles_result,
            "encounters": encounters_result,
        }
