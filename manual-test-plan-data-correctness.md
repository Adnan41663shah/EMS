# OmniEMS — Manual Test Plan: Data Correctness (Deep)

**Scope:** the truth of the data. You are checking whether every number, flag and state the app shows is **correct
and consistent** — not whether it looks good. Ignore spacing, colours and wording unless a label states something
false.

**Build tested:** ____________  **Tester:** ____________  **Date:** ____________
**Environment:** ☐ localhost:3000  ☐ https://omniems.cloudblitz.ai

---

## How to run this

1. Work **top to bottom**. Sections 3 onward depend on leads created in Section 2.
2. Mark every row **PASS / FAIL / BLOCKED / N/A**. On FAIL use the report template at the end.
3. **Never repair data mid-run.** Record and continue — a second symptom often reveals the cause.
4. Screenshot every FAIL with the **full URL bar visible**.
5. Where a test says *recompute by hand*, actually do the arithmetic. That is the point of the test.

## 🔴 The golden rule

> **Every number must equal the list it opens.**

Tab, badge, KPI tile, dashboard card, sidebar count, report figure — **click it and count the rows**. If a tab says
5 and the list shows 12, that is a **FAIL** even when 12 is the "right" answer. Both must agree.

A live bug of exactly this shape exists (§1.7). Test this relentlessly.

## Configured rules these tests assume

Confirm in **Settings → Workflow** before starting. If your environment differs, **write the actual value in the
right-hand column and test against that**.

| Rule | Default | Your env |
|---|---|---|
| Required follow-ups (the `x/N` badge) | **12** | ______ |
| Minimum gap between follow-ups | **2 days** | ______ |
| Next-action gate enabled | **Yes** | ______ |
| Sub-stage compulsory on stage change | **No** (configurable) | ______ |
| Minimum comment length on stage change | **15 characters** | ______ |
| Release cooldown | **24 hours** | ______ |
| Claim requires a follow-up | **Yes** | ______ |
| Routing mode | **claim-pool** | ______ |
| Attend SLA | **30 minutes** | ______ |
| High-intent threshold | **AI score ≥ 70** or band = high | ______ |
| "Fresh" window | created **< 24h** **and** 0 follow-ups | ______ |
| "Open book" | anything **not admitted** | ______ |

## Test accounts

| Role | Login | Center(s) | Notes |
|---|---|---|---|
| Presales P1 | __________ | — | creates + forwards |
| Sales S1 | __________ | __________ | primary sales |
| Sales S2 | __________ | **same center as S1** | peer tests (§5) |
| Sales S3 | __________ | **different center** | isolation tests (§10) |
| Manager M1 | __________ | subset of centers | scoping tests |
| Admin A1 | __________ | all | reference truth |

> Ask an admin to provision these. **Never paste passwords into tickets, chat or this document.**

---

# §1 — Baseline: counts vs lists

Run as **each** of P1, S1, M1, A1 **before creating any data**. Record numbers per role.

| # | Where | Action | Expected | P/F |
|---|---|---|---|---|
| 1.1 | `/inquiries` | Record every tab number | — | |
| 1.2 | `/inquiries` | Click each tab; count rows | tab number **=** footer "N enquiries" **=** rows | |
| 1.3 | `/inquiries` | Compare footer vs pagination "of N" | identical | |
| 1.4 | `/inquiries` | Set page size 50 → 100 | total unchanged; no duplicate or missing rows | |
| 1.5 | `/inquiries` | Page 1 → 2 → back to 1 | same rows, same order | |
| 1.6 | Sidebar | Click every badge (Intake, All Inquiries, Centers, Follow-ups, Team Follow-ups) | badge **=** rows in the destination | |
| 1.7 | 🔴 `/inquiries?view=mine` as **S1** | Compare tabs vs row count | **Known bug:** tabs may under-count when S1 owns leads at other centers. Record tabs **and** row count separately | |
| 1.8 | `/dashboard` | Click through every number | each equals its list | |
| 1.9 | Any list | Apply a filter, then remove it | count returns to the original value exactly | |
| 1.10 | Any list | Sort by each sortable column | total never changes; only order does | |

