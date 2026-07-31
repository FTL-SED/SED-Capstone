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
