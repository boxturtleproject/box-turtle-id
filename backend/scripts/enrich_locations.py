"""Enrich captures with GPS data from a CSV + matching IMG_*.jpeg directory.

Approach:
1. Compute a perceptual hash (dHash via imagehash) for every IMG_*.jpeg listed
   in the CSV. dHash is robust to resizing and JPEG re-encoding — exactly the
   transformations Airtable applies on upload.
2. Compute the same hash for every DB capture's local image_path.
3. For each CSV row, find the closest DB capture by Hamming distance. Reject
   matches above MAX_DIST (likely-not-the-same-photo) and record one-to-one
   so the same capture can't be claimed by two CSV rows.
4. Apply latitude / longitude / altitude / exif_datetime from the CSV onto
   the matched capture.

Usage:
    python -m scripts.enrich_locations \\
        --csv ../locations.csv \\
        --dir turtle-locations \\
        --dry-run        # report match quality without writing
    python -m scripts.enrich_locations --csv ../locations.csv --dir turtle-locations
"""
import argparse
import csv
import json
import logging
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from typing import Optional

import imagehash
from PIL import Image

from app.database import SessionLocal
from app.models import Capture

# Hamming distance threshold above which we treat a match as a non-match.
# dHash returns 0..64; identical-content images typically score 0–4 even after
# heavy resizing, related-but-different photos score 15+.
MAX_DIST = 10

logger = logging.getLogger(__name__)


def hash_image(path: Path) -> Optional[imagehash.ImageHash]:
    try:
        with Image.open(path) as im:
            im = im.convert("RGB")
            return imagehash.dhash(im, hash_size=8)
    except Exception as e:
        logger.warning(f"hash failed for {path}: {e}")
        return None


def parse_csv_timestamp(s: str) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.strptime(s[:19], "%Y:%m:%d %H:%M:%S")
    except ValueError:
        return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, type=Path,
                        help="CSV with columns: filename, latitude, longitude, altitude_m, gps_timestamp_utc")
    parser.add_argument("--dir", required=True, type=Path,
                        help="Directory holding the IMG_*.jpeg files referenced by the CSV")
    parser.add_argument("--max-dist", type=int, default=MAX_DIST,
                        help=f"Reject matches with Hamming distance above this (default {MAX_DIST})")
    parser.add_argument("--dry-run", action="store_true",
                        help="Report match quality without writing to the DB")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    if not args.csv.exists():
        print(f"CSV not found: {args.csv}", file=sys.stderr)
        return 1
    if not args.dir.is_dir():
        print(f"Image directory not found: {args.dir}", file=sys.stderr)
        return 1

    # Load CSV
    with open(args.csv) as f:
        csv_rows = list(csv.DictReader(f))
    print(f"CSV rows: {len(csv_rows)}", flush=True)

    # Hash CSV-referenced images
    print(f"hashing {len(csv_rows)} CSV images...", flush=True)
    t0 = time.time()
    csv_hashes: list[tuple[dict, imagehash.ImageHash, Path]] = []
    missing_files = 0

    def _hash_csv(row):
        p = args.dir / row["filename"]
        if not p.exists():
            return (row, None, p)
        return (row, hash_image(p), p)

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for row, h, p in pool.map(_hash_csv, csv_rows):
            if h is None:
                missing_files += 1
            else:
                csv_hashes.append((row, h, p))
    print(f"  hashed {len(csv_hashes)} CSV images in {time.time()-t0:.1f}s "
          f"({missing_files} missing/unreadable)", flush=True)

    # Hash all DB captures
    db = SessionLocal()
    captures = (db.query(Capture)
                .filter(Capture.image_path.isnot(None))
                .all())
    print(f"hashing {len(captures)} DB captures...", flush=True)
    t0 = time.time()
    db_hashes: list[tuple[Capture, imagehash.ImageHash]] = []
    for_hash = []
    for cap in captures:
        p = Path(cap.image_path)
        if p.exists():
            for_hash.append((cap, p))
    print(f"  {len(for_hash)} of {len(captures)} have local files", flush=True)

    def _hash_db(item):
        cap, p = item
        return (cap, hash_image(p))

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for cap, h in pool.map(_hash_db, for_hash):
            if h is not None:
                db_hashes.append((cap, h))
    print(f"  hashed {len(db_hashes)} DB images in {time.time()-t0:.1f}s", flush=True)

    if not db_hashes:
        print("no DB captures with local files to match against", file=sys.stderr)
        return 1

    # For each CSV row, find the best DB match. Maintain one-to-one mapping by
    # tracking already-claimed captures.
    claimed: set[int] = set()
    matched: list[tuple[dict, Capture, int]] = []  # (csv_row, capture, distance)
    no_match = []
    over_threshold = []

    for row, qh, _p in csv_hashes:
        best_cap = None
        best_dist = 999
        for cap, dh in db_hashes:
            if cap.id in claimed:
                continue
            d = qh - dh  # Hamming distance
            if d < best_dist:
                best_dist = d
                best_cap = cap
        if best_cap is None:
            no_match.append(row)
        elif best_dist > args.max_dist:
            over_threshold.append((row, best_cap, best_dist))
        else:
            matched.append((row, best_cap, best_dist))
            claimed.add(best_cap.id)

    # Distance distribution
    dists = sorted(d for _, _, d in matched)
    print()
    print(f"matched: {len(matched)} / {len(csv_hashes)}")
    if dists:
        print(f"  distance distribution: min={dists[0]} median={dists[len(dists)//2]} max={dists[-1]}")
        buckets = {b: sum(1 for d in dists if d <= b) for b in (0, 2, 4, 6, 8, 10)}
        print(f"  cumulative: {buckets}")
    print(f"over threshold (>{args.max_dist}, treated as no-match): {len(over_threshold)}")
    if over_threshold[:5]:
        print("  examples:")
        for row, cap, d in over_threshold[:5]:
            print(f"    {row['filename']} → cap {cap.id} ({cap.original_filename}) dist={d}")
    print(f"no candidate at all: {len(no_match)}")

    if args.dry_run:
        print("\n[dry-run] not writing to DB")
        return 0

    # Apply enrichments
    updated = 0
    for row, cap, _d in matched:
        try:
            cap.latitude = float(row["latitude"]) if row.get("latitude") else cap.latitude
            cap.longitude = float(row["longitude"]) if row.get("longitude") else cap.longitude
            ts = parse_csv_timestamp(row.get("gps_timestamp_utc", ""))
            if ts:
                cap.exif_datetime = ts
            updated += 1
        except (ValueError, TypeError) as e:
            logger.warning(f"failed to apply row {row.get('filename')} to cap {cap.id}: {e}")
    db.commit()
    print(f"\nupdated {updated} captures")
    print(json.dumps({
        "csv_rows": len(csv_rows),
        "csv_hashed": len(csv_hashes),
        "db_hashed": len(db_hashes),
        "matched": len(matched),
        "updated": updated,
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
