# Summary Sharing & Notifications Feature

**Date:** 2026-02-13
**Status:** Approved
**Branch:** feature/summary-sharing

---

## Overview

Add the ability for users to share episode summaries via Email, WhatsApp, and Telegram directly from the episode insights page. Users can send immediately (when summary is ready) or schedule a "notify me when ready" notification. Admin panel gets a new Notifications page with analytics and manual controls.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Message content | Highlights + link back to PodCatch | Lightweight, drives traffic, avoids formatting issues |
| Channels | Email + WhatsApp + Telegram | Covers main messaging platforms |
| Scheduling | Simple "notify me" per episode | Solves core wait problem without subscription complexity |
| Email service | Resend | Best DX for Next.js, free tier (3k/month), React Email templates |
| WhatsApp delivery | Pre-filled `wa.me` links | Avoids expensive Meta Business API |
| Telegram delivery | Bot API (free) | Supports scheduled sends, zero cost |
| UI placement | Upgrade existing share dropdown in ActionFooter | No new buttons, extends existing pattern |
| Auth requirement | Required for notify-me, email, telegram | Prevents abuse, aligns with "sign-in unlocks features" model |
| Admin panel | Analytics + Controls (no broadcast) | Visibility + intervention without spam risk |

---

## 1. User-Facing Share Flow

### Upgraded Share Dropdown (ActionFooter)

Replace the current 2-option share button with a richer dropdown:

**When summary IS ready:**
- **Copy Link** - Same as today, copies insights page URL
- **WhatsApp** - Opens `wa.me/?text=...` with pre-filled message containing episode title, 2-3 key highlights, and link to insights page
- **Telegram** - Opens `t.me/share/url?...` with same pre-filled content
- **Email** - Opens inline form (within popover): recipient email input + "Send" button. Sends formatted email via Resend

**When summary is NOT ready (processing/queued):**
- WhatsApp and Copy Link are hidden
- **Email** shows "Notify me when ready": user confirms account email or enters different one -> saved to DB -> auto-sends when summary status flips to `ready`
- **Telegram** shows "Notify me when ready": if bot not connected, shows connect flow first -> when summary ready, bot sends message

All sharing options (except Copy Link) require sign-in. Guest users see auth modal.

---

## 2. Backend Architecture

### Database Tables (Supabase)

#### `notification_requests`
```sql
CREATE TABLE notification_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'telegram')),
  recipient TEXT NOT NULL, -- email address or telegram chat_id
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  scheduled BOOLEAN NOT NULL DEFAULT false, -- true = waiting for summary ready
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: users can only access their own rows
ALTER TABLE notification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notification_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notifications"
  ON notification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel own notifications"
  ON notification_requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON notification_requests FOR ALL
  USING (auth.role() = 'service_role');
```

#### `telegram_connections`
```sql
CREATE TABLE telegram_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_chat_id TEXT NOT NULL,
  telegram_username TEXT,
  connected_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(telegram_chat_id)
);

ALTER TABLE telegram_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own connection"
  ON telegram_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own connection"
  ON telegram_connections FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON telegram_connections FOR ALL
  USING (auth.role() = 'service_role');
```

### API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/notifications/send` | POST | Send summary now or create pending notification |
| `/api/notifications/mine` | GET | User's notification history |
| `/api/notifications/[id]` | DELETE | Cancel a pending notification |
| `/api/notifications/telegram/connect` | POST | Generate unique bot link for user |
| `/api/notifications/telegram/webhook` | POST | Telegram bot webhook (receives /start, saves chat ID) |
| `/api/admin/notifications` | GET | Admin dashboard data |
| `/api/admin/notifications/[id]/resend` | POST | Resend a failed notification |
| `/api/admin/notifications/[id]/cancel` | POST | Cancel a pending notification |
| `/api/admin/notifications/[id]/force-send` | POST | Send regardless of summary status |

### Trigger Mechanism

When summary status changes to `ready` in the summary service, query `notification_requests` where `episode_id` matches AND `status = 'pending'` AND `scheduled = true`, then fire sends for each matching row.

---

## 3. Message Templates & Content

### Data Source
- Episode title + podcast name (from episodes/podcasts tables)
- Hook headline (from quick summary `content_json`)
- 2-3 top highlights (from insights `content_json.highlights`)
- Link: `{BASE_URL}/episode/{id}/insights`

### Email Template (React Email via Resend)
- PodCatch logo header
- "Your episode summary is ready" heading
- Podcast artwork + episode title + podcast name
- Hook headline in large text
- 2-3 highlight cards with key quotes
- Big CTA button: "Read Full Insights"
- Minimal footer with PodCatch branding

### Telegram Message (Markdown)
```
🎙 *Episode Title*
Podcast Name

💡 *Hook headline here*

Key highlights:
• Highlight one
• Highlight two
• Highlight three

👉 Read full insights: {link}
```

### WhatsApp Message (Plain text, URL-encoded)
```
🎙 Episode Title - Podcast Name

💡 Hook headline here

Key takeaways:
• Highlight one
• Highlight two

Read full insights 👇
{link}
```
Max ~1000 chars for WhatsApp URL safety.

