# Cookie Info Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed bottom cookie info banner that informs users about necessary cookie usage and can be dismissed.

**Architecture:** Create a single client component `CookieBanner` that manages its own visibility via localStorage. Render it in the public layout as the last child. No state management or context needed.

**Tech Stack:** React 19, Next.js App Router, Tailwind CSS v4

---

### Task 1: Create CookieBanner component

**Files:**
- Create: `src/components/cookie-banner.tsx`

- [ ] **Step 1: Create the CookieBanner component**

Create `src/components/cookie-banner.tsx` with:

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'cookie-banner-dismissed'

export function CookieBanner() {
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === 'true')
  }, [])

  if (dismissed !== false) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-[fadeIn_0.5s_ease-out]">
      <div className="mx-auto max-w-xl bg-white rounded-xl shadow-lg border border-[#e7e5e4] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <p className="text-sm text-[#5a4a42] flex-1">
          <span className="mr-1.5">🍪</span>
          Vi använder cookies för att sajten ska fungera.{' '}
          <Link href="/policy" className="text-[#c45a3b] underline hover:text-[#a84832]">
            Läs mer
          </Link>
        </p>
        <button
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, 'true')
            setDismissed(true)
          }}
          className="text-sm font-medium px-5 py-1.5 rounded-full bg-[#c45a3b] text-white hover:bg-[#a84832] transition-colors shadow-sm whitespace-nowrap self-end sm:self-auto"
        >
          Jag förstår
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the dev server compiles without errors**

Run: `npm run dev` (check terminal for compilation errors, then stop)

- [ ] **Step 3: Commit**

```bash
git add src/components/cookie-banner.tsx
git commit -m "feat: add CookieBanner component"
```

---

### Task 2: Add CookieBanner to public layout

**Files:**
- Modify: `src/app/(public)/layout.tsx`

- [ ] **Step 1: Add CookieBanner import**

Add import at the top of `src/app/(public)/layout.tsx` (after line 9):

```tsx
import { CookieBanner } from '@/components/cookie-banner'
```

- [ ] **Step 2: Render CookieBanner at the bottom of the layout**

Insert `<CookieBanner />` after the closing `</footer>` tag (after line 176) and before the closing `</div>` (line 177):

```tsx
      </footer>
      <CookieBanner />
    </div>
```

- [ ] **Step 3: Verify the dev server compiles and the banner renders**

Run: `npm run dev`, open the app in a browser. Verify:
- Banner appears at the bottom of the viewport as a floating white card
- Text reads "Vi använder cookies för att sajten ska fungera. Läs mer"
- "Läs mer" links to /policy
- "Jag förstår" button dismisses the banner
- Refreshing the page does not show the banner again (localStorage persists)
- Clearing localStorage and refreshing shows the banner again

- [ ] **Step 4: Commit**

```bash
git add src/app/\(public\)/layout.tsx
git commit -m "feat: add CookieBanner to public layout"
```