---

# §2 — Lifecycle: presales → sales

Create real leads named `QA-01`, `QA-02`… so they are easy to find and clean up.

### 2A Presales creates

| # | Action | Expected | P/F |
|---|---|---|---|
| 2.1 | As **P1** create `QA-01` (unique phone) | saved; visible in `/intake` | |
| 2.2 | `/intake` count vs rows | equal | |
| 2.3 | Record initial state | Stage ______ Sub-stage ______ Owner ______ Next action ______ | |
| 2.4 | 🔴 Owner on a brand-new presales lead | **P1 owns it automatically** (auto-ownership before forwarding) | |
| 2.5 | Create `QA-02` with the **same phone** as `QA-01` | blocked **or** offered as re-engage — **never** a silent second record | |
| 2.6 | Search that phone | exactly **one** record | |
| 2.7 | Create `QA-03` with a phone belonging to a **sales-department** lead | duplicate rule applies **across departments**, not just within presales | |
| 2.8 | `QA-01` appears in `/inquiries` (All tab) | present | |
| 2.9 | Follow-up badge on `QA-01` | reads **0/12** (or `0/N` per your env) | |

### 2B Stage-change discipline

| # | Action | Expected | P/F |
|---|---|---|---|
| 2.10 | Change `QA-01` stage, leave comment **empty** | rejected — comment required | |
| 2.11 | Enter a **10-character** comment | rejected — minimum is **15** characters | |
| 2.12 | Enter 15+ characters, no next follow-up date | rejected — next-action gate | |
| 2.13 | If sub-stage is compulsory in your env, omit it | rejected | |
| 2.14 | Provide all required fields; save | succeeds | |
| 2.15 | Stage in the **detail page** after save | updated | |
| 2.16 | Return to `/inquiries` | row shows the **new** stage, no manual refresh needed | |
| 2.17 | History / timeline | shows **actor name**, timestamp, **old → new** value, and the comment | |
| 2.18 | Follow-up badge | incremented (e.g. **1/12**) | |
| 2.19 | Schedule the next follow-up **1 day** out | rejected or warned — minimum gap is **2 days** | |
| 2.20 | Set a **past** date as next follow-up | rejected | |
| 2.21 | Choose a terminal stage (e.g. Lost) | next-follow-up **not** required; a **lost reason** is | |
| 2.22 | After marking Lost, check counts | leaves open slices; Lost count +1 | |

### 2C Forward to sales

| # | Action | Expected | P/F |
|---|---|---|---|
| 2.23 | As **P1**, forward `QA-01` to **S1's center** | confirmation shown | |
| 2.24 | As **P1**, reopen `QA-01` | 🔴 **notes only** — cannot change stage, log calls, send WhatsApp, or schedule follow-ups | |
| 2.25 | As **P1**, try to edit or forward again | blocked | |
| 2.26 | As **P1**, add a note | allowed | |
| 2.27 | As **S1**, check `/intake` and `/inquiries` | appears as **pending attend** / unattended | |
| 2.28 | "Pending attend" count vs its list | equal | |
| 2.29 | Wait past the **30-minute** attend SLA (or use an aged lead) | flagged **SLA BREACH**; SLA breach count +1 | |
| 2.30 | As **S3** (different center), search `QA-01` | 🔴 **not visible** | |
| 2.31 | As **S3**, paste `QA-01`'s **direct URL** | 🔴 access denied — not the detail page | |

### 2D Claim discipline

| # | Action | Expected | P/F |
|---|---|---|---|
| 2.32 | As **S1**, claim `QA-01` | 🔴 requires scheduling a follow-up in the same action | |
| 2.33 | Try to claim without setting a follow-up | blocked | |
| 2.34 | After claiming | owner = S1; leaves unassigned/claimable list; that count −1 | |
| 2.35 | As **S2** (same center), try to claim the same lead | blocked, message names the current owner | |
| 2.36 | As **S2**, open `QA-01` | 🔴 read-only for follow-ups (peer restriction) — can view, cannot log follow-ups | |
| 2.37 | Two browsers claim simultaneously | exactly **one** succeeds; the other gets a clear rejection | |