---

## 4. Admin Panel

### New Page: `/admin/notifications`

New tab in AdminSidebar alongside existing pages.

#### Metrics Row
- Total Notifications Sent (all time)
- Sent Today
- Pending (waiting for summary)
- Failure Rate (%)
- Active Telegram Connections

#### Charts
- **Notifications over time** (area chart) - daily volume, last 30 days
- **By Channel** (pie chart) - email vs telegram vs whatsapp
- **Scheduled vs Instant** (bar chart)

#### Pending Notifications Table
- Columns: User email, Episode title, Channel, Created at, Status
- Row actions: **Send Now** (force-send), **Cancel**

#### Recent Sends Table
- Columns: User, Episode, Channel, Sent at, Status (sent/failed)
- Row action: **Resend** on failed rows
- Expandable row shows error message

#### Admin API: `GET /api/admin/notifications`
Returns: metrics object, time series data, channel breakdown, pending list, recent sends list.

---

## 5. Implementation Plan

### Package Additions
- `resend` - Email delivery service
- `@react-email/components` - Email template components

Telegram: raw `fetch` to Bot API (no extra dependency).

### Files to Create

| File | Purpose |
|---|---|
| `src/lib/notifications/send-email.ts` | Resend email sending logic |
| `src/lib/notifications/send-telegram.ts` | Telegram Bot API sending logic |
| `src/lib/notifications/format-message.ts` | Build message content from summary data |
| `src/lib/notifications/trigger.ts` | Check & fire pending notifications when summary ready |
| `src/lib/notifications/index.ts` | Barrel export (safe - no server-only deps) |
| `src/components/insights/ShareMenu.tsx` | Upgraded share dropdown component |
| `src/components/insights/TelegramConnectFlow.tsx` | Telegram bot connection UI |
| `src/emails/summary-ready.tsx` | React Email template |
| `src/app/api/notifications/send/route.ts` | Send/schedule notification |
| `src/app/api/notifications/mine/route.ts` | User's notification history |
| `src/app/api/notifications/[id]/route.ts` | Cancel notification |
| `src/app/api/notifications/telegram/connect/route.ts` | Generate bot link |
| `src/app/api/notifications/telegram/webhook/route.ts` | Telegram webhook handler |
| `src/app/api/admin/notifications/route.ts` | Admin analytics data |
| `src/app/api/admin/notifications/[id]/resend/route.ts` | Admin resend |
| `src/app/api/admin/notifications/[id]/cancel/route.ts` | Admin cancel |
| `src/app/api/admin/notifications/[id]/force-send/route.ts` | Admin force-send |
| `src/app/(admin)/admin/notifications/page.tsx` | Admin notifications dashboard |
| `src/types/notifications.ts` | TypeScript type definitions |
| `supabase/migrations/XXXX_notification_tables.sql` | Database migration |

### Files to Modify

| File | Change |
|---|---|
| `src/components/insights/ActionFooter.tsx` | Replace share button with ShareMenu component |
| `src/lib/summary-service.ts` | Hook `triggerPendingNotifications()` after summary status → ready |
| `src/components/admin/AdminSidebar.tsx` | Add "Notifications" tab |
| `src/types/database.ts` | Add notification_requests and telegram_connections types |

### Implementation Order (6 Steps)

**Step 1: Foundation** - Database + Types
- Create Supabase migration with both tables + RLS policies
- Add TypeScript types in `src/types/notifications.ts`
- Update `src/types/database.ts` with new table types

**Step 2: Notification Service Layer**
- `format-message.ts` - Build highlights + link content from summary/insights data
- `send-email.ts` - Resend integration with React Email template
- `send-telegram.ts` - Telegram Bot API wrapper
- `trigger.ts` - Query pending notifications + dispatch sends

**Step 3: API Routes**
- All `/api/notifications/*` routes (send, mine, cancel)
- Telegram connect + webhook routes

**Step 4: Share UI**
- `ShareMenu.tsx` - Full dropdown with all channels
- `TelegramConnectFlow.tsx` - Bot connection component
- Replace share button in ActionFooter
- Auth gate for non-link sharing options

**Step 5: Summary Ready Hook**
- Modify `summary-service.ts` to call `triggerPendingNotifications()` when status → ready
- Handle errors gracefully (notification failure should NOT fail the summary)

**Step 6: Admin Panel**
- `GET /api/admin/notifications` - Analytics + table data
- Admin action routes (resend, cancel, force-send)
- Admin notifications page with metrics, charts, tables
- Add tab to AdminSidebar

---

## 6. Environment Variables Required

```env
# Resend
RESEND_API_KEY=re_xxxxx

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_WEBHOOK_SECRET=random-secret-string

# App URL (for links in messages)
NEXT_PUBLIC_APP_URL=https://podcatch.com
```

---

## 7. Security Considerations

- All notification routes require authentication via `getAuthUser()`
- RLS policies ensure users only access their own data
- Admin routes protected by AdminGuard
- Telegram webhook verified via secret token
- Rate limiting: consider adding per-user daily send limits (future)
- Email recipient validation before sending
- Notification failures are logged but never block summary processing
