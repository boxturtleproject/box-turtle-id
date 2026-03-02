# Encounter Form Data Structure Updates — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update `EncounterForm` with a revised behavior list and two new multi-select fields (Setting and Conditions).

**Architecture:** All changes are confined to `src/components/EncounterForm.tsx`. The component is a controlled form — parents own the state, so adding new fields to `EncounterFormData` and `defaultEncounterFormData()` is enough to wire everything through. No page-level files need to change.

**Tech Stack:** React 19, TypeScript 5.9, Vite. No test framework — `npm run build` (TypeScript compilation) is the automated check.

---

### Task 1: Update `src/components/EncounterForm.tsx`

**Files:**
- Modify: `src/components/EncounterForm.tsx`

**Step 1: Replace the `BEHAVIORS` constant**

Change from:
```ts
export const BEHAVIORS = [
  'Nesting',
  'Mating',
  'Scouting',
  'Active',
  'Basking',
  'Basking in Rain',
  'Locomoting',
  'Hidden',
  'Stationary',
  'Emerging',
  'Bathing',
  'Digging',
] as const;
```

To:
```ts
export const BEHAVIORS = [
  'Digging',
  'Nesting',
  'Mating',
  'Locomoting',
  'Stationary',
  'Basking',
  'Hiding',
  'Bathing',
] as const;
```

**Step 2: Add `CONDITIONS` and `SETTING_OPTIONS` constants** (insert after `BEHAVIORS`)

```ts
export const CONDITIONS = [
  'Sunny',
  'Damp',
  'Rainy',
  'Cloudy',
  'Foggy',
  'Dry',
  'Humid',
  'Hot',
] as const;

export const SETTING_OPTIONS = [
  'Road',
  'Field',
  'Woods',
  'Wetland',
] as const;
```

**Step 3: Update `EncounterFormData` interface**

Add two new fields:
```ts
export interface EncounterFormData {
  date: string;
  location: string;
  setting: string[];       // new
  conditions: string[];    // new
  behaviors: string[];
  health: string;
  observationNotes: string;
  nickname: string;
  notifyMe: boolean;
  email: string;
}
```

**Step 4: Update `defaultEncounterFormData()`**

```ts
export function defaultEncounterFormData(): EncounterFormData {
  return {
    date: new Date().toISOString().split('T')[0],
    location: '',
    setting: [],
    conditions: [],
    behaviors: [],
    health: '',
    observationNotes: '',
    nickname: '',
    notifyMe: false,
    email: '',
  };
}
```

**Step 5: Add a generic toggle helper and update the form body**

In the `EncounterForm` component body, replace `toggleBehavior` with a generic `toggleItem` helper, then update the JSX to add Setting and Conditions fields in the correct order.

Replace the full component function with:

```tsx
export function EncounterForm({ includeNickname = false, value, onChange }: EncounterFormProps) {
  function set<K extends keyof EncounterFormData>(key: K, val: EncounterFormData[K]) {
    onChange({ ...value, [key]: val });
  }

  function toggleItem(key: 'behaviors' | 'conditions' | 'setting', item: string) {
    const current = value[key];
    const next = current.includes(item)
      ? current.filter(x => x !== item)
      : [...current, item];
    set(key, next);
  }

  return (
    <div className="flex flex-col gap-6">
      <FieldGroup label="Date">
        <input
          type="date"
          value={value.date}
          onChange={e => set('date', e.target.value)}
          style={inputStyle}
        />
      </FieldGroup>

      <FieldGroup label="Location">
        <input
          type="text"
          value={value.location}
          onChange={e => set('location', e.target.value)}
          placeholder="e.g. North meadow trail"
          style={inputStyle}
        />
      </FieldGroup>

      <FieldGroup label="Setting">
        <div className="flex flex-col gap-2">
          {SETTING_OPTIONS.map(s => (
            <label
              key={s}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'var(--font-body)',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={value.setting.includes(s)}
                onChange={() => toggleItem('setting', s)}
                style={{ accentColor: 'var(--color-btn-primary-bg)' }}
              />
              {s}
            </label>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Conditions">
        <div className="flex flex-col gap-2">
          {CONDITIONS.map(c => (
            <label
              key={c}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'var(--font-body)',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={value.conditions.includes(c)}
                onChange={() => toggleItem('conditions', c)}
                style={{ accentColor: 'var(--color-btn-primary-bg)' }}
              />
              {c}
            </label>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Observed Behavior">
        <div className="flex flex-col gap-2">
          {BEHAVIORS.map(b => (
            <label
              key={b}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'var(--font-body)',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={value.behaviors.includes(b)}
                onChange={() => toggleItem('behaviors', b)}
                style={{ accentColor: 'var(--color-btn-primary-bg)' }}
              />
              {b}
            </label>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Health">
        <select
          value={value.health}
          onChange={e => set('health', e.target.value)}
          style={inputStyle}
        >
          <option value="">Select...</option>
          {HEALTH_OPTIONS.map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </FieldGroup>

      <FieldGroup label="Observation Notes">
        <textarea
          value={value.observationNotes}
          onChange={e => set('observationNotes', e.target.value)}
          rows={4}
          placeholder="Any additional observations..."
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </FieldGroup>

      {includeNickname && (
        <FieldGroup label="Suggested Nickname">
          <input
            type="text"
            value={value.nickname}
            onChange={e => set('nickname', e.target.value)}
            placeholder="Optional"
            style={inputStyle}
          />
        </FieldGroup>
      )}

      <div className="flex flex-col gap-3">
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-primary)',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={value.notifyMe}
            onChange={e => set('notifyMe', e.target.checked)}
            style={{ accentColor: 'var(--color-btn-primary-bg)' }}
          />
          Notify me about this turtle
        </label>
        {value.notifyMe && (
          <input
            type="email"
            value={value.email}
            onChange={e => set('email', e.target.value)}
            placeholder="your@email.com"
            style={inputStyle}
          />
        )}
        {value.notifyMe && (
          <span
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-muted)',
              fontSize: '0.75rem',
              lineHeight: 1.5,
            }}
          >
            We'll email you if this turtle is identified or added to the database.
          </span>
        )}
      </div>
    </div>
  );
}
```

**Step 6: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds, zero errors. TypeScript will catch any field name mismatches.

**Step 7: Commit**

```bash
git add src/components/EncounterForm.tsx
git commit -m "feat: update encounter form with revised behaviors and new setting/conditions fields"
```
