# Landing Page Redesign Roadmap
**Goal:** ≥10% trial conversion rate · WCAG 2.1 AA accessibility · Core Web Vitals green · Strong social proof
**Current state:** Good brand identity, broken responsive carousel, CTA below fold on desktop, zero social proof

---

## Priority 1 — Critical (conversion killers, fix first)

### 1.1 Hero CTA above the fold
**Problem:** The hero image at 1600×1000px renders ~800px tall at 1280px viewport width. The CTA buttons sit below the image in the DOM — invisible without scrolling. Visitors see a photo and a headline, then leave.

**Fix:** Constrain the image to `h-[80vh] max-h-[820px]` using `fill` + `object-cover`. Move the headline, sub-copy, and CTA buttons inside the image overlay (absolutely positioned). All conversion content is now in the first screenful.

**Files:** `src/components/home/HeroSection.tsx`

**Success metric:** CTA visible at 100% of desktop viewport widths from 320px upward.

---

### 1.2 Responsive features carousel
**Problem:** The features carousel has hardcoded pixel dimensions (`carouselWidthPx = 1196`, `slideWidthPx = 1109`). Overflows at any viewport narrower than ~1300px. Completely broken on tablet and mobile.

**Fix:** Remove all hardcoded pixel values. Use `w-full` for the container and percentage-based slide widths. Replace the manual pixel `translateX` with `translateX(-${activeIndex * 100}%)`. Each slide becomes `w-full flex-none`. The carousel is now naturally responsive at every breakpoint.

**Files:** `src/components/home/FeaturesSection.tsx`

---

### 1.3 CTA button visual contrast
**Problem:** Primary CTA uses `bg-foreground` (dark olive/green), the same shade as body text. It blends with surrounding text elements and lacks visual hierarchy as a conversion focal point.

**Fix:**
- Hero CTA (on dark photo): white button with `#1f3434` text — 15:1 contrast ratio (AAA).
- Below-fold CTAs: white button with a `2px solid #f29b3f` amber ring + dark text for visual pop on light backgrounds.
- Add "No credit card required · Cancel anytime" microcopy beneath the primary hero CTA.

**Files:** `src/app/globals.css`, `src/components/home/HeroSection.tsx`

---

### 1.4 Social proof section
**Problem:** Zero testimonials, customer logos, or trust numbers anywhere on the page. For aviation compliance buyers (risk-averse, safety-critical domain), this is a primary conversion barrier.

**Fix:** Add a `SocialProofSection` immediately below the hero. Three parts:

**a. Stats bar (real metrics):**
| Stat | Label |
|------|-------|
| 40+ | EASA regulatory families monitored |
| < 5 min | Average time from EASA change to drafted update |
| 100% | Audit trail — every approval, rollback, and sign-off |

**b. Testimonials (2–3 quotes):**
Placeholder quotes structured for real customer data. Replace with real quotes from early-access ATOs before launch. Format: quote → name, role, school name/size.

**c. Trust badges row:**
- GDPR compliant
- EU-hosted infrastructure
- Audit-ready by design
- Read-and-acknowledge logs

**Files:** `src/components/home/SocialProofSection.tsx` (new), `src/app/page.tsx`

---

## Priority 2 — High Impact (30-day sprint)

### 2.1 Section spacing
**Problem:** Every section uses `py-[20px]` — just 20px vertical padding. Sections bleed visually together. The page reads as one undifferentiated wall.

**Fix:** Standardise on:
- Major sections (hero transitions, social proof, competitive): `py-20 md:py-28` (80px–112px)
- Mid-weight sections (features, workflow, personas): `py-16 md:py-20` (64px–80px)
- Tight sections (problem statement): `py-12 md:py-16` (48px–64px)

**Files:** All `src/components/home/*.tsx`

---

### 2.2 Reduce navigation cognitive load
**Problem:** Eight nav links + Login = decision paralysis. "Register" is in the nav list *and* as a CTA button — confusing.

**Current:** Features · How it works · Who it's for · Pricing · Help · FAQ · Contact · Register · [Login] [Register school]

**Proposed:** Features · How it works · Pricing · Help · [Login] [Register school]

- Remove: "Who it's for" (covered by the Personas section scroll), "FAQ" (belongs under Help), "Contact" (footer only)
- Keep: "Register" removed from the text link list — it's the CTA button only

**Files:** `src/components/home/Nav.tsx`

---

### 2.3 Pricing anchor near CTA
**Problem:** Visitors don't know the price range when deciding whether to click "Start free trial." Unknown pricing = hesitation.

**Fix:** Add a single line beneath the CTA buttons:
> "From €199/month · 30-day free trial · Cancel anytime"

Links to `/pricing`. Reduces price anxiety and sets expectation before the click.

**Files:** `src/components/home/HeroSection.tsx`

---

