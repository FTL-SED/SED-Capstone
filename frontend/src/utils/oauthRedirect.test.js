import { test } from 'node:test'
import assert from 'node:assert/strict'

import { isOAuthRedirect } from './oauthRedirect.js'

test('isOAuthRedirect: true when PKCE code is in the query string', () => {
  assert.equal(isOAuthRedirect('?code=abc123', ''), true)
})

test('isOAuthRedirect: true when an access_token is in the hash (implicit flow)', () => {
  assert.equal(isOAuthRedirect('', '#access_token=xyz&expires_in=3600'), true)
})

test('isOAuthRedirect: false on a plain /login visit (no params)', () => {
  assert.equal(isOAuthRedirect('', ''), false)
})

test('isOAuthRedirect: false for unrelated query params', () => {
  assert.equal(isOAuthRedirect('?next=/home&foo=bar', ''), false)
})

test('isOAuthRedirect: tolerates missing leading ? and #', () => {
  assert.equal(isOAuthRedirect('code=abc123', ''), true)
  assert.equal(isOAuthRedirect('', 'access_token=xyz'), true)
})

test('isOAuthRedirect: handles null/undefined without throwing', () => {
  assert.equal(isOAuthRedirect(null, undefined), false)
})
