# Welcome Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Box Turtle ID mobile welcome page — a full-bleed typographic splash screen with app name, tagline, and a single "Get Started" CTA button.

**Architecture:** Vite + React + TypeScript project with Tailwind CSS. A single `WelcomePage.tsx` component, pure presentational, rendered from `App.tsx`. Google Fonts loaded via `index.html`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, Vite

---

### Task 1: Scaffold the Vite + React + TypeScript project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

**Step 1: Scaffold project**

Run in `/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID`:

```bash
npm create vite@latest . -- --template react-ts
```

When prompted about non-empty directory, choose to ignore/proceed.

**Step 2: Install dependencies**

```bash
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 3: Configure Tailwind**

Edit `tailwind.config.js` — set content paths:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Step 4: Add Tailwind directives to `src/index.css`**

Replace contents of `src/index.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 5: Add Google Fonts to `index.html`**

Add inside `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Also update `<title>` to `Box Turtle ID`.

**Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server running at `http://localhost:5173` with default React page.

**Step 7: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Vite React TS project with Tailwind and Google Fonts"
```

---

### Task 2: Create the WelcomePage component

**Files:**
- Create: `src/pages/WelcomePage.tsx`
- Modify: `src/App.tsx`

**Step 1: Create `src/pages/` directory and `WelcomePage.tsx`**

```tsx
// src/pages/WelcomePage.tsx
export function WelcomePage() {
  return (
    <div
      className="flex flex-col items-center justify-between h-screen w-full px-8 py-16"
      style={{ backgroundColor: '#0a1a0e' }}
    >
      {/* Top spacer */}
      <div />

      {/* Center content */}
      <div className="flex flex-col items-center gap-6 text-center">
        <h1
          className="text-5xl font-bold tracking-widest"
          style={{
            fontFamily: "'Playfair Display', serif",
            color: '#f0ede6',
            letterSpacing: '0.12em',
          }}
        >
          Box Turtle ID
        </h1>

        <p
          className="text-xs tracking-[0.3em] uppercase"
          style={{
            fontFamily: "'DM Mono', monospace",
            color: '#6b8f71',
          }}
        >
          Submit a photo to identify your turtle
        </p>
      </div>

      {/* Bottom CTA */}
      <button
        className="w-full max-w-xs py-4 text-xs tracking-[0.25em] uppercase border transition-all duration-300"
        style={{
          fontFamily: "'DM Mono', monospace",
          color: '#6b8f71',
          borderColor: '#6b8f71',
          backgroundColor: 'transparent',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6b8f71';
          (e.currentTarget as HTMLButtonElement).style.color = '#0a1a0e';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = '#6b8f71';
        }}
      >
        Get Started
      </button>
    </div>
  );
}
```

**Step 2: Update `src/App.tsx` to render WelcomePage**

Replace contents:

```tsx
// src/App.tsx
import { WelcomePage } from './pages/WelcomePage';

function App() {
  return <WelcomePage />;
}

export default App;
```

**Step 3: Verify in browser**

```bash
npm run dev
```

Expected: Dark green-black full-screen page, "Box Turtle ID" in large serif, tagline in small mono, ghost button at bottom.

**Step 4: Check mobile viewport**

In browser DevTools, enable mobile emulation (e.g. iPhone 14, 390px wide). Verify layout looks correct — no overflow, button is accessible at bottom.

**Step 5: Commit**

```bash
git add src/pages/WelcomePage.tsx src/App.tsx
git commit -m "feat: add WelcomePage with typographic splash layout"
```

---

### Task 3: Remove Vite boilerplate and clean up

**Files:**
- Delete: `src/assets/react.svg`, `public/vite.svg`
- Modify: `index.html` (favicon link)

**Step 1: Remove unused asset files**

```bash
rm src/assets/react.svg
rm public/vite.svg
```

**Step 2: Update favicon link in `index.html`**

Change:
```html
<link rel="icon" type="image/svg+xml" href="/vite.svg" />
```
To:
```html
<link rel="icon" type="image/png" href="/favicon.ico" />
```

(Or simply remove the favicon line if no favicon asset exists yet.)

**Step 3: Verify no console errors**

Run dev server, open browser console. Expected: no 404 errors for removed assets.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Vite boilerplate assets"
```

---

### Task 4: Verify TypeScript and build

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 2: Run production build**

```bash
npm run build
```

Expected: `dist/` folder created, no build errors.

**Step 3: Preview production build**

```bash
npm run preview
```

Open `http://localhost:4173` and verify the welcome page renders correctly.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: verify TypeScript and production build pass"
```
