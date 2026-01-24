# SYSTEM.md — File System Blueprint (No Code)

This document defines a comprehensive project file system that aligns with
`docs/CONTENT.md` (product scope) and `docs/DESIGN_SYS.md` (design system).
It is a structure and content guide only.

---

## 1) Repository Root

```
EASA_app/
├─ docs/
├─ web/
├─ supabase/
├─ data/
├─ design/
├─ scripts/
├─ tests/
├─ config/
└─ README.md
```

### Root purpose
- `docs/` contains product, UX, and design documentation.
- `web/` is the React + Tailwind frontend.
- `supabase/` houses backend schema, policies, and functions.
- `data/` stores local fixtures and sample source material (non-prod).
- `design/` contains tokens and UI references derived from design system.
- `scripts/` holds developer utilities (no app logic).
- `tests/` contains integration and E2E scenarios.
- `config/` centralizes shared configuration and environment templates.
- `README.md` summarizes the product and setup flow.

---

## 2) Documentation (`docs/`)

```
docs/
├─ CONTENT.md
├─ DESIGN_SYS.md
├─ SYSTEM.md
├─ product/
│  ├─ scope.md
│  ├─ roles-and-permissions.md
│  ├─ workflows.md
│  ├─ risks-and-mitigations.md
│  └─ milestones.md
├─ ux/
│  ├─ information-architecture.md
│  ├─ user-flows.md
│  ├─ screen-inventory.md
│  └─ copy-guidelines.md
├─ data-model/
│  ├─ entities.md
│  ├─ relationships.md
│  ├─ versioning.md
│  └─ audit-log.md
└─ operations/
   ├─ observability.md
   ├─ reliability.md
   └─ security.md
```

### Documentation focus
- Product scope, roles, UX flows, and operational concerns.
- Conceptual data model and versioning strategy.
- Security and audit requirements aligned with RLS and tenancy.

---

## 3) Frontend (`web/`)

```
web/
├─ public/
│  ├─ icons/
│  ├─ images/
│  └─ manifest/
├─ src/
│  ├─ app/
│  │  ├─ routes/
│  │  ├─ layouts/
│  │  └─ providers/
│  ├─ screens/
│  │  ├─ auth/
│  │  ├─ dashboard/
│  │  ├─ update-queue/
│  │  ├─ diff-viewer/
│  │  ├─ flightbook/
│  │  ├─ time-machine/
│  │  └─ settings/
│  ├─ components/
│  │  ├─ navigation/
│  │  ├─ cards/
│  │  ├─ charts/
│  │  ├─ tables/
│  │  ├─ forms/
│  │  ├─ badges/
│  │  └─ modals/
│  ├─ design-system/
│  │  ├─ tokens/
│  │  ├─ themes/
│  │  └─ primitives/
│  ├─ hooks/
│  ├─ lib/
│  ├─ services/
│  ├─ state/
│  ├─ types/
│  ├─ utils/
│  └─ styles/
│     ├─ globals/
│     └─ themes/
├─ tests/
└─ README.md
```

### Frontend notes
- **Screens** map directly to key UX flows in CONTENT: Dashboard, Update Queue,
  Diff Viewer, Flight Book Viewer, Time Machine, Settings, and Auth.
- **Design-system** folder is the single source of UI tokens (color, type,
  spacing, radius, elevation) and theme variants (light/dark).
- **Components** align with DESIGN_SYS: navigation, cards, charts, chips,
  buttons, inputs, tags, lists.

---

## 4) Backend (`supabase/`)

```
supabase/
├─ migrations/
│  ├─ schema/
│  ├─ rls-policies/
│  └─ triggers/
├─ functions/
│  ├─ ingestion-worker/
│  ├─ diff-worker/
│  ├─ relevance-engine/
│  ├─ patch-generator/
│  ├─ apply-update/
│  ├─ rollback/
│  └─ notifications/
├─ storage/
│  ├─ snapshots/
│  └─ artifacts/
├─ sql/
│  ├─ seed/
│  └─ views/
└─ README.md
```