### 2E Release

| # | Action | Expected | P/F |
|---|---|---|---|
| 2.38 | As **S1**, release `QA-01` with a reason | owner cleared; returns to the claimable pool | |
| 2.39 | Release without a reason | blocked | |
| 2.40 | As **S1**, immediately re-claim it | 🔴 blocked for **24 hours** (release cooldown) | |
| 2.41 | As **S2**, claim it immediately | allowed — cooldown applies to the releasing user only | |
| 2.42 | Counts after release | unassigned +1; S1's owned −1; both lists agree | |

### 2F Convert and admit

| # | Action | Expected | P/F |
|---|---|---|---|
| 2.43 | Advance `QA-01` to a stage mapped `countsAs: converted` | Converted count +1 | |
| 2.44 | Verify in Settings → Taxonomy which stages map to converted/admitted | record: ____________ | |
| 2.45 | Advance to a stage mapped `countsAs: admitted` | Admissions +1; **Student record created** | |
| 2.46 | `/admitted-students` | `QA-01` present | |
| 2.47 | `/inquiries?view=mine` as S1 | 🔴 `QA-01` **gone** — open book excludes admitted | |
| 2.48 | Dashboard admissions KPI | +1 versus your §1 baseline | |
| 2.49 | Convert **without** passing through required follow-ups | behaves per your configured gate — record what happened: ____________ | |

---

# §3 — Slice definitions

Test each as **P1, S1, M1, A1**. Definitions must hold for every role.

| # | Slice | Verify | P/F |
|---|---|---|---|
| 3.1 | **Overdue** | open 5 rows — every next-action date is **in the past** | |
| 3.2 | **Due today** | open 5 rows — every date is **today** | |
| 3.3 | **Fresh** | every row created **< 24h** ago **and** shows **0 follow-ups** | |
| 3.4 | **Unassigned** | every row has an **empty Owner** | |
| 3.5 | **Re-engaged** | every row is a returning lead, flagged as such | |
| 3.6 | **Needs attention** | every row shows **"Not set"** for next action | |
| 3.7 | **High-intent** | every row has **AI score ≥ 70** or band = high | |
| 3.8 | **Pending attend** | every row is forwarded-to-sales and unattended | |
| 3.9 | 🔴 Overdue ∩ Due today | **no lead appears in both** | |
| 3.10 | 🔴 Fresh ∩ Overdue | no overlap (fresh means 0 follow-ups) | |
| 3.11 | 🔴 Unassigned ∩ My open | no overlap | |
| 3.12 | Overdue + Due today + not-yet-due | totals the **Pending** figure elsewhere | |
| 3.13 | Every slice | count **=** list rows, for **every** role | |

### Transitions — the numbers must move

| # | Action | Expected | P/F |
|---|---|---|---|
| 3.14 | Log a follow-up on an **overdue** lead, future date | leaves Overdue **immediately**; Overdue −1; scheduled +1 | |
| 3.15 | Set a next action on a **Needs attention** lead | leaves the slice; count −1 | |
| 3.16 | Claim an **unassigned** lead | Unassigned −1; My open +1 | |
| 3.17 | Complete a **due-today** follow-up | Due today −1 | |
| 3.18 | Let a due-today follow-up pass midnight (or use an aged lead) | moves to Overdue; both counts adjust | |
| 3.19 | Admit a lead | leaves **all** open slices | |
| 3.20 | After each of 3.14–3.19 | 🔴 the **sidebar badge** updates too, not just the tab | |

---

# §4 — Dashboards

Run as **S1, P1, M1, A1** — each sees a different dashboard.

