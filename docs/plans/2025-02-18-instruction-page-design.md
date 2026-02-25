# Instruction Page Design
_2025-02-18_

## Overview

Add a photo instruction page between the Welcome page and image submission. Users are guided to photograph their turtle from up to 3 angles before identification. Top view is the primary (required) shot; left and right sides are optional.

## User Flow

```
WelcomePage
  └── "Get Started" button
        └── InstructionPage (new)
              ├── Top View card     → file picker → preview thumbnail
              ├── Left Side card    → file picker → preview thumbnail (optional)
              ├── Right Side card   → file picker → preview thumbnail (optional)
              └── "Identify My Turtle" button (enabled when Top View submitted)
```

## Pages

### WelcomePage (modified)
- Change button label from "Submit Your Image" → "Get Started"
- Button navigates to InstructionPage instead of opening file picker

### InstructionPage (new)
- Route/component: `src/pages/InstructionPage.tsx`
- Dark green background (`#0a1a0e`) matching WelcomePage
- Single scrollable layout, no pagination

#### Header
- Back arrow (←) top-left, navigates back to WelcomePage
- Title: "How to Photograph Your Turtle" — Playfair Display, cream (`#f0ede6`)

#### Photo Cards

Three cards stacked vertically. Top View is visually larger (primary); Left and Right are secondary.

Each card contains:
1. **Placeholder image area** — dashed border, reserved for illustration asset to be provided later
2. **Label** — e.g. "Top View"
3. **Tip text** — one line of guidance
4. **"Submit Image" button** — same style as existing button; triggers device camera/file picker
5. **Preview state** — once submitted, placeholder is replaced with a thumbnail of the chosen image + a checkmark indicator

| Card       | Size    | Label       | Tip                                              | Required |
|------------|---------|-------------|--------------------------------------------------|----------|
| Top View   | Large   | Top View    | Position yourself directly above the turtle      | Yes      |
| Left Side  | Medium  | Left Side   | Optional — helps improve accuracy               | No       |
| Right Side | Medium  | Right Side  | Optional — helps improve accuracy               | No       |

#### Identify Button
- Label: "Identify My Turtle"
- Full width, pinned to bottom of scroll (not fixed — scrolls with content)
- **Disabled** (muted style) until Top View image is submitted
- **Active** once `topImage !== null`

## State

```ts
topImage: File | null
leftImage: File | null
rightImage: File | null

identifyEnabled = topImage !== null
```

Each card manages its own file input ref and image state. On file selection, stores the File and generates an object URL for the preview thumbnail.

## Visual Style

Consistent with WelcomePage:
- Background: `#0a1a0e`
- Primary text: `#f0ede6`
- Accent / borders: `#6b8f71`
- Fonts: Playfair Display (headings), DM Mono (labels, buttons)
- Button style: outlined, fill on hover, same as existing CTA

## App Routing

Currently `App.tsx` renders `<WelcomePage />` directly. Introduce simple local state to switch between pages:

```ts
// App.tsx
type Page = 'welcome' | 'instructions';
const [page, setPage] = useState<Page>('welcome');
```

No router dependency needed at this stage.

## Files to Create / Modify

| File | Action |
|------|--------|
| `src/pages/WelcomePage.tsx` | Modify — button label + onClick navigates to instructions |
| `src/pages/InstructionPage.tsx` | Create |
| `src/App.tsx` | Modify — add page state, pass navigation callbacks |
