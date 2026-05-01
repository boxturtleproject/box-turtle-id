"""Bidirectional Airtable sync service."""
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
import requests as _requests
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Capture, Encounter, Plot, Survey, Turtle
from app.services.airtable_client import AirtableClient
from app.services.sift import SiftService
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

    # ---------- Image attachments ----------

    ATTACHMENT_FIELDS_TURTLE = [
        "Carapace Top", "Carapace Left", "Carapace Right",
        "Plastron", "Front", "Rear",
    ]
    ATTACHMENT_FIELDS_ENCOUNTER = [
        "Carapace Top", "Carapace Left", "Carapace Right",
        "Plastron", "Front", "Back", "Site View",
    ]
    IPHONE_NAME_RE = re.compile(r"(\d{4})-(\d{2})-(\d{2})\s+(\d{2})\.(\d{2})\.(\d{2})")

    def _parse_filename_datetime(self, filename: str) -> Optional[datetime]:
        m = self.IPHONE_NAME_RE.search(filename or "")
        if not m:
            return None
        try:
            y, mo, d, h, mi, s = (int(x) for x in m.groups())
            return datetime(y, mo, d, h, mi, s)
        except ValueError:
            return None

    def _import_attachment(
        self, attachment: dict, image_type: str, *,
        turtle_id: Optional[int] = None, encounter_id: Optional[int] = None,
        sift: Optional[SiftService] = None,
        seen_att_ids: Optional[set] = None,
    ) -> Optional[Capture]:
        att_id = attachment["id"]
        if seen_att_ids is not None and att_id in seen_att_ids:
            return None
        if self.db.query(Capture).filter(Capture.airtable_attachment_id == att_id).first():
            if seen_att_ids is not None:
                seen_att_ids.add(att_id)
            return None  # already imported

        filename = attachment.get("filename", f"{att_id}.jpg")
        url = attachment["url"]
        try:
            content = _requests.get(url, timeout=60).content
        except _requests.RequestException as e:
            logger.error(f"download failed for {att_id}: {e}")
            return None

        subdir = "turtles" if turtle_id else "encounters"
        owner_id = turtle_id or encounter_id
        out_dir = settings.data_dir / "captures" / subdir / str(owner_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{att_id}_{filename}"
        out_path.write_bytes(content)

        # SIFT extraction — skip context shots (Site View) and resize to keep blobs sane
        kp_blob = desc_blob = None
        kp_count = 0
        if sift and image_type not in ("Site View",):
            arr = np.frombuffer(content, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is not None:
                h, w = img.shape[:2]
                if w > settings.resized_width:
                    new_h = int(h * settings.resized_width / w)
                    img = cv2.resize(img, (settings.resized_width, new_h),
                                     interpolation=cv2.INTER_AREA)
                feat = sift.extract_features(img)
                if feat:
                    kp_blob, desc_blob = feat.serialize()
                    kp_count = feat.keypoint_count

        captured_dt = self._parse_filename_datetime(filename)
        cap = Capture(
            turtle_id=turtle_id,
            encounter_id=encounter_id,
            image_type=image_type.lower().replace(" ", "_"),
            image_path=str(out_path),
            original_filename=filename,
            captured_date=captured_dt.date() if captured_dt else None,
            exif_datetime=captured_dt,
            keypoints_data=kp_blob,
            descriptors_data=desc_blob,
            keypoint_count=kp_count,
            airtable_attachment_id=att_id,
            airtable_field_name=image_type,
            source="airtable",
            last_synced_at=datetime.now(),
        )
        self.db.add(cap)
        try:
            self.db.flush()
        except IntegrityError:
            self.db.rollback()
            if seen_att_ids is not None:
                seen_att_ids.add(att_id)
            return None
        if seen_att_ids is not None:
            seen_att_ids.add(att_id)
        return cap

    def pull_attachments(self, with_sift: bool = True) -> dict:
        sift = SiftService() if with_sift else None
        new_turtle_caps = new_enc_caps = 0

        # Pre-load all attachment IDs already in the DB to dedup fast
        seen_att_ids = {row[0] for row in self.db.query(Capture.airtable_attachment_id)
                        .filter(Capture.airtable_attachment_id.isnot(None)).all()}

        # Build {airtable_record_id -> Turtle} index
        t_idx = {t.airtable_record_id: t for t in self.db.query(Turtle)
                 .filter(Turtle.airtable_record_id.isnot(None)).all()}
        for rec in self.client.iter_records(
            self.tables["turtles"], fields=self.ATTACHMENT_FIELDS_TURTLE,
        ):
            t = t_idx.get(rec["id"])
            if not t:
                continue
            for field in self.ATTACHMENT_FIELDS_TURTLE:
                for att in rec["fields"].get(field, []) or []:
                    if not att.get("type", "").startswith("image/"):
                        continue
                    cap = self._import_attachment(
                        att, field, turtle_id=t.id, sift=sift, seen_att_ids=seen_att_ids,
                    )
                    if cap is not None:
                        new_turtle_caps += 1
            try:
                self.db.commit()
            except Exception as e:
                logger.error(f"commit failed for turtle {t.external_id}: {e}")
                self.db.rollback()

        e_idx = {e.airtable_record_id: e for e in self.db.query(Encounter)
                 .filter(Encounter.airtable_record_id.isnot(None)).all()}
        for rec in self.client.iter_records(
            self.tables["encounters"], fields=self.ATTACHMENT_FIELDS_ENCOUNTER,
        ):
            e = e_idx.get(rec["id"])
            if not e:
                continue
            for field in self.ATTACHMENT_FIELDS_ENCOUNTER:
                for att in rec["fields"].get(field, []) or []:
                    if not att.get("type", "").startswith("image/"):
                        continue
                    cap = self._import_attachment(
                        att, field, turtle_id=e.turtle_id, encounter_id=e.id, sift=sift,
                        seen_att_ids=seen_att_ids,
                    )
                    if cap is not None:
                        new_enc_caps += 1
            try:
                self.db.commit()
            except Exception as exc:
                logger.error(f"commit failed for encounter {e.external_id}: {exc}")
                self.db.rollback()
        return {"turtle_captures": new_turtle_caps, "encounter_captures": new_enc_caps}

    def extract_sift_for_captures(self, limit: Optional[int] = None) -> dict:
        """Run SIFT on captures that don't have keypoints yet. No network calls."""
        sift = SiftService()
        q = (self.db.query(Capture)
             .filter(Capture.keypoint_count == 0)
             .filter(Capture.image_path.isnot(None)))
        # Skip Site View context shots
        q = q.filter(Capture.image_type != "site_view")
        if limit:
            q = q.limit(limit)
        caps = q.all()
        processed = failed = missing = 0
        for cap in caps:
            path = Path(cap.image_path)
            if not path.exists():
                missing += 1
                continue
            try:
                img = cv2.imread(str(path), cv2.IMREAD_COLOR)
                if img is None:
                    failed += 1
                    continue
                h, w = img.shape[:2]
                if w > settings.resized_width:
                    new_h = int(h * settings.resized_width / w)
                    img = cv2.resize(img, (settings.resized_width, new_h),
                                     interpolation=cv2.INTER_AREA)
                feat = sift.extract_features(img)
                if not feat:
                    failed += 1
                    continue
                kp_blob, desc_blob = feat.serialize()
                cap.keypoints_data = kp_blob
                cap.descriptors_data = desc_blob
                cap.keypoint_count = feat.keypoint_count
                processed += 1
                if processed % 25 == 0:
                    self.db.commit()
                    logger.info(f"SIFT extracted for {processed} captures so far")
            except Exception as e:
                logger.error(f"SIFT failed for capture {cap.id} ({path}): {e}")
                failed += 1
        self.db.commit()
        return {"processed": processed, "failed": failed, "missing_file": missing}

    # ---------- Orchestrators ----------

    def pull_all(self, incremental: bool = False, with_images: bool = True,
                 with_sift: bool = True) -> dict:
        """Full ordered pull: plots → surveys → turtles → encounters → attachments."""
        out = {}
        out["plots"] = self.pull_plots(incremental=incremental)
        out["surveys"] = self.pull_surveys(incremental=incremental)
        out["turtles"] = self.pull_turtles(incremental=incremental)
        out["encounters"] = self.pull_encounters(incremental=incremental)
        if with_images:
            out["attachments"] = self.pull_attachments(with_sift=with_sift)
        return out

    # ---------- Push (local → Airtable) ----------

    def push_new_turtles(self) -> dict:
        pushed = 0
        for t in self.db.query(Turtle).filter(Turtle.airtable_record_id.is_(None)).all():
            fields = {"Turtle ID": t.external_id}
            if t.nickname or t.name:
                fields["Nickname"] = t.nickname or t.name
            if t.gender:
                fields["Gender"] = t.gender
            if t.first_seen:
                fields["Date First Identified"] = t.first_seen.isoformat()
            if t.notes:
                fields["Notes"] = t.notes
            if t.species:
                fields["Species"] = t.species
            created = self.client.create_record(self.tables["turtles"], fields)
            if created:
                t.airtable_record_id = created["id"]
                t.last_synced_at = datetime.now()
                pushed += 1
                self.db.commit()
        return {"pushed": pushed}

    def push_new_encounters(self) -> dict:
        pushed = 0
        for e in self.db.query(Encounter).filter(Encounter.airtable_record_id.is_(None)).all():
            turtle = self.db.query(Turtle).filter(Turtle.id == e.turtle_id).first()
            if not turtle or not turtle.airtable_record_id:
                continue  # turtle hasn't been pushed yet — skip this round
            fields = {"Turtle ID": [turtle.airtable_record_id]}
            if e.encounter_date:
                fields["Date"] = e.encounter_date.isoformat()
            if e.identified:
                fields["Identified"] = e.identified
            if e.health_status:
                fields["Health Status"] = [s.strip() for s in e.health_status.split(",") if s.strip()]
            if e.behavior:
                fields["Behavior"] = [s.strip() for s in e.behavior.split(",") if s.strip()]
            if e.notes:
                fields["Notes"] = e.notes
            created = self.client.create_record(self.tables["encounters"], fields)
            if created:
                e.airtable_record_id = created["id"]
                e.last_synced_at = datetime.now()
                pushed += 1
                self.db.commit()
                self._push_captures_for_encounter(e)
        return {"pushed": pushed}

    def _push_captures_for_encounter(self, encounter: Encounter) -> int:
        if not encounter.airtable_record_id:
            return 0
        n = 0
        caps = (self.db.query(Capture)
                .filter(Capture.encounter_id == encounter.id)
                .filter(Capture.airtable_attachment_id.is_(None))
                .filter(Capture.source == "app")
                .all())
        for cap in caps:
            field_name = (cap.airtable_field_name
                          or cap.image_type.replace("_", " ").title())
            try:
                file_bytes = Path(cap.image_path).read_bytes()
            except OSError:
                continue
            uploaded = self.client.upload_attachment(
                encounter.airtable_record_id, field_name,
                cap.original_filename, "image/jpeg", file_bytes,
            )
            if uploaded:
                attachments = uploaded.get("fields", {}).get(field_name, [])
                if attachments:
                    cap.airtable_attachment_id = attachments[-1].get("id")
                    cap.last_synced_at = datetime.now()
                    self.db.commit()
                    n += 1
        return n

    def push_all(self) -> dict:
        return {
            "turtles": self.push_new_turtles(),
            "encounters": self.push_new_encounters(),
        }

    def sync(self, incremental: bool = False, with_images: bool = True,
             with_sift: bool = True) -> dict:
        return {
            "pull": self.pull_all(incremental=incremental, with_images=with_images,
                                  with_sift=with_sift),
            "push": self.push_all(),
        }
