# E2E QA Scaffold — book.v3ro.co.uk (V3RO-119)

**Branch:** `feature/hybrid-booking-public-app`  
**Target URL:** `https://book.v3ro.co.uk`  
**Scope:** Phase A — calendar-mode rendering and legacy fallback on the public booking page.  
**Tooling:** Manual QA checklist (automated Playwright suite to follow in Phase C after UAT branch is live — V3RO-125).

---

## Test Environment

| Item | Value |
|------|-------|
| App | vero-booking (Netlify preview) |
| Supabase | UAT / local (NOT prod `coolnnxvkbyjaehjeacd`) |
| Test accounts | Use `customer_account` rows with `hybrid_rollout_stage` values: `legacy`, `hybrid`, `calendar_hybrid` |
| Browser | Chrome + Firefox (latest stable) |
| Viewport | Desktop 1440×900 + Mobile 390×844 |

---

## Suite A — Legacy mode (hybrid_rollout_stage = 'legacy')

### A-1 — Page load
- [ ] `BookingPage` renders without JS errors
- [ ] Customer name, trade type, and phone appear in the header
- [ ] "Book an appointment" heading is visible
- [ ] No calendar-mode UI elements rendered (no slot picker, no calendar widget)

### A-2 — Lead capture form
- [ ] Name, phone, job description fields present and functional
- [ ] "Request a Callback" CTA submits successfully
- [ ] Confirmation message shown post-submit
- [ ] `onboarding_leads` row created in Supabase with correct `customer_account_id`

### A-3 — Legacy gate
- [ ] Confirm `hybrid_rollout_stage` column is read from `customer_account`
- [ ] With `stage = 'legacy'`: booking page shows legacy UI only
- [ ] With `stage = 'hybrid'` or `'calendar_hybrid'`: calendar-mode elements render (see Suite B)

---

## Suite B — Calendar mode (hybrid_rollout_stage = 'calendar_hybrid')

### B-1 — Working hours display
- [ ] `working_days` not null → show booked day chips
- [ ] `working_days` IS NULL → "Set your hours" banner shown, fallback 09:00–17:00 displayed
- [ ] `availability_from` / `availability_to` shown as slot range header
- [ ] `availability_timezone` used for display (default `Europe/London`)

### B-2 — Slot availability
- [ ] `check-availability` v5 is called with correct `customer_account_id`
- [ ] Available slots rendered as selectable buttons
- [ ] Past slots not shown (timezone-aware)
- [ ] Selecting a slot highlights it and enables the "Confirm" button

### B-3 — Booking confirmation
- [ ] Selecting a slot + submitting name/phone calls `confirm-booking` v8
- [ ] Response: confirmation screen with date/time, customer name
- [ ] `vero_calendar_slots` row transitions from `available` → `held` → `confirmed`
- [ ] SMS confirmation sent to caller (check Twilio logs in sandbox)
- [ ] No double-booking: selecting same slot on second session returns 409 / "slot unavailable"

### B-4 — Rate limit
- [ ] 61st `check-availability` request within 60s from same session → HTTP 429 with JSON `{"error":"rate_limit_exceeded"}`
- [ ] 31st `confirm-booking` request within 60s → HTTP 429

### B-5 — Consent
- [ ] Recording consent line visible before/during call flow
- [ ] `consent_withdrawn` toggle present on confirmation screen (if exposed)

---

## Suite C — Edge cases

### C-1 — Missing / unknown customer slug
- [ ] `?agent=unknown-slug` → 404 state rendered gracefully (no JS crash)
- [ ] Error logged to console as warning (not uncaught exception)

### C-2 — Supabase timeout / network error
- [ ] `check-availability` returns 503 → booking page shows "Slots unavailable right now" fallback
- [ ] Retry button present; re-triggers availability fetch

### C-3 — Mobile viewport
- [ ] Slot grid readable on 390px width
- [ ] Buttons tappable (min 44px touch target)
- [ ] "Set your hours" banner not truncated

### C-4 — Slow network (throttled to 3G via DevTools)
- [ ] Loading spinner shown while slots fetch
- [ ] No layout shift (CLS) during load

---

## Suite D — Regression (ensure legacy path unchanged)

### D-1 — Legacy callback flow byte-identity check
- [ ] Record network traffic for `check-availability` on a `legacy` account before and after deploying v5
- [ ] Response body, status code, and headers must be byte-identical to v4 recorded baseline
- [ ] Use `docs/regression-test-plan.md` Suite A for recorded baseline comparison

### D-2 — confirm-booking legacy byte-identity
- [ ] Same methodology as D-1 for v8 vs v7 baseline on a `legacy` account

---

## Suite E — Accessibility

- [ ] All interactive elements have accessible labels (check with axe DevTools)
- [ ] Colour contrast passes WCAG AA for slot buttons and CTAs
- [ ] Keyboard navigation: Tab → slot → Enter to confirm works end-to-end
- [ ] Screen reader: heading hierarchy correct (h1 → h2 → h3)

---

## Exit Criteria

All Suite A, B, C tests pass. Suite D passes (byte-identical confirmed). No P1 or P2 issues open.  
Suite E accessibility issues logged as follow-on tickets if found; do not block Phase A exit gate.

---

## Known Gaps (Phase A)

- Automated Playwright runner not yet wired — requires UAT Supabase branch (V3RO-125, Phase C scope)
- Microsoft Graph calendar slots not tested in Phase A (MS OAuth — V3RO-106 Phase B)
- `slot-holds` expiry cleanup not verified end-to-end (tested in isolation in `slot-holds/index.ts` unit tests)

---

## Tester Sign-off

| Suite | Tester | Date | Status |
|-------|--------|------|--------|
| A — Legacy | | | |
| B — Calendar | | | |
| C — Edge cases | | | |
| D — Regression | | | |
| E — Accessibility | | | |
