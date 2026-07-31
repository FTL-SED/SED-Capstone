# Forgot-Password / Email Reset — Design

**Date:** 2026-07-31
**Status:** Approved, not yet implemented

## Problem

A user who forgets their password has no way to recover their account. NavQuest
has account creation (email/password + Google) but no self-service password
reset. We want: user requests a reset by email → receives a link → sets a new
password → logs in.

## Decision: client flow (matches Google auth)

Supabase Auth owns passwords, so reset is done entirely through the **existing
auth-only browser Supabase client** (`frontend/src/lib/supabaseClient.js`).
**No backend changes.** This is consistent with the 2026-07-30 Option-A
decision for Google sign-in: the browser client is scoped strictly to the auth
handshake; all application data still flows frontend → backend → Supabase.

Rejected alternatives:
- *Backend-initiated send + client set* — splits the flow across layers for no
  real gain; Supabase still requires the recovery session in the browser to set
  the password.
- *Fully backend-proxied* (admin client generates/consumes recovery links) —
  significantly more work, re-implements what Supabase provides for free.

## Flow

Two steps:

1. **Request reset.** On the Login page, a "Forgot password?" link reveals an
   email input. Submitting calls
   `supabase.auth.resetPasswordForEmail(email, { redirectTo: <origin>/reset-password })`.
   Regardless of whether the email is registered, show the SAME neutral message
   ("If an account exists for that email, we've sent a reset link") — prevents
   account enumeration.

2. **Set new password.** The email link lands the user on a new
   `/reset-password` page. Supabase's `detectSessionInUrl` (already enabled in
   `supabaseClient.js`) captures the recovery session from the URL. The page
   shows new-password + confirm fields and calls
   `supabase.auth.updateUser({ password })`. On success, `signOut()` to clear
   the recovery session, then redirect to `/login` with a success message so the
   user logs in fresh with the new password.

## Email delivery

Supabase's **built-in email service + default template** sends the reset email —
zero setup. Known caveat: the built-in sender is rate-limited (a few emails/hour)
and intended for testing, not production volume. Acceptable for the capstone.
**Production step (dashboard-only, no code change):** configure custom SMTP
(e.g. Resend, SendGrid) in Supabase → Auth → SMTP settings.

## Files

Reuse existing components — `AuthCard`, `PasswordInput`, `TextInput`,
`SubmitButton`, `ErrorMessage`, `ConfirmationMessage`.

**New:**
- `frontend/src/pages/ResetPasswordPage/ResetPasswordPage.jsx` (+ `.css`) — the
  `/reset-password` landing page. Reads the recovery session, renders
  new-password + confirm fields, calls the update helper, redirects to `/login`.

**Modified:**
- `frontend/src/api/auth.js` — add `sendPasswordReset(email)` and
  `updatePassword(newPassword)`. Both guard on the null client (like the Google
  helpers) so a missing config degrades gracefully.
- `frontend/src/pages/LoginPage/LoginForm/LoginForm.jsx` — add a
  "Forgot password?" link that toggles to a compact email-entry view (reuse
  existing inputs; no new input components).
- `frontend/src/App.jsx` — register the public `/reset-password` route (no auth
  guard — the user is locked out).

**Note:** adds one new page (2 files), bending `frontend/CLAUDE.md`'s
no-extra-files rule — same accepted exception as the Google-auth work.

## Error handling & edge cases

- **Request step:** always the neutral confirmation (anti-enumeration). Only a
  network/client failure surfaces an error.
- **No recovery session on `/reset-password`** (link expired, already used, or
  direct navigation) → show "This reset link is invalid or expired — request a
  new one" with a path back to the forgot-password entry, not a blank form.
- **Client-side validation** before calling Supabase: new password ≥ 8 chars,
  confirm matches (mirrors `ChangePasswordSection`).
- **`updateUser` error** (weak password, session expired mid-submit) → surface
  the mapped message.
- **Null client** (env unset) → helpers throw a friendly "Password reset isn't
  configured" error, matching the Google helpers.
- **Post-success:** `signOut()` before redirecting so the user isn't left in a
  lingering recovery session; they log in fresh.

## Testing

Following the codebase convention, only pure logic is unit-tested. The reset
flow is Supabase-client calls + React UI — the same integration surface that
login/register/Google sign-in aren't unit-tested against. Any extracted pure
helper (e.g. password validation) gets a co-located `*.test.js`. Manual
verification: real reset email → link → set new password → log in.

## Out of scope

- Custom SMTP configuration (dashboard, production step).
- Password-strength rules beyond Supabase's own + the ≥8-char client check.
- Rate-limiting the request endpoint (Supabase rate-limits sends already).
