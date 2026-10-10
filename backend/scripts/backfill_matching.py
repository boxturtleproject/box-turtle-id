# ABOUTME: Command-line backfill of fused-matcher features (shell box, crop SIFT,
# ABOUTME: embeddings) for every reference capture missing them. Resumable.
"""
    cd backend && python -m scripts.backfill_matching

On Railway, prefer POST /api/admin/matching/backfill (runs inside the service,
where the data volume and bucket credentials are).
"""

import logging
import sys
import time

from app.database import SessionLocal, create_tables
from app.services import gemini, match_features


def main():
    logging.basicConfig(level=logging.INFO)
    if not gemini.configured():
        sys.exit(
            "Gemini is not configured "
            "(GOOGLE_GENAI_USE_VERTEXAI + GOOGLE_CLOUD_PROJECT, or GEMINI_API_KEY)"
        )
    create_tables()
    t0 = time.time()

    def progress(done, failed, total):
        n = done + failed
        if n % 25 == 0 or n == total:
            print(f"  {n}/{total} ({failed} failed) {time.time() - t0:.0f}s", flush=True)

    print(match_features.run_backfill(SessionLocal, progress))


if __name__ == "__main__":
    main()
