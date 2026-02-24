# No Match Page — Design Spec
Date: 2026-02-23

## Overview

When the identification algorithm finds no matching turtle, or the user confirms none of the possible matches are their turtle, they land on the No Match flow. This is a two-screen flow: a result screen that orients the user, and a submission form to report a potentially new turtle.

---

## Screen 1 — No Match Found

**Purpose:** Communicate the no-match result clearly and give the user a choice of next steps.

**Layout:**
- Back arrow + site name in the header (consistent with other pages)
- Large heading: "No Match Found"
- Brief message: "This turtle doesn't appear to be in our database. It may be a new individual that hasn't been documented yet."
- Secondary option (ghost button / text link, lower visual weight): **"Retake Photos"** → navigates back to InstructionPage
- Primary CTA button: **"Submit as New Turtle"** → navigates to Screen 2

---

## Screen 2 — Submit New Turtle

**Purpose:** Collect enough information for researchers to review and register a potentially new turtle.

**Layout:**
- Back arrow + "Submit New Turtle" as the page title
- **Photos section** — read-only thumbnails of the top/left/right photos already taken

**Form fields (in order):**

| Field | Type | Notes |
|---|---|---|
| Date | Date picker | Defaults to today |
| Location | Text input | Free-form |
| Observed Behavior | Multi-select | Fixed list: basking, foraging, crossing road, nesting, mating, other |
| Health | Single select | Fixed list: healthy, injured, lethargic, shell damage, unknown |
| General Notes | Textarea | Free-form observations |
| Suggested Nickname | Text input | Optional |
| Notify me about this turtle | Checkbox | When checked, reveals an email input field below |
| Email (conditional) | Email input | Only visible when checkbox is checked |

**Submit button:** "Submit for Review" — primary button at the bottom. For now logs to console; Airtable wiring deferred.

---

## Navigation

```
InstructionPage
    └─► NoMatchPage (Screen 1)
            ├─► InstructionPage ("Retake Photos")
            └─► NewTurtleSubmissionPage (Screen 2)
                    └─► InstructionPage (after submit, or back)
```

---

## Out of Scope (deferred)

- Airtable submission logic
- Email notification backend
- GPS auto-detection for location field
