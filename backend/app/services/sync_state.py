"""Per-table sync cursor stored in the `settings` table."""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Setting

CURSOR_KEY = "airtable_sync.{table}.cursor"


def get_cursor(db: Session, table: str) -> Optional[str]:
    row = db.query(Setting).filter(Setting.key == CURSOR_KEY.format(table=table)).first()
    return row.value if row else None


def set_cursor(db: Session, table: str, iso_ts: Optional[str] = None) -> None:
    iso_ts = iso_ts or datetime.now(timezone.utc).isoformat()
    key = CURSOR_KEY.format(table=table)
    row = db.query(Setting).filter(Setting.key == key).first()
    if row:
        row.value = iso_ts
    else:
        db.add(Setting(key=key, value=iso_ts))
    db.commit()