| # | Action | Expected | P/F |
|---|---|---|---|
| 4.1 | Click through **every** number | each equals its list | |
| 4.2 | Switch period Today → 7D → 30D → Quarter | **all** panels update; none retain a stale figure | |
| 4.3 | Set a custom range | every panel honours it | |
| 4.4 | Set a range with **no data** | shows 0 / "—", never blank or an error | |
| 4.5 | Conversion % | recompute: converted ÷ total. Matches? | |
| 4.6 | Attend rate | recompute: (leads − unattended) ÷ leads | |
| 4.7 | Funnel — each stage | count equals the list it opens | |
| 4.8 | Funnel — later stage larger than earlier | must be **explained on screen**, not a bare number | |
| 4.9 | Branch table — sum leads across branches | equals the org total | |
| 4.10 | Branch table — sum admissions | equals the admissions KPI | |
| 4.11 | Team table — sum each rep's pending | equals the header total | |
| 4.12 | 🔴 Per rep: overdue vs pending | **overdue can never exceed pending** | |
| 4.13 | Note dashboard figures, open `/reports`, same period | 🔴 same metric = **same number** | |
| 4.14 | Hard-refresh twice | identical numbers both times | |
| 4.15 | Leave open 5 minutes, refresh | numbers still reconcile (caching must not alter values) | |
| 4.16 | As **M1** | only permitted centers appear anywhere on the page | |

---

# §5 — Follow-up pages

`/my-follow-ups` (presales) · `/sales/my-follow-ups` (sales) · `/admin/my-follow-ups`

| # | Action | Expected | P/F |
|---|---|---|---|
| 5.1 | Every count vs list | equal | |
| 5.2 | Overdue / Due today / Upcoming buckets | each row matches its bucket definition | |
| 5.3 | A rep's total here | 🔴 equals their number in `/admin/team-follow-ups` | |
| 5.4 | Complete a follow-up | disappears from pending; completed +1; both agree | |
| 5.5 | Complete with a next follow-up scheduled | new one appears in the correct bucket | |
| 5.6 | Complete **without** a next action | lead lands in **Needs attention** | |
| 5.7 | As **S2**, look for **S1's** follow-ups | not present — personal page only | |
| 5.8 | Bulk-complete several | count decreases by **exactly** the number completed | |
| 5.9 | Export CSV (if present) | row count matches the on-screen count | |

---

# §6 — Team follow-ups (`/admin/team-follow-ups`)

Admin + Manager only.

| # | Action | Expected | P/F |
|---|---|---|---|
| 6.1 | Each rep's pending vs their drill-down | equal | |
| 6.2 | Sum of all reps | equals the team total | |
| 6.3 | Overdue ≤ pending, per rep | always | |
| 6.4 | A rep with zero pending | shows **0 / Clear** — not blank, not an error | |
| 6.5 | 🔴 A rep's number here vs that rep's own follow-ups page | **identical** | |
| 6.6 | As **M1** | only reps in permitted centers | |
| 6.7 | Reps grouped by branch | each under the correct branch | |
| 6.8 | An inactive/deactivated user | handled sensibly — record behaviour: ____________ | |
| 6.9 | Change period | all rep numbers update together | |

---

# §7 — Reports (`/reports`)

| # | Action | Expected | P/F |
|---|---|---|---|
| 7.1 | Org level — record leads, conversions, admissions | — | |
| 7.2 | Sum of all **branches** | 🔴 equals the org total | |
| 7.3 | Within a branch, sum of all **persons** | 🔴 equals the branch total | |
| 7.4 | Back-navigate at every level | returns to the same numbers | |
| 7.5 | Change period at each level | all levels stay consistent | |
| 7.6 | A rep's numbers here vs `/admin/team-follow-ups` | same rep + period → same numbers | |
| 7.7 | Targets vs actuals | recompute achievement % = actual ÷ target | |
| 7.8 | A rep with **no target set** | shows "—", never 0% or ∞ | |
| 7.9 | Funnel in reports vs funnel on dashboard | identical for the same period | |
| 7.10 | City / center selector | data changes; totals still reconcile | |
| 7.11 | As **M1** | only permitted centers in **every** dropdown | |
| 7.12 | AI insight / coaching text | 🔴 numbers **inside the text** match the tables | |
| 7.13 | Loss reasons — sum | equals total lost | |
| 7.14 | Export / print (if present) | matches what is on screen | |

