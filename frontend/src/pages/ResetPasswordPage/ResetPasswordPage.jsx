import AuthCard from '../../components/AuthCard/AuthCard.jsx'
import PasswordInput from '../../components/Inputs/PasswordInput/PasswordInput.jsx'
import SubmitButton from '../../components/Inputs/SubmitButton/SubmitButton.jsx'
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage.jsx'
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { onPasswordRecovery, updatePassword } from '../../api/auth.js'
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

  // Only a genuine password-recovery context unlocks the form — not any
  // persisted Supabase session. onPasswordRecovery fires when Supabase processes
  // the recovery link (and fires immediately if it already did before this
  // mount). If it hasn't fired within a short grace period, treat the link as
  // invalid/expired rather than showing the form to someone who arrived without
  // a real recovery link.
  useEffect(() => {
    let cancelled = false
    const unsubscribe = onPasswordRecovery(() => {
      if (!cancelled) setValidLink(true)
    })
    const timer = setTimeout(() => {
      if (!cancelled) setValidLink((prev) => (prev === null ? false : prev))
    }, 2000)
    return () => {
      cancelled = true
      unsubscribe()
      clearTimeout(timer)
    }
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

        {validLink === null && (
          <p className="reset-password-checking">Verifying link…</p>
        )}

        {validLink === false && (
          <>
            <ErrorMessage message="This reset link is invalid or expired. Request a new one from the login page." />
            <Link className="reset-password-back" to="/login">Back to log in</Link>
          </>
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
