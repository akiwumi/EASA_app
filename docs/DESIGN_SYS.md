# Design System (Desktop + Mobile)

Based on the reference images:
- Desktop light: `temp imgs/dashboard.png`
- Desktop dark: `temp imgs/dashboard_dark.png`
- Mobile/tablet: `temp imgs/ui_mobile.png`

## Foundations

### Color Palette

#### Light Theme (desktop + mobile)
- Ink 900: `#1E1F24` (primary text)
- Ink 700: `#3C3F49` (secondary text)
- Ink 500: `#6C6F7B` (muted text, icons)
- Ink 300: `#A9ADB8` (disabled text, borders)
- Surface 000: `#FFFFFF` (primary background)
- Surface 050: `#F6F7FA` (app background)
- Surface 100: `#EEF1F6` (cards, inputs)
- Surface 200: `#E3E7EE` (dividers)
- Brand Teal: `#1F3434` (selected chips/toggles)
- Accent Blue: `#2F73F0` (line chart, links)
- Accent Orange: `#F29B3F` (donut highlight)
- Accent Purple: `#7D3FF2` (progress)
- Accent Pink: `#F35B7F` (progress)
- Accent Green: `#22C55E` (success)
- Accent Cyan: `#21B4F3` (progress)
- Warning: `#F6B34D`

#### Dark Theme (desktop)
- Ink 900: `#F2F2F4` (primary text)
- Ink 700: `#C7C8CD` (secondary text)
- Ink 500: `#8D9099` (muted)
- Surface 950: `#1A1A1C` (app background)
- Surface 900: `#232427` (cards)
- Surface 850: `#2B2D31` (raised cards)
- Stroke 700: `#3A3C41` (borders)
- Brand Orange: `#F07A2B` (active tab, CTA)
- Accent Blue: `#5AA2FF`
- Accent Green: `#43D17B`
- Accent Yellow: `#F4C752`
- Accent Red: `#F05C62`
- Accent Teal: `#3CC8B4`

### Typography

#### Font Families
- Primary: `Inter`, `SF Pro`, `Segoe UI`, `system-ui`, sans-serif
- Display (optional): `Poppins` (for large headings)

#### Type Scale (Desktop)
- Display: 32/40, 600
- H1: 26/34, 600
- H2: 22/30, 600
- H3: 18/26, 600
- Body M: 14/22, 500
- Body S: 12/18, 500
- Caption: 11/16, 500

#### Type Scale (Mobile)
- Display: 26/34, 600
- H1: 22/30, 600
- H2: 20/28, 600
- H3: 16/24, 600
- Body M: 14/22, 500
- Body S: 12/18, 500
- Caption: 11/16, 500

### Spacing
- 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64
- Desktop page padding: 32
- Desktop card padding: 20
- Mobile page padding: 20
- Mobile card padding: 16

### Radius
- XS: 8 (chips, small inputs)
- S: 12 (cards, list items)
- M: 16 (large cards, panels)
- L: 24 (mobile cards, hero blocks)
- XL: 32 (mobile device frames)
- Pill: 999

### Elevation

#### Light
- 1: `0 2px 8px rgba(20, 20, 30, 0.06)`
- 2: `0 6px 20px rgba(20, 20, 30, 0.08)`

#### Dark
- 1: `0 2px 10px rgba(0, 0, 0, 0.35)`
- 2: `0 8px 30px rgba(0, 0, 0, 0.45)`

### Iconography
- Style: line icons, 1.5px to 2px stroke
- Size: 20 (default), 24 (navigation), 16 (micro)
- Corner style: rounded caps and joins

### Token Naming (EASA Conventions)
- Prefix all tokens with `--easa-`
- Format: `--easa-{category}-{role}-{state?}-{scale?}`
- Categories: `color`, `type`, `space`, `radius`, `shadow`, `z`
- Examples: `--easa-color-text-primary`, `--easa-color-surface-1`, `--easa-radius-md`

## Layout System

### Desktop (1440px baseline)
- Grid: 12 columns
- Gutter: 24
- Card columns: 3-4 cards per row
- Side navigation: 72px collapsed, 240px expanded
- Top bar height: 64
- Widget height: 220-280

### Mobile (375px baseline)
- Grid: 4 columns
- Gutter: 16
- Bottom bar height: 64
- Card width: 100%
- Section spacing: 16-24

## Components

### Navigation
- Desktop top tabs: pill buttons with soft fill on active
- Desktop sidebar: icon-only or icon + label, rounded container
- Mobile bottom bar: pill container with 5 items, center active

### Buttons
- Primary (light): brand teal fill, white text, radius 999
- Primary (dark): brand orange fill, white text, radius 999
- Secondary: surface fill with stroke, ink text
- Icon button: 36x36, circular, soft fill

### Chips / Segmented Control
- Height: 28-32
- Active: filled (brand color)
- Inactive: surface outline
- Text: 12-13, 500

### Cards
- Light: white surface, subtle shadow, 16 radius
- Dark: dark surface, thin border, 16 radius
- Header: title + action icon
- Content: charts, lists, progress

### Lists / Rows
- Row height: 56-64
- Left: avatar/icon in 32 circle
- Right: count tag or action button
- Divider: optional 1px `Surface 200` or `Stroke 700`

### Inputs / Search
- Height: 36-40
- Fill: `Surface 100` (light) / `Surface 850` (dark)
- Icon left, placeholder in muted ink

### Charts
- Line: 2px stroke, soft grid lines
- Donut: 5-6 segments, 70-90 thickness, rounded ends
- Progress bars: pill track, 8-10 height

### Tags / Badges
- Pill: 24 height, 10-12 text
- Status colors: green, orange, red, blue

## Theme Behavior

### Light
- Use soft surfaces and subtle shadows
- Keep borders faint (Surface 200)
- Use brighter accent colors sparingly for focus

### Dark
- Prefer borders over heavy shadows
- Use warm accents (orange) for active states
- Keep text contrast high and avoid pure black

## Accessibility Contrast Notes

- Text (body, labels) must be at least 4.5:1 against its background
- Large text (18+ or 14+ bold) must be at least 3:1
- Icons, charts, and interactive component outlines must be at least 3:1
- Disabled text can be lower, but keep it at 3:1 minimum when it is still actionable
- Ensure focus rings are visible against both `surface` and `brand` colors

## Example Token Map

```
--easa-color-bg: #F6F7FA;
--easa-color-surface-1: #FFFFFF;
--easa-color-surface-2: #EEF1F6;
--easa-color-text-primary: #1E1F24;
--easa-color-text-muted: #6C6F7B;
--easa-color-border: #E3E7EE;
--easa-color-brand-primary: #1F3434;
--easa-color-accent-blue: #2F73F0;
--easa-radius-md: 16px;
--easa-shadow-1: 0 2px 8px rgba(20, 20, 30, 0.06);
```

## Responsive Guidance
- Desktop cards flow in 3-4 columns; collapse to 2 on tablet
- Mobile uses stacked cards and a bottom navigation pill
- Typography steps down one level for mobile
