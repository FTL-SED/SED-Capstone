import './OnboardingPage.css'
import { useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import AuthCard from '../../components/AuthCard/AuthCard.jsx'
import OnboardingWizard from './OnboardingWizard/OnboardingWizard.jsx'
import { register, updatePreferences } from '../../api/users.js'
import { buildPreferencesPayload } from '../../lib/preferences.js'

// Second half of registration. The register form validates the entered
// credentials and hands them here via router state WITHOUT creating an account,
// so abandoning the wizard leaves NO account behind. The account is created only
// when the user hits Finish: we register (getting a live session), save the
// collected preferences with that session's token, then persist the token +
// setCurrentUser — which flips the app to authenticated and sends them home. The
// user stays signed out (currentUser null) for the whole wizard, so every
// protected route keeps redirecting until they finish.
function OnboardingPage({ setCurrentUser }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { credentials } = location.state ?? {}
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Reached without going through registration (direct URL / refresh, which
  // drops router state) — there are no credentials to complete, so start over.
  if (!credentials?.email || !credentials?.password || !credentials?.username) {
    return <Navigate to="/register" replace />
  }

  // Finish: create the account, save prefs, then log in. Any failure (duplicate
  // email, weak password, save error) keeps the user on the wizard with a
  // message rather than half-completing — and since nothing was persisted, they
  // can fix and retry. Note: if registration succeeds but the prefs save fails,
  // the account DOES exist (they can just log in later); we surface the error.
  const handleFinish = async (form) => {
    setSaving(true)
    setError('')
    try {
      // Email confirmation is off, so signUp returns a live session we can use
      // to save prefs and log the user in immediately.
      const { user, session } = await register(credentials)

      await updatePreferences(user.id, buildPreferencesPayload(form), session.access_token)

      localStorage.setItem('accessToken', session.access_token)
      localStorage.setItem('sessionExpiresAt', String(session.expires_at * 1000))
      setCurrentUser(user)
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Could not complete setup. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="onboarding-page">
      <AuthCard>
        <OnboardingWizard onFinish={handleFinish} saving={saving} error={error} />
      </AuthCard>
    </div>
  )
}

export default OnboardingPage
