# SIFT + embeddings matching

**Goal:** replace today's SIFT-only identify with the matcher that won the turtle-vision field test. It combines SIFT on the Gemini shell crop with image embeddings, adds up the evidence across an encounter's photos, and uses spot-score bands for "new turtle".

**Evidence:** [turtle-vision `analysis/FIELD_TEST.md`](https://github.com/boxturtleproject/turtle-vision/blob/main/analysis/FIELD_TEST.md). On 364 new field photos verified by hand:

| | right first time | right turtle in top 5 |
|---|---:|---:|
| SIFT + embeddings | **90.3%** | **96.6%** |
| SIFT only (shell crop) | 79.5% | 93.8% |
| Embeddings only | 47.7% | 85.8% |
| Encounters with 2+ photos, combined | **100%** (31/31) | |

Spot score (SIFT) separates known from new turtles (AUC 0.88). A cut-off near 1.5 catches 92% of new turtles while naming only 3% of known turtles wrongly.

**Update — improved SIFT scoring** ([turtle-vision `analysis/SIFT_STUDY.md`](https://github.com/boxturtleproject/turtle-vision/blob/main/analysis/SIFT_STUDY.md)). Counting only *mutual* matches of *RootSIFT* descriptors (ratio 0.8, score normalised by √(keypoints × keypoints)) on the same photos:

| | right first time | right turtle in top 5 |
|---|---:|---:|
| SIFT + embeddings, improved SIFT | **96.0%** | **98.3%** |
| SIFT only, improved | 90.9% | 95.5% |
| Different-day reference test (534), SIFT + embeddings | 85.2% → **88.6%** | 92.5% → 94.6% |

Same keypoints and speed; the stored uint8 descriptors are reused (RootSIFT is computed at index build). Known-vs-new separation rises to AUC 0.95, and the spot-score bands below were re-set for the new scale. With box-turtle-id's own pipeline on 30 field photos and real Gemini: 29/30 right first time (was 27/30), 30/30 in the top 5.

## How today's identify differs

`backend/app/api/submissions.py`:

1. **Reference SIFT features come from the whole photo** at 250px (`airtable.py` sync). Queries are cropped with `CropperService`, but its YOLO weights aren't in the repo, so it falls back to threshold cropping.
2. **A query photo is compared only with captures of the same `image_type`.** In testing, comparing against every view was as good or better (0.811 vs 0.807 top-1).
3. **Several submitted photos are combined by the best single score per turtle.** Adding up the evidence across photos is what took multi-photo encounters to 100%.
4. **There are no embeddings,** and the "new turtle" decision is `score < acceptance_threshold (4)`. That cut-off is too strict: it calls 65% of known turtles new.

## Design

### Matching pipeline, per photo
1. **Shell box:** Gemini (`gemini-3.6-flash`, 640px, minimal thinking; retry at full size with low thinking if no shell is found) returns `[ymin, xmin, ymax, xmax]` on a 0–1000 scale. No shell found means "no turtle in this photo".
2. **Crops:**
   - shell crop: the box plus a 5% margin
   - tight crop: the central 1/√2 of the box
3. **SIFT** on the shell crop at 250px wide, scored against **every** reference shell crop: RootSIFT descriptors, a pair counts only when each is the other's nearest neighbour and both pass the ratio test at 0.8; score = mutual matches / √(keypoints in both) × 100.
4. **Embeddings:** `gemini-embedding-2-preview` (3072 dimensions) of the shell crop and the tight crop.
5. **Embedding similarity:** for each crop variant, project with PCA (128) then LDA fitted on the reference captures, using `turtle_id` as the label. The similarity is the average of the two variants' cosine similarities.
6. **Fuse per turtle:** `log(1 + best SIFT score) + best embedding similarity`.
7. **Spot score** = the best SIFT score of the top turtle.

### Encounter (several photos)
- Add up each turtle's fused score across the submitted photos.
- Spot score = the best SIFT score for that turtle across the photos.
- With 2+ photos, "check" starts at 1.5 instead of 1.2, because more photos give a new turtle more chances to match one known turtle by luck (the best of two new-turtle photos reaches 1.2 7% of the time vs 3.5% for one; none reached 1.5).

### Result bands
Shown on the possible-match page:

| spot score | band | meaning |
|---|---|---|
| ≥ 2 | **Match** | field test: 127 known turtles, all named right; no new turtles |
| 1.2–2 (1.5–2 with 2+ photos) | **Check** | "Is this Cruella?", with the top 5 to compare; field: 22 known (all right), 5 new |
| < 1.2 | **Possibly new** | catches 96.5% of new turtles; still show the top 5, then the new-turtle flow |

## Changes

### Data model
- `Capture.shell_box` (JSON, nullable): the Gemini box.
- `Capture.crop_keypoints_data` / `crop_descriptors_data`: SIFT on the shell crop. Keep the whole-photo columns so the old matcher stays available.
- New table `capture_embeddings`: `(capture_id FK, variant 'crop'|'tight', model, dim, vector LargeBinary float32, created_at)`, unique on `(capture_id, variant, model)`.
- Store crop derivatives next to `display`, at `captures/derivatives/crop/{id}.jpg`, for review and visualisation.

### Services (`backend/app/services/`)
- `shellcrop.py`: Gemini box detection and crop helpers. Port from turtle-vision `shellcrop.py`.
- `embeddings.py`: Gemini embedding client, using Vertex or an API key from env.
- `matcher.py`:
  - in-memory reference index: SIFT crop features, PCA→LDA projections per variant, turtle labels
  - `fuse()`, `identify(photos) -> ranked turtles + spot`
  - fitted at startup, refitted after captures change (seconds for ~1k captures)
  - port from turtle-vision `matching.py` and `sift_match.py`

### Backfill
`backend/scripts/backfill_matching.py`, run as a `Job` so admin can see progress. For every capture except `site_view`:

1. shell box
2. crops
3. crop SIFT
4. two embeddings

Resume-safe. Roughly 1,000–1,500 captures: about 15 minutes, under $1.

### API
- `/submissions/identify`:
  - photos run in parallel through the per-photo pipeline (box → SIFT and embeddings)
  - compare against every capture at the site, any view
  - combine across top/left/right
  - response adds `spot_score`, `band`, `likelihood`, per-candidate `fused_score`, and the reference thumbnails for the top 5
  - `likelihood` = % of top picks that were right at that spot score on the field photos (`matcher.LIKELIHOOD`): under 0.8 ~5%, 0.8–1 ~15%, 1–1.2 ~30%, 1.2–1.5 ~45% (~30% with 2+ photos), 1.5–2 ~95%, 2–3 ~97%, 3+ ~98% (cap). Show it beside the spot score, e.g. "Match: Cruella · spot 3.4 · ~98% likely"; refit the low rows from confirmed submissions
- `confirm` / `new-turtle`: compute and store box, crops, SIFT and embeddings for the new captures, then trigger a matcher refit.
- **Feature flag** `MATCHER=sift|fused` (default `sift` until validated).
- **Shadow mode:** compute both and log them, so production photos can be compared before switching.

### Frontend
- Possible-match page shows the band:
  - Match: today's flow
  - Check: confirm against the top 5
  - Possibly new: show the top 5, then a "none of these, new turtle" path
- Encourage 3–5 photos per encounter: top, left, right.

### Config (Railway)
- `GOOGLE_GENAI_USE_VERTEXAI`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, plus credentials (service-account JSON), or `GEMINI_API_KEY`.
- `CROP_MODEL` (default `gemini-3.6-flash`).
- New deps: `google-genai`, `scikit-learn`, `pillow-heif` (HEIC uploads).

## Rollout
1. Backend services, data model and backfill, with the flag off.
2. Shadow mode in production: log both matchers for a few weeks of real submissions.
3. Compare them with the turtle-vision evaluation (`analysis/field_results.py`, ported to read the shadow log).
4. Flip `MATCHER=fused`, then update the frontend bands.

## Latency and cost
- Per photo: Gemini box ~1.3s, then SIFT (~1s against ~1k captures) and two embeddings (~2.3s) in parallel. About 3.5–4s per photo; several photos run in parallel.
- Per photo: one box call plus two embedding calls, well under a cent.
- If Gemini is unavailable, fall back to today's SIFT-only path (threshold crop).

## Risks and open questions
- **Gemini dependency:** a self-hosted turtle detector (for example a YOLO model trained on the ~1k Gemini boxes from the backfill) could replace the box call later.
- **LDA needs labelled references:** turtles with one capture contribute little. Coverage drives accuracy: Glyph, Emoji, Jazzy and Lotus have few references and did worst.
- **Data cleanup to do first:** byte-identical photos filed under different dates (66 sets); Cruella #719 is the same photo as Jigsaw #801; D.E.P./Spikey and Flower/Sunflower may be duplicate identities. With the improved SIFT, 34 *different* Jigsaw and Cruella photos match each other strongly (and 9 Flower/Sunflower), so Jigsaw and Cruella are very likely the same turtle.
- **Site scoping:** today's identify filters to the submitted site. Keep that, since references are per site.
- **New turtles:** 45% of the field-test photos were new individuals. Batch-adding the verified ones (turtle-vision `analysis/new_turtles.py` groups them) is the fastest coverage win.