---

# §8 — Intake (`/intake`)

| # | Action | Expected | P/F |
|---|---|---|---|
| 8.1 | Every tab count vs rows | equal | |
| 8.2 | Create a lead in another browser | appears within seconds, no manual refresh | |
| 8.3 | Website-form lead | correct source label | |
| 8.4 | Missed-call lead | appears with call source; linked call record | |
| 8.5 | Re-engaged lead | 🔴 flagged as re-engaged (this was previously broken — check carefully) | |
| 8.6 | Claim from intake | requires a follow-up; owner set; intake count −1 | |
| 8.7 | Two users claim the same row simultaneously | one succeeds, one clear rejection | |
| 8.8 | SLA countdown / breach flag | matches the **30-minute** rule | |
| 8.9 | Filters (course, center, source) | count and list agree after each | |

---

# §9 — Cross-surface consistency 🔴 (highest value)

One fact, seen from many places. **All must agree.**

| # | The fact | Check in | P/F |
|---|---|---|---|
| 9.1 | One lead's stage, sub-stage, owner, next action | detail page · `/inquiries` row · `/intake` · search results | |
| 9.2 | One rep's pending follow-ups | own follow-ups page · team follow-ups · dashboard · reports | |
| 9.3 | One branch's lead count | dashboard branch table · reports branch view · `/centers` | |
| 9.4 | Total admissions | dashboard KPI · `/admitted-students` · reports | |
| 9.5 | Total overdue | dashboard KPI · `/inquiries` overdue · team follow-ups sum | |
| 9.6 | Unassigned count | dashboard card · `/inquiries` unassigned tab · sidebar | |
| 9.7 | One lead's follow-up count `x/12` | detail page · list column · history entry count | |
| 9.8 | Change a stage as S1, then check M1's dashboard | updates within seconds; no stale value persists | |
| 9.9 | Same period selected everywhere | every surface reports the same totals | |

---

# §10 — Permissions and isolation 🔴 SECURITY

**Report any failure here immediately — do not batch with the rest.**

| # | Action | Expected | P/F |
|---|---|---|---|
| 10.1 | **S1** searches for an **S3-center** lead | not visible | |
| 10.2 | **S1** opens an S3 lead by **direct URL** | access denied | |
| 10.3 | **S1** opens an S3 lead's **API URL** directly in the browser | denied, not JSON data | |
| 10.4 | **M1** across every list, dashboard, report | only permitted centers, everywhere | |
| 10.5 | **M1** opens `/settings` | 🔴 blocked (manager has all access **except** Settings and Users) | |
| 10.6 | **M1** opens `/users` | 🔴 blocked | |
| 10.7 | **P1** opens `/settings`, `/users`, `/admin/team-follow-ups` | blocked | |
| 10.8 | **S1** opens `/admin/team-follow-ups`, `/reports` | blocked or correctly scoped — record: ____________ | |
| 10.9 | Log out → press **Back** | no data; redirected to login | |
| 10.10 | Log out, log in as a **different** user | 🔴 **no trace** of the previous user's data in any list or count | |
| 10.11 | Deactivate a user (as admin), then use their open session | blocked on next action | |
| 10.12 | Change a user's center, then reload their session | scoping updates accordingly | |

---

# §11 — Migrated production data

The database holds ~40k restored production records. These target migration artefacts.