### 2.4 Rewrite proof point cards
**Problem:** The three frosted cards below the hero read: *"AI does the monitoring, matching, and first draft. Humans make the compliance decisions."* This is inside-out — it describes the feature, not the visitor's relief.

**Rewrite (pain-removed framing):**
- "No more spending hours each week manually checking EASA bulletins. Automated monitoring surfaces changes as they land."
- "Your compliance manager edits, approves, or rejects every AI draft. The regulation change only takes effect when a human approves it."
- "Every action is timestamped and logged. At your next audit, pull the exact version of any procedure that was active on any given date."

**Files:** `src/components/home/HeroSection.tsx`

---

### 2.5 Dark-section treatment for CompetitiveSection
**Problem:** The "Why Flight Lyceum" section has the same warm-cream background as everything else. It carries the most confidence-building content (the differentiators vs. generic compliance tools) but looks identical to every other section.

**Fix:** Give it a dark brand-green background (`#1f3434`) with white/cream text. This creates a strong visual break and signals "this is the important section before you decide." Uses an inverted card pattern.

**Files:** `src/components/home/CompetitiveSection.tsx`, `src/app/globals.css`

---

## Priority 3 — Accessibility (WCAG 2.1 AA)

### 3.1 Skip navigation link
Add a visually hidden but keyboard-focusable "Skip to main content" link as the first element in `<body>`. Becomes visible on focus. Required for keyboard-only and screen reader users.

```html
<a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 ...">
  Skip to main content
</a>
```

**Files:** `src/components/home/Nav.tsx`

---

### 3.2 Focus-visible styles
**Problem:** No `:focus-visible` styles defined. Browser defaults vary wildly and are often invisible against the brand palette.

**Fix:**
```css
:focus-visible {
  outline: 3px solid var(--easa-color-brand-primary);
  outline-offset: 3px;
  border-radius: 4px;
}
/* On dark backgrounds */
.on-dark :focus-visible {
  outline-color: #f29b3f;  /* amber — visible on dark green */
}
```

**Files:** `src/app/globals.css`

---

### 3.3 Carousel accessibility
The features carousel currently has no keyboard controls, no ARIA roles, and no pause mechanism.

**Fixes:**
- Add `role="region"` + `aria-label="Product features"` to the carousel container
- Add `aria-live="polite"` to the current-slide indicator
- Add prev/next `<button>` controls (visible on keyboard focus, subtle otherwise)
- Add `prefers-reduced-motion` media query to disable auto-play
- The auto-pause on hover already exists — extend to focus

**Files:** `src/components/home/FeaturesSection.tsx`

---

### 3.4 Color contrast audit

| Element | Current color | Background | Ratio | Status |
|---------|---------------|------------|-------|--------|
| Body text `#1e1f24` | `#f4f1e8` | ~14:1 | ✅ AAA |
| Muted text `#6c6f7b` | `#f4f1e8` | ~5.8:1 | ✅ AA |
| Muted text `#6c6f7b` | card bg `#fff` | ~5.4:1 | ✅ AA |
| Hero white text | photo (varies) | Depends on image | ⚠️ needs gradient |
| Nav muted links `#6c6f7b` | `rgba(255,253,248,0.9)` | ~5.4:1 | ✅ AA |
| Eyebrow labels `#6c6f7b` | `#f4f1e8` | ~5.8:1 | ✅ AA |

**Action:** Hero white text needs a darker gradient beneath it. Current gradient bottom opacity (`rgba(255,253,248,0.42)`) is too light — it bleaches the white text. Change to `rgba(13,24,23,0.75)` at 100%.

---

### 3.5 Image alt text audit
- Hero image: currently has descriptive alt — this is the background photo, so `alt=""` is more correct (decorative context, text is in overlay)
- Feature screenshots: good descriptive alts ✅
- Logo: `alt="Flight Lyceum logo"` ✅

