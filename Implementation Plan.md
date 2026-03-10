# IVR (TeleCMI) Calling Integration – Implementation Plan

This document is the master plan for integrating **TeleCMI** IVR calling into the EMS-CloudBlitz CRM. It covers architecture, folder structure, APIs, data models, and a step-by-step implementation checklist with best practices.

---

## Table of Contents

1. [Overview & Goals](#1-overview--goals)
2. [TeleCMI Integration Summary](#2-telecmi-integration-summary)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Folder & File Structure](#4-folder--file-structure)
5. [Data Models](#5-data-models)
6. [API Design](#6-api-design)
7. [Frontend Components & Flows](#7-frontend-components--flows)
8. [Step-by-Step Implementation Plan](#8-step-by-step-implementation-plan)
9. [Environment & Configuration](#9-environment--configuration)
10. [Security & Best Practices](#10-security--best-practices)
11. [TeleCMI Dashboard Setup](#11-telecmi-dashboard-setup)
12. [Testing Strategy](#12-testing-strategy)

---

## 1. Overview & Goals

### Functional Requirements

| # | Requirement | Description |
|---|-------------|-------------|
| 1 | **Incoming call popup** | When a call hits the IVR number, a popup appears in the CRM for relevant users. |
| 2 | **Auto-create inquiry** | If the caller’s number does not exist in the CRM, create an inquiry with **only the phone number** (no other required details). Use sensible defaults for required fields (e.g. `medium: 'IVR'`, default `preferredLocation`). |
| 3 | **Existing contact popup** | If the phone number already exists, the popup shows **full inquiry details** (basic info + last activity). |
| 4 | **Answer from CRM** | User can **accept/answer** the call from the CRM (via TeleCMI softphone or answer API). |
| 5 | **Call controls** | User can perform **mute**, **hold**, **hangup** (and any other TeleCMI-supported actions) from the CRM. |
| 6 | **Auto recording** | Calls are recorded automatically; recording is linked to the call in the CRM. |
| 7 | **Activity timeline** | Call appears in the inquiry’s **Activity** section: ringing time, answered time, duration, recording link, and who attended. |

### Non-Functional

- Production-ready, maintainable code.
- Clear separation: webhooks, call service, API, frontend.
- Secure webhook verification and env-based configuration.

---

## 2. TeleCMI Integration Summary

Before implementing, follow the official TeleCMI **Get Started** guide to:

- Create a TeleCMI account and verify your mobile number.
- Choose and configure your **business number** (the IVR/DID that will receive calls).
- Familiarize yourself with TeleCMI **Webhooks** and **Call Analysis APIs**.

Key docs:

- [Get Started](https://doc.telecmi.com/chub/docs/get-started/)
- [Webhooks Overview](https://doc.telecmi.com/chub/docs/webhooks-overview)
- [Call Analysis (CDR APIs)](https://doc.telecmi.com/chub/docs/call-analysis)
- [Login Token (User Authentication)](https://doc.telecmi.com/chub/docs/login-token/)
- [User Incoming Calls API](https://doc.telecmi.com/chub/docs/agent-incoming/)

### 2.1 What We Use

| Feature | Purpose |
|--------|----------|
| **Live Events webhook** | Notify our backend when a call is **ringing**, **answered**, or **ended**. Used to show popup and update call state. |
| **CDR webhook** | After call ends, receive **duration**, **recording filename**, etc. Used to persist final call record and activity. |
| **REST APIs** | **Answer** (if applicable), **Hangup**, **Mute/Hold** (if supported by TeleCMI), **Recording download**. |
| **User login token** | TeleCMI `token` for authenticated API calls (hangup, etc.). Can be per-agent or app-level. |

### 2.2 Key TeleCMI Endpoints (Reference)

| Action | Method | URL | Notes |
|--------|--------|-----|------|
| Get user token | POST | `https://rest.telecmi.com/v2/user/login` | Body: `id`, `password` (TeleCMI user) – see [Login Token](https://doc.telecmi.com/chub/docs/login-token/). |
| Hangup | POST | `https://rest.telecmi.com/v2/c2c/hangup` | Body: `token`, `cmiuuid` |
| Incoming CDR (answered/missed) | POST | `https://rest.telecmi.com/v2/user/in_cdr` | Body: `token`, `type`, `from`, `to` (timestamps), `page`, `limit` – see [User Incoming Calls API](https://doc.telecmi.com/chub/docs/agent-incoming/). |
| Download recording | GET | `https://rest.telecmi.com/v2/play` | Query: `appid`, `secret`, `filename` – see **Download VoiceMail/Recorded File** in [Call Analysis](https://doc.telecmi.com/chub/docs/call-analysis). |

### 2.3 Webhook Payloads (Typical)

**Live Event (e.g. incoming ringing/answered):**

```json
{
  "type": "event",
  "direction": "inbound",
  "conversation_uuid": "5202a928-07c3-4d32-a1a4-d304c9275971",
  "cmiuuid": "5202a928-07c3-4d32-a1a4-d304c9275971",
  "from": "919876543210",
  "to": "911234567890",
  "app_id": 2222223,
  "time": 1634724624830,
  "status": "ringing"
}
```

**CDR (after call ends):**  
Contains `cmiuuid`, `from`, `duration`, `billedsec`, `filename` (recording), etc. Exact structure should be confirmed from TeleCMI docs for your plan.

---

## 3. High-Level Architecture

```
                    TeleCMI
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   Live Events      CDR (end)    User actions
   (ringing/        (duration,   (answer/hangup/
    answered)        recording)   mute/hold)
        │              │              │
        ▼              ▼              ▼
   POST /webhooks/telecmi/live
   POST /webhooks/telecmi/cdr
        │              │
        ▼              ▼
   ┌─────────────────────────────────────┐
   │           Backend (Node/Express)     │
   │  • Validate webhook (signature/ip)   │
   │  • Find or create inquiry by phone   │
   │  • Create/update CallRecord          │
   │  • Emit Socket.IO: ivr:incoming      │
   │  • On CDR: save duration, recording  │
   │  • Activity log for call             │
   └─────────────────────────────────────┘
        │
        │  Socket.IO (ivr:incoming, ivr:call_ended)
        │  REST: GET /api/ivr/call/:id, POST hangup, GET recording
        ▼
   ┌─────────────────────────────────────┐
   │         Frontend (React)            │
   │  • IncomingCallPopup (global)        │
   │  • Call controls (mute, hold, end)   │
   │  • Inquiry Activity: call row       │
   └─────────────────────────────────────┘
```

---

## 4. Folder & File Structure

### 4.1 Backend

```
backend/src/
├── config/
│   └── telecmi.ts              # TeleCMI base URLs, env keys (no secrets in code)
├── models/
│   ├── Inquiry.ts              # (existing) allow minimal create for IVR
│   ├── Activity.ts             # (existing) add action: 'ivr_call'
│   ├── CallRecord.ts           # NEW: call lifecycle, duration, recording, attendedBy
│   └── ...
├── services/
│   ├── socketService.ts        # (existing) add emitIncomingCall, emitCallEnded
│   └── telecmi/
│       ├── index.ts            # TeleCMI service facade
│       ├── client.ts           # HTTP client (login, hangup, get recording URL)
│       ├── webhookValidation.ts# Verify webhook source/signature if provided
│       └── types.ts            # TeleCMI payload types
├── controllers/
│   └── ivr/
│       ├── webhookController.ts   # POST live, POST cdr
│       ├── callController.ts      # answer, hangup, mute, hold (proxy to TeleCMI)
│       └── recordingController.ts # GET recording stream or redirect
├── routes/
│   └── ivr.ts                 # Mount: /webhooks/telecmi/*, /api/ivr/*
├── middleware/
│   └── telecmiWebhookAuth.ts  # Optional: verify TeleCMI webhook secret/IP
└── ...
```

### 4.2 Frontend

```
frontend/src/
├── components/
│   └── ivr/
│       ├── IncomingCallPopup.tsx   # Modal: caller info, inquiry summary, Answer/Reject
│       ├── ActiveCallBar.tsx       # Optional: small bar when call is active (mute, hold, end)
│       └── CallActivityRow.tsx     # Single call entry in Activity list (time, duration, recording, who)
├── contexts/
│   └── IvrCallContext.tsx          # State: active incoming call, active call session, handlers
├── hooks/
│   └── useIvrCall.ts               # Subscribe to ivr:incoming, ivr:call_ended; expose answer/hangup
├── pages/
│   └── InquiryDetails.tsx          # (existing) Activity section: render CallActivityRow for ivr_call
├── api/
│   └── ivr.ts                     # api.ivr.answer(), api.ivr.hangup(), api.ivr.getRecordingUrl()
└── types/
    └── index.ts                   # Add IncomingCallPayload, CallRecord, etc.
```

### 4.3 Shared / Docs

```
docs/
└── IVR-TeleCMI-Implementation-Plan.md   # This file
```

---

## 5. Data Models

### 5.1 CallRecord (NEW)

Stores one call from ring to end. Linked to an inquiry and optionally to the user who attended.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `inquiry` | ObjectId (ref: Inquiry) | Yes | Inquiry this call belongs to. |
| `cmiuuid` | String | Yes | TeleCMI call id (unique per call). |
| `from` | String | Yes | Caller number (E.164 or same format as Inquiry.phone). |
| `to` | String | No | DID / IVR number that received the call. |
| `direction` | String | Yes | `'inbound'`. |
| `status` | String | Yes | `'ringing' \| 'answered' \| 'ended' \| 'missed'`. |
| `ringingAt` | Date | No | When live event "ringing" was received. |
| `answeredAt` | Date | No | When call was answered. |
| `endedAt` | Date | No | When call ended. |
| `durationSeconds` | Number | No | Talk time in seconds (from CDR). |
| `recordingFilename` | String | No | TeleCMI recording filename (for playback URL). |
| `attendedBy` | ObjectId (ref: User) | No | CRM user who answered the call. |
| `createdAt` / `updatedAt` | Date | Auto | Timestamps. |

**Indexes:** `cmiuuid` (unique), `inquiry`, `from`, `createdAt`.

### 5.2 Activity (EXTEND)

- Add to `action` enum: **`'ivr_call'`**.
- Option A: Store a reference to `CallRecord` (e.g. `callRecord: ObjectId`) so the activity row can show full call details.
- Option B: Store a short summary in `details` (e.g. "Incoming call – 2m 30s – Attended by John") and keep full data in `CallRecord`; frontend fetches call list by inquiry and merges into activity timeline.

Recommendation: **Option A** – add optional `callRecord` ref to Activity; when action is `ivr_call`, frontend populates from CallRecord (duration, recording, attendedBy).

### 5.3 Inquiry (MINIMAL CREATE FOR IVR)

- For IVR-originated inquiries, create with **only**:
  - `phone` (normalized from webhook `from`, e.g. ensure `+` prefix).
  - `medium: 'IVR'`.
  - `preferredLocation`: use first option from OptionSettings or a default (e.g. `'Nagpur'`).
  - `createdBy`: use a **system user** or the first active presales/admin user (decide and document). Optionally add `source: 'ivr'` if you add such a field later.
- All other fields optional/undefined so that "no details" is valid.

---

## 6. API Design

### 6.1 Webhooks (No JWT; Validate by Secret/IP)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhooks/telecmi/live` | Live events: ringing, answered, hangup. Create/update CallRecord; find/create inquiry by `from`; emit Socket `ivr:incoming` on ring. |
| POST | `/webhooks/telecmi/cdr` | CDR after call end. Update CallRecord (duration, recording filename), create Activity `ivr_call`, emit `ivr:call_ended`. |

### 6.2 Authenticated APIs (JWT)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ivr/incoming` | Optional: list pending incoming calls (if you keep server-side queue). |
| POST | `/api/ivr/call/:cmiuuid/answer` | Mark current user as answering the call (and optionally trigger TeleCMI answer flow if applicable). |
| POST | `/api/ivr/call/:cmiuuid/hangup` | Hangup call (backend calls TeleCMI hangup API). |
| POST | `/api/ivr/call/:cmiuuid/hold` | Hold (if TeleCMI supports; otherwise 501). |
| POST | `/api/ivr/call/:cmiuuid/mute` | Mute (if TeleCMI supports; otherwise 501). |
| GET | `/api/ivr/call/:cmiuuid` | Get call state and inquiry summary (for popup). |
| GET | `/api/ivr/recording/:callRecordId` | Stream or redirect to recording (proxy to TeleCMI play API or return signed URL). |

### 6.3 Internal / Helpers

- **Find or create inquiry by phone:** normalize `from` to match `Inquiry.phone` format; if not found, create minimal IVR inquiry; return inquiry (and last activity if needed for popup).
- **Normalize phone:** e.g. `919876543210` → `+919876543210` (or your app’s standard).

---

## 7. Frontend Components & Flows

### 7.1 Incoming Call Popup

- **Trigger:** Socket event `ivr:incoming` with payload: `{ cmiuuid, from, to, inquiryId?, inquiry?, lastActivity? }`.
- **Content:**
  - Caller number.
  - If existing inquiry: name, email, last activity snippet, link to inquiry.
  - If new: “New contact – only phone number.”
  - Buttons: **Answer**, **Reject / Dismiss**.
- **Answer:** Call `POST /api/ivr/call/:cmiuuid/answer` (and open softphone or in-browser if TeleCMI provides it); optionally show **ActiveCallBar** with mute, hold, hangup.

### 7.2 Active Call Bar (Optional)

- Shown when current user has an active call (tracked in IvrCallContext).
- Buttons: Mute, Hold, Hangup; call duration timer.

### 7.3 Activity Section (Inquiry Details)

- For each activity with `action === 'ivr_call'` and `callRecord` ref (or from merged call list):
  - **CallActivityRow:** Ringing time, Answered time, Duration, Recording (play link), Attended by.
- Sort with other activities by date.

---

## 8. Step-by-Step Implementation Plan

### Phase 1: Backend – Foundation

| Step | Task | Details |
|------|------|---------|
| 1.1 | Add env vars | `TELECMI_WEBHOOK_SECRET`, `TELECMI_APP_ID`, `TELECMI_SECRET`, `TELECMI_BASE_URL`; optional per-user: TeleCMI user/password for token. |
| 1.2 | Create `CallRecord` model | Schema + indexes; types in `backend/src/types`. |
| 1.3 | Extend `Activity` | Add `ivr_call` to action enum; add optional `callRecord` ref. |
| 1.4 | IVR inquiry creation helper | `findOrCreateInquiryByPhone(phone)` – normalize phone, find by phone; if not found, create with phone + medium IVR + default location + system/default createdBy. |
| 1.5 | TeleCMI service layer | `services/telecmi/`: client (login, hangup), types (live + CDR payloads), webhookValidation. |

### Phase 2: Webhooks & Real-Time

| Step | Task | Details |
|------|------|---------|
| 2.1 | POST `/webhooks/telecmi/live` | Parse body; validate; on `ringing`: findOrCreateInquiryByPhone, create CallRecord (status ringing), emit Socket `ivr:incoming` with inquiry + lastActivity; on `answered`/`ended`: update CallRecord. |
| 2.2 | POST `/webhooks/telecmi/cdr` | On CDR: update CallRecord (duration, recording filename, endedAt); create Activity (action `ivr_call`, callRecord ref); emit `ivr:call_ended`. |
| 2.3 | Socket events | In socketService: `emitIncomingCall(payload)`, `emitCallEnded(payload)`. Frontend subscribes in IvrCallContext/useIvrCall. |

### Phase 3: Call Control APIs

| Step | Task | Details |
|------|------|---------|
| 3.1 | POST `.../answer` | Ensure CallRecord exists; set `attendedBy` to current user, `answeredAt`, status `answered`; if TeleCMI has “connect to agent” API, call it with user’s token. |
| 3.2 | POST `.../hangup` | Call TeleCMI hangup API with token + cmiuuid; update CallRecord status to `ended`. |
| 3.3 | Hold / Mute | Implement if TeleCMI supports; else return 501 with message. |
| 3.4 | GET recording | Proxy to TeleCMI `/v2/play` or return temporary signed URL; ensure auth (only users who can see inquiry can get recording). |

### Phase 4: Frontend – Popup & Context

| Step | Task | Details |
|------|------|---------|
| 4.1 | Types & API client | Add IncomingCallPayload, CallRecord types; `api/ivr.ts` with answer, hangup, getCall, getRecordingUrl. |
| 4.2 | IvrCallContext | Hold state: current incoming call, active call; listen Socket `ivr:incoming`, `ivr:call_ended`; expose handlers (answer, reject, hangup). |
| 4.3 | IncomingCallPopup | Modal triggered by incoming call state; show caller + inquiry summary; Answer / Reject. |
| 4.4 | ActiveCallBar | Optional; show when user has active call; mute, hold, hangup. |

### Phase 5: Activity & Recording

| Step | Task | Details |
|------|------|---------|
| 5.1 | Get inquiry activities | Ensure backend returns call records for `ivr_call` (populate callRecord or merge call list). |
| 5.2 | CallActivityRow | In InquiryDetails activity list, render one row per call: time, duration, recording link, attended by. |
| 5.3 | Recording playback | Use GET `/api/ivr/recording/:callRecordId` in a new tab or inline audio player; respect permissions. |

### Phase 6: Polish & Security

| Step | Task | Details |
|------|------|---------|
| 6.1 | Webhook auth | Verify TeleCMI webhook secret or IP allowlist; reject invalid requests. |
| 6.2 | Rate limiting | Optional: rate limit webhook endpoints to avoid abuse. |
| 6.3 | Logging & monitoring | Log webhook receive, call create/update, API errors; no sensitive data in logs. |
| 6.4 | TeleCMI dashboard | Document in README: configure Live Event + CDR webhook URLs, enable recording, map CRM users to TeleCMI agents if needed. |

---

## 9. Environment & Configuration

### 9.1 Backend (.env)

```env
# TeleCMI
TELECMI_WEBHOOK_SECRET=your_webhook_secret_if_any
TELECMI_APP_ID=your_app_id
TELECMI_SECRET=your_secret
TELECMI_BASE_URL=https://rest.telecmi.com
# Optional: default agent for answer/hangup if not per-user
TELECMI_DEFAULT_USER_ID=
TELECMI_DEFAULT_PASSWORD=
```

### 9.2 Frontend (.env)

```env
VITE_SOCKET_URL=https://your-api-url
# No TeleCMI secrets in frontend
```

---

## 10. Security & Best Practices

- **Webhooks:** Validate origin (secret header or IP). Use HTTPS only.
- **Secrets:** Keep TeleCMI credentials in env; never in frontend or logs.
- **Recording:** Authorize by inquiry access (user can see inquiry → can play recording).
- **Phone normalization:** One canonical format (e.g. E.164 with +) to avoid duplicates.
- **Idempotency:** Use `cmiuuid` as idempotency key for creating/updating CallRecord and Activity so duplicate webhooks don’t create duplicate records.
- **Error handling:** Webhook handlers should return 200 quickly after queuing work if needed; process async and log failures.

---

## 11. TeleCMI Dashboard Setup

1. **Webhooks**  
   - **Live events:** Type = “call notification”, Method = POST, URL = `https://your-domain.com/webhooks/telecmi/live`.  
   - **CDR:** Type = “call report”, Method = POST, URL = `https://your-domain.com/webhooks/telecmi/cdr`.

2. **Recording**  
   - Enable call recording for the IVR number / queue so CDR includes `filename`.

3. **Agents**  
   - Create TeleCMI users for each CRM user who will answer calls (or one shared queue user). Store mapping (CRM userId → TeleCMI id/password) or use one shared token for hangup/answer.

4. **Answer URL (if used)**  
   - If TeleCMI uses an “answer URL” to connect the call to an agent, configure it to point to your backend or TeleCMI softphone; document in your runbook.

---

## 12. Testing Strategy

- **Webhooks:** Use Ngrok + TeleCMI test calls; or replay saved JSON to `/webhooks/telecmi/live` and `/webhooks/telecmi/cdr`.  
- **Find/create inquiry:** Unit test `findOrCreateInquiryByPhone` with existing phone, new phone, and duplicate webhook (same cmiuuid).  
- **Call control:** Integration tests with TeleCMI sandbox (if available) for answer/hangup.  
- **Frontend:** Manual test: simulate `ivr:incoming` via Socket; click Answer/Reject; check Activity shows call and recording.

---

## Summary

- **Backend:** New `CallRecord` model; extend `Activity` with `ivr_call` and optional `callRecord` ref; webhooks for live + CDR; TeleCMI service for hangup/recording; find-or-create inquiry by phone with minimal IVR defaults.  
- **Frontend:** IncomingCallPopup driven by Socket; IvrCallContext; CallActivityRow in Activity section; recording playback via backend proxy.  
- **TeleCMI:** Live + CDR webhooks; REST for hangup and recording; optional answer/hold/mute per TeleCMI docs.  

Implement in the order of the phases above, with each step merged and tested before moving to the next. Use this document as the single source of truth for structure and APIs; adjust only when TeleCMI docs or product requirements change.
