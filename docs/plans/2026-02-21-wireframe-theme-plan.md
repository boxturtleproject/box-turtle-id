# Wireframe Theme Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all hardcoded design token values (colors, fonts) across all component files with CSS custom properties, setting wireframe (black on white, system font) values as the current theme.

**Architecture:** Define all tokens as CSS custom properties in `src/index.css` under `:root`. Replace every hardcoded hex color and font-family string in all page and component files with `var(--token-name)`. Future redesigns only require updating `index.css`.

**Tech Stack:** React, TypeScript, CSS custom properties (no new dependencies).

---

## Token Mapping

| CSS Variable | Wireframe Value | Replaces |
|---|---|---|
| `--color-bg` | `#ffffff` | `#0a1a0e` |
| `--color-bg-card` | `#f5f5f5` | `#0f2414` |
| `--color-bg-card-hover` | `#ebebeb` | `#142b19` |
| `--color-text-primary` | `#111111` | `#f0ede6` |
| `--color-text-secondary` | `#444444` | `#6b8f71` |
| `--color-text-muted` | `#888888` | `#a8c5ae` |
| `--color-text-disabled` | `#bbbbbb` | `#2a4030` |
| `--color-text-error` | `#cc0000` | `#ff6b6b` |
| `--color-text-dev` | `#996600` | `#c8a84b` |
| `--color-border` | `#cccccc` | `#1e3a24` |
| `--color-border-input` | `#aaaaaa` | `#3a5c40` |
| `--color-border-action` | `#444444` | `#6b8f71` (button borders) |
| `--color-border-dev` | `#996600` | `#c8a84b` (dev badge border) |
| `--color-overlay` | `rgba(0,0,0,0.5)` | `rgba(10,26,14,0.92)` |
| `--color-btn-primary-bg` | `#444444` | `#6b8f71` (filled button bg) |
| `--color-btn-primary-bg-hover` | `#222222` | `#8aab90` (filled button hover) |
| `--color-btn-primary-text` | `#ffffff` | `#0a1a0e` (filled button text) |
| `--font-heading` | `system-ui, sans-serif` | `'Playfair Display', serif` |
| `--font-body` | `system-ui, sans-serif` | `'DM Mono', monospace` |

**Note on button colors:** The filled primary button (green bg, dark text) maps to `--color-btn-primary-bg` / `--color-btn-primary-text`. The green used as secondary text/borders maps to `--color-text-secondary` / `--color-border-action`. These are the same hex in the current theme but are semantically different tokens.

---

### Task 1: Add CSS custom properties to `index.css`

**Files:**
- Modify: `src/index.css`

**Step 1: Replace contents of `src/index.css` with:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Backgrounds */
  --color-bg: #ffffff;
  --color-bg-card: #f5f5f5;
  --color-bg-card-hover: #ebebeb;

  /* Text */
  --color-text-primary: #111111;
  --color-text-secondary: #444444;
  --color-text-muted: #888888;
  --color-text-disabled: #bbbbbb;
  --color-text-error: #cc0000;
  --color-text-dev: #996600;

  /* Borders */
  --color-border: #cccccc;
  --color-border-input: #aaaaaa;
  --color-border-action: #444444;
  --color-border-dev: #996600;

  /* Overlay */
  --color-overlay: rgba(0, 0, 0, 0.5);

  /* Primary button */
  --color-btn-primary-bg: #444444;
  --color-btn-primary-bg-hover: #222222;
  --color-btn-primary-text: #ffffff;

  /* Fonts */
  --font-heading: system-ui, sans-serif;
  --font-body: system-ui, sans-serif;
}
```

**Step 2: Verify dev server still starts**

```bash
cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && npx tsc --noEmit
```

Expected: no errors (CSS changes don't affect TypeScript)

**Step 3: Commit**

```bash
cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && git add src/index.css && git commit -m "feat: add CSS custom property token definitions (wireframe theme)"
```

---

### Task 2: Refactor `src/pages/WelcomePage.tsx`

**Files:**
- Modify: `src/pages/WelcomePage.tsx`

**Step 1: Replace all hardcoded values using this mapping:**

| Find | Replace with |
|---|---|
| `'#0a1a0e'` | `'var(--color-bg)'` |
| `'#0f2414'` | `'var(--color-bg-card)'` |
| `'#142b19'` | `'var(--color-bg-card-hover)'` |
| `'#f0ede6'` | `'var(--color-text-primary)'` |
| `'#6b8f71'` | `'var(--color-text-secondary)'` (when used as text color) |
| `'#a8c5ae'` | `'var(--color-text-muted)'` |
| `'#2a4030'` | `'var(--color-text-disabled)'` |
| `'#1e3a24'` | `'var(--color-border)'` |
| `"'Playfair Display', serif"` | `'var(--font-heading)'` |
| `"'DM Mono', monospace"` | `'var(--font-body)'` |

**Note:** In WelcomePage, `#6b8f71` appears as text color and as stroke color on the checkmark SVG. Replace all instances with `var(--color-text-secondary)`.