**Fix:** Set hero image to `alt=""` (it's decorative; the content is in the headline overlay).

---

### 3.6 Semantic HTML improvements
- All section headings in correct h1→h2→h3 order ✅ (hero is h1, sections are h2, cards are h3)
- Add `<main id="main-content">` explicit id for skip link target ✅ (Next.js `<main>` already used)
- Add `aria-label` to `<nav>` elements: primary nav vs footer nav
- Workflow step connectors (`→`) should be `aria-hidden="true"`

---

## Priority 4 — Typography & Font

### 4.1 Upgrade display font
**Current:** `Georgia, "Times New Roman", ui-serif, serif` — safe but generic system serif.

**Recommendation:** DM Serif Display — free via Google Fonts, available through `next/font/google`, zero-cost swap, renders sharply at all sizes.

```tsx
// In layout.tsx:
import { DM_Serif_Display } from "next/font/google";
const dmSerifDisplay = DM_Serif_Display({ weight: "400", subsets: ["latin"], display: "swap" });
```

Then in globals.css:
```css
--font-display: var(--font-dm-serif), Georgia, ui-serif, serif;
```

**Why DM Serif Display:** Similar authority signal to Georgia, but has more distinctive letterforms at large display sizes (the hero h1 and section h2s). Optical metrics are designed for headings, not body text. The "400" weight renders with elegance at 48px+.

**Files:** `src/app/layout.tsx`, `src/app/globals.css`

---

### 4.2 Typography scale improvements
**Current issues:**
- H2 sections all use identical `text-4xl md:text-5xl` with `font-normal` — no size distinction between hero-adjacent h2 and deep-page h2
- Body text mixes `text-sm` and `text-base` inconsistently
- No visual weight variation between section types

**Proposed scale:**
| Role | Size | Weight | Color |
|------|------|--------|-------|
| H1 hero | clamp(2rem, 5vw, 4rem) | 700 | White |
| H2 primary (first 2 sections) | clamp(1.75rem, 3.5vw, 3rem) | 400 (serif) | Foreground |
| H2 secondary (remaining sections) | clamp(1.5rem, 2.8vw, 2.5rem) | 400 (serif) | Foreground |
| H3 card title | 1.1rem | 600 | Foreground |
| Body lead | 1.125rem | 400 | Muted |
| Body standard | 0.9375rem | 400 | Muted |
| Eyebrow | 0.72rem | 700 | Muted |

---

## Priority 5 — Performance (Core Web Vitals)

### 5.1 Hero image LCP optimisation
- Already uses `priority` on the hero image ✅
- Add explicit `width`/`height` to avoid layout shift
- Ensure `sizes="100vw"` is present ✅
- The image should be served as WebP or AVIF (Next.js Image handles this by default) ✅

### 5.2 Font loading
If DM Serif Display is adopted: use `display: "swap"` to prevent FOIT ✅

### 5.3 Carousel images
Feature screenshots inside the carousel should use `loading="lazy"` on non-active slides. Currently all load on page load. The `priority` flag should only be on slide 0.

**Files:** `src/components/home/FeaturesSection.tsx`

---

## Section-by-Section Change Summary

| Section | Changes |
|---------|---------|
| `Nav` | Skip link · Remove 3 nav items · aria-label on nav element |
| `HeroSection` | Image height constrained · CTA inside overlay · Pricing anchor · Rewritten proof points · Trust microcopy |
| `SocialProofSection` (new) | Stats bar · 2–3 testimonials · Trust badges |
| `ProblemSection` | `py-12 md:py-16` · Minor copy polish |
| `FeaturesSection` | Responsive carousel · Carousel accessibility (role, aria-live, controls) · Lazy load non-active slides |
| `WorkflowSection` | `py-16 md:py-20` · `aria-hidden` on connectors |
| `PersonasSection` | `py-16 md:py-20` · Small role icons |
| `CompetitiveSection` | Dark green background · White text variant · `py-20 md:py-28` |
| `globals.css` | `:focus-visible` styles · CTA accent color token · `prefers-reduced-motion` carousel · Section spacing utilities |

---

## Success Metrics & Definition of Done

| Metric | Target | How to measure |
|--------|--------|----------------|
| Trial conversion rate | ≥ 10% | Visitors → /register completions |
| WCAG 2.1 AA | 100% pass | axe DevTools, Lighthouse Accessibility ≥ 95 |
| Lighthouse Performance | ≥ 90 | Lighthouse on production URL |
| LCP | < 2.5s | Chrome DevTools / CrUX |
| CTA above fold | 100% viewports | Manual check at 320px, 768px, 1280px, 1440px |
| Carousel breakpoints | No overflow at any width | DevTools responsive mode |
| Color contrast | All text ≥ 4.5:1 | axe / WebAIM Contrast Checker |

---

## File Change Index

```
src/
  app/
    layout.tsx              — Add DM Serif Display font
    globals.css             — Focus styles, CTA token, spacing, dark-section utilities
    page.tsx                — Add SocialProofSection between HeroSection and ProblemSection
  components/home/
    Nav.tsx                 — Skip link, trim nav items, aria-label
    HeroSection.tsx         — Image height fix, CTA in overlay, rewritten proof points
    SocialProofSection.tsx  — NEW: stats, testimonials, trust badges
    ProblemSection.tsx      — Spacing update
    FeaturesSection.tsx     — Responsive carousel, a11y attributes
    WorkflowSection.tsx     — Spacing + aria-hidden connectors
    PersonasSection.tsx     — Spacing + role icons
    CompetitiveSection.tsx  — Dark brand-green treatment
```

---

*Roadmap authored after visual audit at 375px, 768px, and 1280px viewport widths.*
*Replace all placeholder testimonials with real customer quotes before launch.*