| # | Action | Expected | P/F |
|---|---|---|---|
| 11.1 | `/inquiries` → Stage filter dropdown | 🔴 only configured taxonomy stages. **No "warm" / "cold" / "hot"** as stages — those are temperature | |
| 11.2 | Sort by Stage; look for blanks | few or none empty | |
| 11.3 | Filter by each stage individually | count = list, every time | |
| 11.4 | Sample 10 leads older than 6 months | owner, stage, next action all populated | |
| 11.5 | `/admitted-students` count vs admissions KPI | equal | |
| 11.6 | Search for obviously duplicated names / phones | record findings — **do not merge** | |
| 11.7 | An old lead's marketing source | 🔴 **"Unattributed"** — never an invented campaign | |
| 11.8 | Phone formats, old vs new leads | consistent | |
| 11.9 | An old lead's follow-up history | present and chronological | |
| 11.10 | Old leads' `x/12` badge | plausible, not 0 for a lead with visible history | |
| 11.11 | Total inquiries shown vs expected ~40,562 | record actual: ____________ | |
| 11.12 | 🔴 Any WhatsApp / bulk messaging screen | old leads are **excluded pending consent** — no send is possible to them | |

---

# §12 — Live updates and caching

| # | Action | Expected | P/F |
|---|---|---|---|
| 12.1 | Two browsers, two users. A creates a lead | appears for B (if in scope) within seconds | |
| 12.2 | A logs a follow-up | B's counts update without a refresh | |
| 12.3 | A claims a lead | disappears from B's unassigned list | |
| 12.4 | Disconnect network, act, reconnect | counts **reconcile** — no permanently stale badge | |
| 12.5 | Leave a tab open 30 minutes, then interact | data correct, not frozen | |
| 12.6 | Refresh the same page 3 times in a row | 🔴 identical numbers each time | |
| 12.7 | Open the same list in two tabs | identical numbers | |
| 12.8 | Act in tab 1, switch to tab 2 | tab 2 reflects the change | |

---

# §13 — Edge cases

| # | Action | Expected | P/F |
|---|---|---|---|
| 13.1 | Search a phone with `+91` and without | same lead found both ways | |
| 13.2 | Search a **partial** name (middle of the string) | record behaviour — prefix-only search is a known limitation | |
| 13.3 | Search with a typo | record behaviour | |
| 13.4 | A lead with **no** follow-ups | shows 0/12, appears in Fresh | |
| 13.5 | A lead with **12+** follow-ups | badge caps correctly; lost-after-N gate behaves per settings | |
| 13.6 | Name with special characters / non-Latin script | saves and displays correctly | |
| 13.7 | A very old lead (2+ years) | age column correct | |
| 13.8 | Date filter crossing a month boundary | inclusive of both endpoints | |
| 13.9 | Date filter set to a **single** day | shows only that day | |
| 13.10 | Filter combination returning zero rows | shows an empty state and **count 0** — not an error | |
| 13.11 | Rapidly toggle a filter 5 times | settles on the correct count, no flicker to a wrong value | |

---

# Reporting a failure

```
Test #:
URL (full):
Logged in as:            role ______  center ______
Period / filters active:
Expected:
Actually saw:
Screenshot:              (URL bar visible)
Time (with timezone):
Reproducible:            yes / no  — tried ___ times
Also affects other roles? 
```

**Escalate immediately, do not wait for the run to end:**
- Anything in **§10** — a user seeing another user's or center's data
- Any count differing from its list by a **large** margin
- Any number that **changes between two refreshes** with no action taken
- Any lead that **disappears** without an explicit action

---

## Summary

| § | Area | Tests | Pass | Fail | Blocked |
|---|---|---|---|---|---|
| 1 | Counts vs lists | 10 | | | |
| 2 | Lifecycle presales→sales | 49 | | | |
| 3 | Slice definitions | 20 | | | |
| 4 | Dashboards | 16 | | | |
| 5 | Follow-up pages | 9 | | | |
| 6 | Team follow-ups | 9 | | | |
| 7 | Reports | 14 | | | |
| 8 | Intake | 9 | | | |
| 9 | Cross-surface | 9 | | | |
| 10 | Permissions 🔴 | 12 | | | |
| 11 | Migrated data | 12 | | | |
| 12 | Live updates | 8 | | | |
| 13 | Edge cases | 11 | | | |
| | **Total** | **188** | | | |

**Blocking issues found:** ____  **Sign-off:** ____________  **Date:** ________

**Cleanup:** delete every `QA-` lead created in this run, or hand the list to an admin. Note any that **cannot** be
deleted — that is itself a finding.