**Step 2: Verify TypeScript**

```bash
cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && npx tsc --noEmit
```

Expected: no errors

**Step 3: Commit**

```bash
cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && git add src/pages/WelcomePage.tsx && git commit -m "refactor: replace hardcoded tokens with CSS vars in WelcomePage"
```

---

### Task 3: Refactor `src/pages/InstructionPage.tsx`

**Files:**
- Modify: `src/pages/InstructionPage.tsx`

**Step 1: Replace all hardcoded values using this mapping:**

| Find | Replace with |
|---|---|
| `'#0a1a0e'` | `'var(--color-bg)'` |
| `'#0f2414'` | `'var(--color-bg-card)'` |
| `'#f0ede6'` | `'var(--color-text-primary)'` |
| `'#6b8f71'` | `'var(--color-text-secondary)'` (text/stroke uses) |
| `'#a8c5ae'` | `'var(--color-text-muted)'` |
| `'#1e3a24'` | `'var(--color-border)'` |
| `'#3a5c40'` | `'var(--color-border-input)'` |
| `"'Playfair Display', serif"` | `'var(--font-heading)'` |
| `"'DM Mono', monospace"` | `'var(--font-body)'` |

**Note:** InstructionPage uses `#6b8f71` both as button border color and as text/icon color. Replace all with `var(--color-text-secondary)` — the wireframe value `#444444` works for both roles.

For the filled primary button (if present): replace `backgroundColor: '#6b8f71'` with `backgroundColor: 'var(--color-btn-primary-bg)'` and text `'#0a1a0e'` with `'var(--color-btn-primary-text)'`.

**Step 2: Verify TypeScript**

```bash
cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && npx tsc --noEmit
```

**Step 3: Commit**

```bash
cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && git add src/pages/InstructionPage.tsx && git commit -m "refactor: replace hardcoded tokens with CSS vars in InstructionPage"
```

---

### Task 4: Refactor `src/pages/MatchProfilePage.tsx`

**Files:**
- Modify: `src/pages/MatchProfilePage.tsx`

**Step 1: Replace all hardcoded values using this mapping:**

| Find | Replace with |
|---|---|
| `'#0a1a0e'` | `'var(--color-bg)'` (page bg and button text) — **EXCEPT** filled button text: use `'var(--color-btn-primary-text)'` |
| `'#0f2414'` | `'var(--color-bg-card)'` |
| `'#f0ede6'` | `'var(--color-text-primary)'` |
| `'#6b8f71'` | `'var(--color-text-secondary)'` (text/icon uses) |
| `'#8aab90'` | `'var(--color-btn-primary-bg-hover)'` (hover state of filled button) |
| `'#a8c5ae'` | `'var(--color-text-muted)'` |
| `'#ff6b6b'` | `'var(--color-text-error)'` |
| `'#1e3a24'` | `'var(--color-border)'` |
| `'#3a5c40'` | `'var(--color-border-input)'` |
| `"'Playfair Display', serif"` | `'var(--font-heading)'` |
| `"'DM Mono', monospace"` | `'var(--font-body)'` |

**Critical distinction:** `#0a1a0e` is used as BOTH the page background AND the text color on filled primary buttons. When replacing:
- `backgroundColor: '#0a1a0e'` on the page wrapper → `var(--color-bg)`
- `color: '#0a1a0e'` on filled buttons → `var(--color-btn-primary-text)`