### Backend notes
- **Functions** map to daily pipeline steps: ingestion → diff → classify →
  propose patches → apply/rollback → notify.
- **Migrations** enforce RLS, audit logging, and tenant isolation.
- **Storage** holds raw snapshots (PDF/HTML) and parsing artifacts.

---

## 5) Data & Fixtures (`data/`)

```
data/
├─ sources/
│  ├─ easa/
│  │  ├─ html/
│  │  ├─ pdf/
│  │  └─ rss/
│  └─ notes.md
├─ fixtures/
│  ├─ flightbooks/
│  ├─ mappings/
│  └─ diffs/
└─ samples/
   ├─ parsed-sections/
   └─ snapshots/
```

### Data focus
- Safe, local-only samples for tests and UX demos.
- Example “flight books” and EASA snapshots for diff validation.

---

## 6) Design Assets (`design/`)

```
design/
├─ tokens/
│  ├─ color.md
│  ├─ type.md
│  ├─ space.md
│  ├─ radius.md
│  └─ elevation.md
├─ themes/
│  ├─ light.md
│  └─ dark.md
├─ components/
│  ├─ buttons.md
│  ├─ navigation.md
│  ├─ cards.md
│  ├─ inputs.md
│  ├─ chips.md
│  ├─ lists.md
│  ├─ charts.md
│  └─ badges.md
└─ references/
   ├─ desktop-light.md
   ├─ desktop-dark.md
   └─ mobile.md
```

### Design alignment
- Token files mirror DESIGN_SYS foundations and naming conventions.
- Component guides reflect visual specs and behavior for both themes.

---

## 7) Scripts (`scripts/`)

```
scripts/
├─ data/
│  ├─ import-snapshots.md
│  └─ normalize-docs.md
├─ ops/
│  ├─ run-pipeline.md
│  └─ verify-diffs.md
└─ README.md
```

### Script intent
- Document-only runbooks for ingestion, diffing, and verification.

---

## 8) Tests (`tests/`)

```
tests/
├─ integration/
│  ├─ ingestion.md
│  ├─ diffing.md
│  ├─ relevance.md
│  ├─ approvals.md
│  └─ rollback.md
├─ e2e/
│  ├─ auth.md
│  ├─ update-queue.md
│  ├─ diff-viewer.md
│  ├─ flightbook.md
│  └─ time-machine.md
└─ data/
   ├─ fixtures.md
   └─ scenarios.md
```

### Testing focus
- Validate the daily pipeline and approval workflow.
- Ensure rollback and version comparison are consistent.

---

## 9) Config (`config/`)

```
config/
├─ env/
│  ├─ frontend.example.md
│  └─ backend.example.md
├─ roles-permissions.md
├─ routing.md
└─ feature-flags.md
```

### Config focus
- Role-to-permission mapping based on Admin/Editor/Viewer.
- Routing map for key screens and flows.

---

## 10) Key Screen-to-File Mapping (Reference)

- Dashboard → `web/src/screens/dashboard/`
- Update Review Queue → `web/src/screens/update-queue/`
- Diff Viewer → `web/src/screens/diff-viewer/`
- Flight Book Viewer → `web/src/screens/flightbook/`
- Time Machine → `web/src/screens/time-machine/`
- Settings → `web/src/screens/settings/`
- Auth → `web/src/screens/auth/`

---

## 11) Design System Coverage Map

- Foundations (color, type, spacing, radius, elevation) → `design/tokens/`
- Theme behavior (light/dark) → `design/themes/`
- Components (navigation, buttons, chips, cards, lists, inputs, charts, badges)
  → `design/components/`

---

## 12) Governance & Audit References

- Audit log definition → `docs/data-model/audit-log.md`
- RLS strategy → `docs/operations/security.md`
- Versioning & rollback → `docs/data-model/versioning.md`

