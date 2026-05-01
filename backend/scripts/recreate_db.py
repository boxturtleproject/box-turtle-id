"""Drop & recreate all tables. Dev only — destroys data."""
import sys

from app.database import Base, engine, create_tables
# Import all models so they register with Base.metadata
from app.models import (  # noqa: F401
    Turtle, Capture, MatchResult, Encounter, Survey, Plot,
    Submission, Job, Setting,
)


def main():
    if "--yes" not in sys.argv:
        print("This will DROP all tables. Pass --yes to confirm.")
        sys.exit(1)
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating tables...")
    create_tables()
    print("Done.")


if __name__ == "__main__":
    main()
