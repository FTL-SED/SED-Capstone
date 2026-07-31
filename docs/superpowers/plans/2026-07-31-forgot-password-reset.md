# Forgot-Password / Email Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user who forgot their password request a reset email, click the link, and set a new password — entirely through the existing browser Supabase client, with no backend changes.

**Architecture:** Supabase Auth owns passwords. The existing auth-only browser client (`frontend/src/lib/supabaseClient.js`) sends the reset email via `resetPasswordForEmail` and, after the user clicks the emailed link, captures the recovery session (`detectSessionInUrl`, already enabled) and sets the new password via `updateUser`. A "Forgot password?" toggle on the Login form is the entry point; a new public `/reset-password` page is the landing point.

**Tech Stack:** React 19, React Router 7, `@supabase/supabase-js` v2, Vite, `node:test` (for the one pure helper). No backend/Prisma changes.

## Global Constraints

- Frontend has NO general Supabase data client — the browser Supabase client is used ONLY for the auth handshake; all app data still flows frontend → backend → Supabase.
- Reuse existing components: `AuthCard`, `PasswordInput`, `TextInput`, `SubmitButton`, `ErrorMessage`, `ConfirmationMessage`. Do NOT create new input/message components.
- Auth helpers guard on a null `supabase` client (env unset) — same pattern as `signInWithGoogle`/`completeOAuthSignIn`.
- Anti-enumeration: the request step always shows the same neutral message whether or not the email is registered.
- Password rules match `ChangePasswordSection`: new password ≥ 8 chars, confirm must match. Validate client-side before calling Supabase.
- `ES modules`, `.js`/`.jsx` extensions in import paths. `const` by default; camelCase; PascalCase components.
- Commits: imperative subject ≤ 50 chars, no AI-attribution trailer. Never commit to `main`. Work stays on branch `dylan-google-auth`.

---

## File Structure

**New:**
- `frontend/src/utils/passwordValidation.js` — pure validator shared by the reset page (and reusable elsewhere). One responsibility: given new + confirm, return an error string or `null`.
- `frontend/src/utils/passwordValidation.test.js` — co-located `node:test` unit tests for the validator.
- `frontend/src/pages/ResetPasswordPage/ResetPasswordPage.jsx` — the `/reset-password` landing page.
- `frontend/src/pages/ResetPasswordPage/ResetPasswordPage.css` — its styles.

**Modified:**
- `frontend/src/api/auth.js` — add `sendPasswordReset(email)` and `updatePassword(newPassword)`.
- `frontend/src/pages/LoginPage/LoginForm/LoginForm.jsx` — add "Forgot password?" toggle + email-entry view.
- `frontend/src/App.jsx` — register the public `/reset-password` route.

---

## Task 1: Pure password-validation helper

**Files:**
- Create: `frontend/src/utils/passwordValidation.js`
- Test: `frontend/src/utils/passwordValidation.test.js`

**Interfaces:**
- Produces: `validateNewPassword(newPassword: string, confirmPassword: string): string | null` — returns a user-facing error message, or `null` when valid.

- [ ] **Step 1: Write the failing test**

```js
// frontend/src/utils/passwordValidation.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { validateNewPassword } from './passwordValidation.js'

test('validateNewPassword: rejects empty fields', () => {
  assert.equal(validateNewPassword('', ''), 'Please fill in both password fields.')
})

test('validateNewPassword: rejects too-short password', () => {
  assert.equal(validateNewPassword('short', 'short'), 'New password must be at least 8 characters.')
})

test('validateNewPassword: rejects mismatch', () => {
  assert.equal(validateNewPassword('longenough1', 'different1'), 'Passwords do not match.')
})

test('validateNewPassword: accepts a valid matching password', () => {
  assert.equal(validateNewPassword('longenough1', 'longenough1'), null)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && node --test src/utils/passwordValidation.test.js`
Expected: FAIL — `Cannot find module './passwordValidation.js'` / `validateNewPassword is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// frontend/src/utils/passwordValidation.js
// Pure validation for setting a new password (reset flow + reusable elsewhere).
// Returns a user-facing error string, or null when the input is valid. Mirrors
// the rules in AccountPage's ChangePasswordSection: non-empty, >= 8 chars, match.
export function validateNewPassword(newPassword, confirmPassword) {
  if (!newPassword || !confirmPassword) {
    return 'Please fill in both password fields.'
  }
  if (newPassword.length < 8) {
    return 'New password must be at least 8 characters.'
  }
  if (newPassword !== confirmPassword) {
    return 'Passwords do not match.'
  }
  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && node --test src/utils/passwordValidation.test.js`
