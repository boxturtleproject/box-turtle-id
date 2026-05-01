"""Generate thumbnail + display derivatives for captures.

Usage:
    python -m scripts.generate_derivatives                # all unprocessed
    python -m scripts.generate_derivatives --limit 5      # first 5 (smoke test)
    python -m scripts.generate_derivatives --force        # regenerate all
    python -m scripts.generate_derivatives --capture-id 7 # one specific capture
"""
import argparse
import json
import logging
import sys

from app.database import SessionLocal
from app.models import Capture
from app.services.derivatives import DerivativesService


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--force", action="store_true",
                        help="regenerate even if derivatives already exist")
    parser.add_argument("--capture-id", type=int, default=None)
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    db = SessionLocal()
    svc = DerivativesService(db)

    if args.capture_id is not None:
        cap = db.query(Capture).filter(Capture.id == args.capture_id).first()
        if not cap:
            print(f"capture {args.capture_id} not found", file=sys.stderr)
            return 1
        result = svc.generate_for_capture(cap, force=args.force)
        db.commit()
    else:
        result = svc.generate_for_all(force=args.force, limit=args.limit)

    print(json.dumps(result, indent=2, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
