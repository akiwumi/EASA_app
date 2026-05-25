# Runtime Validation Playbook (Phase 1-3)

This playbook verifies the remaining checklist items that are runtime-dependent.

## Preconditions

- App is running locally (`npm run dev`) or deployed.
- Supabase migrations are applied in your target environment.
- You can sign in as:
  - `admin` user
  - non-admin user (for landing/page access checks)
- Cron secret configured for protected cron endpoints:
  - `SCHEDULED_PIPELINE_SECRET` or `CRON_SECRET`
- Email provider configured (`RESEND_API_KEY`) if validating outbound email delivery.

---

## 1) Non-admin lands on queue (Phase 1)

### Steps
1. Sign out.
2. Sign in with a non-admin user.
3. Observe post-login redirect.

### Pass criteria
- User lands on `/updates`, not `/dashboard`.

---

## 2) Queue only shows actionable items (Phase 1)

### Steps
1. Open `/updates`.
2. Confirm list contents and counts.
3. Optionally validate API payload directly:
   - Open browser devtools Network for `GET /api/updates?actionOnly=1&hasDraft=1`.

### Pass criteria
- No approved/rejected/boneyard items are shown.
- Only pending items with drafts appear.
- Items older than 90 days are not shown.

---

## 3) Review panel structure + low-confidence warning (Phase 1/2)

### Steps
1. Open a queue item (`/updates/[id]`).
2. Confirm three sections: Trigger, Match, Draft.
3. For a low-confidence item, verify visual warning.

### Pass criteria
- Trigger/Match/Draft structure is present and readable.
- Low-confidence item has warning treatment and caution message before approval.

---

## 4) Dismissal flow and audit trail (Phase 3.1)

### Steps
1. In queue or item page, click **Not relevant — dismiss**.
2. Enter/leave reason, confirm dismissal.
3. Open deleted/archive results view.
4. Verify dismissed item metadata.

### Pass criteria
- Inline confirmation is shown before commit.
- Dismissal stores and shows:
  - dismisser name/email
  - dismissed date/time
  - dismissal reason

---

## 5) Dismissed item does not reappear after next pipeline run (Phase 1/3)

### Steps
1. Dismiss one queue item.
2. Trigger a pipeline run (from dashboard button or API).
3. Refresh `/updates` and `/results`.

### Pass criteria
- Previously dismissed item does not return to active queue/results.

---

## 6) Compliance report PDF (Phase 3.2)

### Steps (UI)
1. Open `/reports` (admin/compliance_manager).
2. Select date range (e.g., last 90 days).
3. Click **Generate report**.

### Pass criteria
- File downloads as PDF.
- PDF includes:
  - summary counts
  - approved section
  - dismissed section (with reason)
  - pending section

### Optional API check
- Request:
  - `GET /api/reports/compliance?start=YYYY-MM-DD&end=YYYY-MM-DD`
- Expect:
  - status `200`
  - `content-type: application/pdf`

---

## 7) Revised copy metadata in DOCX (Phase 3.4)

### Steps
1. Approve one queue item.
2. Go to `/flightbooks`.
3. In **Current revised copies**, download DOCX.
4. Open document in Word/Pages.

### Pass criteria
- DOCX is a real `.docx` file (not HTML disguised as doc).
- Contains:
  - approver name/email
  - updated section list
  - EASA reference/published date (when linked data exists)

---

## 8) Pipeline summary card + per-part dashboard status (Phase 2.1/2.4)

### Steps
1. Run pipeline.
2. Open `/updates` and confirm latest scan summary card.
3. Open `/dashboard` and check **Regulation monitoring** table.

### Pass criteria
- Summary card includes new/skipped counts.
- Dashboard shows per-regulation-part rows with:
  - last checked
  - result (new/no changes/error)
  - next scheduled scan

---

## 9) Regulatory scope exclusion works (Phase 2.2)

### Steps
1. Open `/settings/scope`.
2. Deselect `Part-CAT`.
3. Save.
4. Run pipeline.
5. Check queue/results for `Part-CAT`.

### Pass criteria
- New findings for excluded part do not appear in queue/results.

---

## 10) Dedup behavior on back-to-back runs (Phase 2.3)

### Steps
1. Run pipeline once.
2. Immediately run pipeline again without changing sources.
3. Open `/updates` summary card and/or dashboard run summary.

### Pass criteria
- Second run creates zero additional new findings.
- Skipped-known count increases/reflects dedup.

---

## 11) Stale auto-archive + notification (Phase 3.5)

### Steps
1. Ensure there are test findings older than 90 days with no approved update.
2. Trigger stale archive route (or wait for scheduled window).
3. Check:
   - affected findings become archived/deleted
   - notifications created for admin/compliance_manager

### Pass criteria
- Eligible findings are auto-archived.
- Admin/compliance_manager notification is created.

### Manual trigger (example)
```bash
curl -X POST "http://localhost:3000/api/cron/archive-stale-findings" \
  -H "authorization: Bearer $CRON_SECRET"
```

---

## 12) Email notifications (Phase 3.3)

### Steps
1. Ensure `RESEND_API_KEY` and sender are configured.
2. Run pipeline that produces new findings.
3. Verify inbox for admin/compliance_manager recipients.
4. For weekly summary:
   - trigger scheduled route at matching time window or by controlled test call
   - confirm weekly email received.

### Pass criteria
- New findings email sent with queue link.
- Weekly summary email sent to admin/compliance_manager.

---

## 13) Mobile nav + swipe confirmation (Phase 3.6)

### Steps
1. In browser devtools mobile viewport (< 768px), open `/updates` and `/updates/[id]`.
2. Verify bottom nav has:
   - Today's Work
   - Flight Books
   - History
   - More
3. On review card, swipe:
   - right to reveal approve confirm
   - left to reveal dismiss confirm

### Pass criteria
- Bottom nav visible and usable.
- Swipe does not auto-commit; confirm tap required.

---

## Optional SQL spot checks (Supabase SQL editor)

Use these to quickly verify persistence and outcomes.

```sql
-- Recently dismissed findings (audit trail fields populated)
select id, dismissed_by, dismissed_at, dismissal_reason
from ai_findings
where dismissed_at is not null
order by dismissed_at desc
limit 20;

-- Scope filters currently active
select id, filter_type, filter_value, created_at
from org_finding_filters
order by created_at desc
limit 50;

-- Recent pipeline runs summary
select id, status, started_at, items_processed, changes_found, error_message
from pipeline_runs
order by started_at desc
limit 20;

-- Recent notifications
select id, type, title, body, created_at
from notifications
order by created_at desc
limit 50;
```

---

## Sign-off template

Mark each item after execution:

- [ ] Non-admin redirect
- [ ] Action-only queue behavior
- [ ] Trigger/Match/Draft + low-confidence warning
- [ ] Dismissal confirmation + archive metadata
- [ ] Dismissed item stays out after rerun
- [ ] Compliance report PDF output
- [ ] Revised DOCX metadata
- [ ] Scan summary card + per-part dashboard table
- [ ] Scope exclusion effect (`Part-CAT` test)
- [ ] Dedup on immediate second run
- [ ] Stale auto-archive + notifications
- [ ] New-findings + weekly emails
- [ ] Mobile bottom nav + swipe confirm