Expected: PASS — 4 tests, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/passwordValidation.js frontend/src/utils/passwordValidation.test.js
git commit -m "Add pure new-password validation helper"
```

---

## Task 2: Auth API helpers for reset

**Files:**
- Modify: `frontend/src/api/auth.js`

**Interfaces:**
- Consumes: `supabase` from `../lib/supabaseClient.js` (may be `null` when env unset).
- Produces:
  - `sendPasswordReset(email: string): Promise<void>` — sends the reset email; throws `Error('Password reset is not configured')` when the client is null; throws on Supabase error.
  - `hasRecoverySession(): Promise<boolean>` — true when a Supabase session exists on this page (the recovery link landed). Returns `false` when the client is null.
  - `updatePassword(newPassword: string): Promise<void>` — sets the new password via the recovery session, then signs out to clear it; throws when the client is null or Supabase errors.

- [ ] **Step 1: Append the three helpers to `frontend/src/api/auth.js`**

Add below the existing `completeOAuthSignIn` function (keep the existing imports — `supabase` and `api` are already imported at the top):

```js
// Send a password-reset email. Supabase mails a recovery link that lands on
// /reset-password, where the recovery session is captured and the new password
// is set. Callers should show the same neutral message regardless of outcome
// (anti-enumeration) and only surface an error on a real client failure.
export async function sendPasswordReset(email) {
  if (!supabase) throw new Error('Password reset is not configured')
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

// True when a Supabase session exists on the current page — i.e. the recovery
// link was followed and detectSessionInUrl captured the session. Used by the
// reset page to decide whether to show the form or an "invalid link" message.
export async function hasRecoverySession() {
  if (!supabase) return false
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

// Set the new password using the recovery session, then sign out so the user
// isn't left in a lingering recovery session — they log in fresh afterward.
export async function updatePassword(newPassword) {
  if (!supabase) throw new Error('Password reset is not configured')
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
  await supabase.auth.signOut()
}
```

- [ ] **Step 2: Verify it lints and builds**

Run: `cd frontend && npx eslint src/api/auth.js && npm run build`
Expected: eslint exits 0; build succeeds (`✓ built in ...`).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/auth.js
git commit -m "Add password-reset auth helpers"
```

---

## Task 3: Reset-password landing page

**Files:**
- Create: `frontend/src/pages/ResetPasswordPage/ResetPasswordPage.jsx`
- Create: `frontend/src/pages/ResetPasswordPage/ResetPasswordPage.css`

**Interfaces:**
- Consumes: `hasRecoverySession`, `updatePassword` from `../../api/auth.js`; `validateNewPassword` from `../../utils/passwordValidation.js`; `AuthCard`, `PasswordInput`, `SubmitButton`, `ErrorMessage` components; `useNavigate` from `react-router-dom`.
- Produces: default-exported `ResetPasswordPage` component (no props). Rendered by the `/reset-password` route in Task 4.

- [ ] **Step 1: Create `ResetPasswordPage.jsx`**

```jsx
import AuthCard from '../../components/AuthCard/AuthCard.jsx'
import PasswordInput from '../../components/Inputs/PasswordInput/PasswordInput.jsx'
import SubmitButton from '../../components/Inputs/SubmitButton/SubmitButton.jsx'
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage.jsx'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { hasRecoverySession, updatePassword } from '../../api/auth.js'
import { validateNewPassword } from '../../utils/passwordValidation.js'
import './ResetPasswordPage.css'

function ResetPasswordPage() {
  // null = still checking; true = link is valid; false = no recovery session.
  const [validLink, setValidLink] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Supabase's detectSessionInUrl parses the recovery token from the URL on
  // load; give it a tick, then check whether a session actually landed.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const ok = await hasRecoverySession()
      if (!cancelled) setValidLink(ok)
    })()
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationError = validateNewPassword(newPassword, confirmPassword)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      await updatePassword(newPassword)
      navigate('/login', { state: { message: 'Password updated. Please log in.' } })
    } catch {
      setError('Could not update your password. The link may have expired — request a new one.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="reset-password-page">
      <AuthCard>
        <header className="auth-card__head">
          <h1 className="auth-title">Set a new password</h1>
          <p className="auth-subtitle">Choose a new password for your account.</p>
        </header>

        {validLink === false && (
          <ErrorMessage message="This reset link is invalid or expired. Request a new one from the login page." />
        )}

        {validLink && (
          <form className="reset-password-form" onSubmit={handleSubmit}>
            <PasswordInput
              label="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <PasswordInput
              label="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <ErrorMessage message={error} />
            <SubmitButton label="Update password" onClick={handleSubmit} loading={loading} />
          </form>
        )}
      </AuthCard>
    </div>
  )
}

export default ResetPasswordPage
```

- [ ] **Step 2: Create `ResetPasswordPage.css`**

```css
/* Mirrors LoginPage: the AuthCard scene fills the bare main region. */
.reset-password-page {
  display: flex;
  flex-direction: column;
}

.reset-password-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

- [ ] **Step 3: Verify it lints and builds**

Run: `cd frontend && npx eslint src/pages/ResetPasswordPage/ResetPasswordPage.jsx && npm run build`
Expected: eslint exits 0; build succeeds. (The page isn't routed yet, but the module must compile.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ResetPasswordPage/
git commit -m "Add reset-password landing page"
```

---

## Task 4: Route the reset page

**Files:**
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `ResetPasswordPage` from `./pages/ResetPasswordPage/ResetPasswordPage.jsx`.
- Produces: a public `/reset-password` route (no auth guard — the user is locked out).

- [ ] **Step 1: Add the import**

In `frontend/src/App.jsx`, add alongside the other page imports (after the `AccountPage` import near the top):

```jsx
import ResetPasswordPage from './pages/ResetPasswordPage/ResetPasswordPage'
```

- [ ] **Step 2: Register the public route**

In the `<Routes>` block, add this line immediately after the `/register` route (`<Route path="/register" element={<RegisterPage/>} />`):

```jsx
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

- [ ] **Step 3: Treat `/reset-password` as a bare auth page (optional layout parity)**

In `App.jsx`, the `isAuthPage` computation is currently:

```jsx
const isAuthPage = pathname === '/login' || pathname === '/register';
```

Change it to include the reset page so it gets the same bare/floating-nav treatment as login/register:

```jsx
const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/reset-password';
```

- [ ] **Step 4: Verify it lints and builds**

Run: `cd frontend && npm run lint 2>&1 | tail -5 && npm run build 2>&1 | grep -E "built in|error"`
Expected: no NEW lint errors introduced (the pre-existing `Navbar.jsx` `react-hooks/set-state-in-effect` error may still show — do not "fix" it, it's out of scope); build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "Route the reset-password page"
```

---

## Task 5: "Forgot password?" entry on the login form

**Files:**
- Modify: `frontend/src/pages/LoginPage/LoginForm/LoginForm.jsx`
- Modify: `frontend/src/pages/LoginPage/LoginForm/LoginForm.css`

**Interfaces:**
- Consumes: `sendPasswordReset` from `../../../api/auth.js`; existing `TextInput`, `SubmitButton`, `ErrorMessage`, `ConfirmationMessage`.
- Produces: no exported API change — adds internal `mode` state (`'login' | 'forgot'`), a toggle link, and an email-entry view within the existing form.

- [ ] **Step 1: Import the helper**

Update the auth import line in `LoginForm.jsx`:

```jsx
import { signInWithGoogle, completeOAuthSignIn, sendPasswordReset } from '../../../api/auth.js'
```

- [ ] **Step 2: Add mode + reset-request state**

Add these near the other `useState` calls in `LoginForm`:

```jsx
const [mode, setMode] = useState('login'); // 'login' | 'forgot'
const [resetSent, setResetSent] = useState(false);
```

- [ ] **Step 3: Add the reset-request handler**

Add this alongside `handleGoogle`:

```jsx
// Send a password-reset email. Always show the same neutral confirmation
// whether or not the email is registered (anti-enumeration); only surface an
// error on a real client/network failure.
const handleForgot = async (e) => {
  e.preventDefault();
  setError("");

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    setError("Please enter a valid email address.");
    return;
  }

  setLoading(true);
  try {
    await sendPasswordReset(email);
    setResetSent(true);
  } catch {
    setError("Couldn't send the reset email. Please try again.");
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 4: Render the forgot-password view**

Replace the existing `return ( ... )` block's `<form className="login-form">` contents so the form branches on `mode`. Use this exact JSX for the whole `return`:

```jsx
return (
  <form className="login-form">
    {mode === 'login' ? (
      <>
        <TextInput
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <PasswordInput
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <ErrorMessage message={error}/>
        <ConfirmationMessage message={success} />
        <SubmitButton
          label="Log In"
          onClick={handleSubmit}
          loading={loading}
        />

        <button
          type="button"
          className="login-form__link"
          onClick={() => { setError(""); setMode('forgot'); }}
        >
          Forgot password?
        </button>

        <div className="login-form__divider"><span>or</span></div>

        <button
          type="button"
          className="google-button"
          onClick={handleGoogle}
        >
          <img
            className="google-button__icon"
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt=""
            aria-hidden="true"
          />
          Continue with Google
        </button>
      </>
    ) : (
      <>
        <p className="login-form__hint">
          Enter your email and we'll send you a link to reset your password.
        </p>
        <TextInput
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <ErrorMessage message={error} />
        <ConfirmationMessage
          message={resetSent ? "If an account exists for that email, we've sent a reset link." : ""}
        />
        <SubmitButton
          label="Send reset link"
          onClick={handleForgot}
          loading={loading}
        />

        <button
          type="button"
          className="login-form__link"
          onClick={() => { setError(""); setResetSent(false); setMode('login'); }}
        >
          Back to log in
        </button>
      </>
    )}
  </form>
);
```

- [ ] **Step 5: Add styles for the new link + hint**

Append to `frontend/src/pages/LoginPage/LoginForm/LoginForm.css`:

```css
.login-form__link {
  background: none;
  border: none;
  padding: 0;
  align-self: center;
  color: inherit;
  font-size: 0.9rem;
  text-decoration: underline;
  cursor: pointer;
  opacity: 0.85;
}

.login-form__link:hover {
  opacity: 1;
}

.login-form__hint {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.85;
}
```

- [ ] **Step 6: Verify it lints and builds**

Run: `cd frontend && npx eslint src/pages/LoginPage/LoginForm/LoginForm.jsx && npm run build 2>&1 | grep -E "built in|error"`
Expected: eslint exits 0; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/LoginPage/LoginForm/LoginForm.jsx frontend/src/pages/LoginPage/LoginForm/LoginForm.css
git commit -m "Add forgot-password entry to login form"
```

---

## Task 6: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the frontend unit test + lint + build together**

Run:
```bash
cd frontend && node --test src/utils/passwordValidation.test.js && npm run lint 2>&1 | tail -3 && npm run build 2>&1 | grep -E "built in|error"
```
Expected: 4 tests pass; the only lint error is the pre-existing `Navbar.jsx` one (no new errors); build succeeds.

- [ ] **Step 2: Manual smoke test (requires env + dashboard config — see handoff notes)**

Only runnable once `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are set and `/reset-password` is in Supabase's Redirect URLs. With `npm run dev` running:
1. Go to `/login`, click "Forgot password?", enter a registered email, submit → see the neutral confirmation.
2. Open the reset email, click the link → lands on `/reset-password` with the new-password form.
3. Enter a new password (≥ 8 chars, matching) → redirects to `/login` with "Password updated. Please log in."
4. Log in with the new password → success.
5. Visit `/reset-password` directly (no link) → see the "invalid or expired" message, no form.

- [ ] **Step 3: No commit** (verification only). If any step revealed a bug, fix it in the relevant task's files and re-commit there.

---

## Self-Review Notes

- **Spec coverage:** request step (Task 5) ✓; set-password step (Tasks 2–4) ✓; neutral anti-enumeration message (Task 5, `resetSent` confirmation) ✓; invalid/expired link branch (Task 3, `validLink === false`) ✓; client-side validation (Task 1 helper, used in Task 3) ✓; null-client guards (Task 2) ✓; signOut-then-redirect (Task 2 `updatePassword` + Task 3 navigate) ✓; built-in email (no code — Supabase default) ✓; public route (Task 4) ✓.
- **Types:** `validateNewPassword` returns `string | null`, consumed correctly in Task 3. `hasRecoverySession` → boolean drives `validLink`. `sendPasswordReset`/`updatePassword` return `Promise<void>`.
- **Out of scope (per spec):** custom SMTP, extra password-strength rules, request rate-limiting (Supabase handles), and the pre-existing `Navbar.jsx` lint error.