For filled primary buttons:
- `backgroundColor: '#6b8f71'` → `var(--color-btn-primary-bg)`
- `backgroundColor: '#8aab90'` (hover) → `var(--color-btn-primary-bg-hover)`
- `color: '#0a1a0e'` → `var(--color-btn-primary-text)`

For outline buttons:
- `borderColor: '#6b8f71'` → `var(--color-border-action)`
- `color: '#6b8f71'` → `var(--color-text-secondary)`
- `color: '#0a1a0e'` on hover fill → `var(--color-btn-primary-text)`
- `backgroundColor: '#6b8f71'` on hover fill → `var(--color-btn-primary-bg)`

**Step 2: Verify TypeScript**

```bash
cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && npx tsc --noEmit
```

**Step 3: Commit**

```bash
cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && git add src/pages/MatchProfilePage.tsx && git commit -m "refactor: replace hardcoded tokens with CSS vars in MatchProfilePage"
```

---

### Task 5: Refactor `src/pages/PossibleMatchPage.tsx`

**Files:**
- Modify: `src/pages/PossibleMatchPage.tsx`

**Step 1: Replace all hardcoded values using this mapping:**

| Find | Replace with |
|---|---|
| `'#0a1a0e'` | `'var(--color-bg)'` (page bg) or `'var(--color-btn-primary-text)'` (button text on hover fill) |
| `'#0f2414'` | `'var(--color-bg-card)'` |
| `'#f0ede6'` | `'var(--color-text-primary)'` |
| `'#6b8f71'` | `'var(--color-text-secondary)'` or `'var(--color-btn-primary-bg)'` (filled button bg) or `'var(--color-border-action)'` (button borders) |
| `'#a8c5ae'` | `'var(--color-text-muted)'` |
| `'#1e3a24'` | `'var(--color-border)'` |
| `"'Playfair Display', serif"` | `'var(--font-heading)'` |
| `"'DM Mono', monospace"` | `'var(--font-body)'` |

**Note on confidence badge colors:** The `CONFIDENCE_COLORS` map uses `'#6b8f71'` (high), `'#c8a84b'` (medium/amber), `'#a8c5ae'` (low). Replace:
- `'#6b8f71'` → `'var(--color-text-secondary)'`
- `'#c8a84b'` → `'var(--color-text-dev)'` (repurposing the amber/warning token)
- `'#a8c5ae'` → `'var(--color-text-muted)'`

**Step 2: Verify TypeScript**

```bash
cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && npx tsc --noEmit
```

**Step 3: Commit**

```bash
cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && git add src/pages/PossibleMatchPage.tsx && git commit -m "refactor: replace hardcoded tokens with CSS vars in PossibleMatchPage"
```

---

### Task 6: Refactor `src/components/DevRoutingModal.tsx`

**Files:**
- Modify: `src/components/DevRoutingModal.tsx`

**Step 1: Replace all hardcoded values using this mapping:**

| Find | Replace with |
|---|---|
| `'rgba(10, 26, 14, 0.92)'` | `'var(--color-overlay)'` |
| `'#0f2414'` | `'var(--color-bg-card)'` |
| `'#1e3a24'` | `'var(--color-border)'` |
| `'#f0ede6'` | `'var(--color-text-primary)'` |
| `'#6b8f71'` | `'var(--color-text-secondary)'` (text) or `'var(--color-btn-primary-bg)'` (filled button bg) or `'var(--color-border-action)'` (outline button borders) |
| `'#0a1a0e'` | `'var(--color-btn-primary-text)'` (filled button text) |
| `'#a8c5ae'` | `'var(--color-text-muted)'` |
| `'#c8a84b'` | `'var(--color-text-dev)'` |
| `"'Playfair Display', serif"` | `'var(--font-heading)'` |
| `"'DM Mono', monospace"` | `'var(--font-body)'` |

**Step 2: Verify TypeScript**

```bash
cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && npx tsc --noEmit
```

**Step 3: Commit**

```bash
cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && git add src/components/DevRoutingModal.tsx && git commit -m "refactor: replace hardcoded tokens with CSS vars in DevRoutingModal"
```
