"""CLI wrapper around AirtableSync."""
import argparse
import json
import logging
import sys

from app.database import SessionLocal
from app.services.airtable import AirtableSync


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync local DB with Airtable.")
    parser.add_argument(
        "action",
        choices=["pull", "push", "sync", "extract-sift"],
        help="pull = Airtable -> local; push = local -> Airtable; sync = pull then push; "
             "extract-sift = run SIFT on captures with no keypoints (no network)",
    )
    parser.add_argument("--tables",
                        help="comma-separated subset of: plots,surveys,turtles,encounters,attachments")
    parser.add_argument("--incremental", action="store_true",
                        help="only fetch records modified since last cursor")
    parser.add_argument("--no-images", action="store_true",
                        help="skip image attachment download during pull")
    parser.add_argument("--no-sift", action="store_true",
                        help="download images but skip SIFT extraction")
    parser.add_argument("--dry-run", action="store_true",
                        help="log writes instead of performing them (push only)")
    parser.add_argument("--limit", type=int, default=None,
                        help="cap the number of captures to process (extract-sift only)")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    db = SessionLocal()
    sync = AirtableSync(db, dry_run=args.dry_run)

    result: dict = {}

    if args.action == "extract-sift":
        result = sync.extract_sift_for_captures(limit=args.limit)
        print(json.dumps(result, indent=2, default=str))
        return 0

    tables = set((args.tables or "plots,surveys,turtles,encounters,attachments").split(","))

    if args.action in ("pull", "sync"):
        if "plots" in tables:      result["plots"] = sync.pull_plots(incremental=args.incremental)
        if "surveys" in tables:    result["surveys"] = sync.pull_surveys(incremental=args.incremental)
        if "turtles" in tables:    result["turtles"] = sync.pull_turtles(incremental=args.incremental)
        if "encounters" in tables: result["encounters"] = sync.pull_encounters(incremental=args.incremental)
        if "attachments" in tables and not args.no_images:
            result["attachments"] = sync.pull_attachments(with_sift=not args.no_sift)

    if args.action in ("push", "sync"):
        result["push"] = sync.push_all()

    print(json.dumps(result, indent=2, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
