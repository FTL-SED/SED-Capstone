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
