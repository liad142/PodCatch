// NOTE: All modules in this directory are server-only (they use Resend, Supabase admin, etc).
// Import directly from specific files, e.g.:
//   import { buildShareContent } from '@/lib/notifications/format-message';
//   import { sendSummaryEmail } from '@/lib/notifications/send-email';
//
// Do NOT re-export from this barrel to avoid pulling server-only code into client bundles.
// See MEMORY.md: "Never re-export next/headers-dependent modules from barrel index.ts"
