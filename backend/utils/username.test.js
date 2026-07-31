import { test } from 'node:test'
import assert from 'node:assert/strict'

import { usernameFromEmail } from './username.js'

test('usernameFromEmail: takes the local-part before @', () => {
  assert.equal(usernameFromEmail('dylan@gmail.com'), 'dylan')
})

test('usernameFromEmail: lowercases', () => {
  assert.equal(usernameFromEmail('Dylan.DRozario@gmail.com'), 'dylan.drozario')
})

test('usernameFromEmail: strips disallowed characters', () => {
  assert.equal(usernameFromEmail('dylan+navquest@gmail.com'), 'dylannavquest')
})

test('usernameFromEmail: keeps dots, underscores, and hyphens', () => {
  assert.equal(usernameFromEmail('a.b_c-d@example.com'), 'a.b_c-d')
})

test('usernameFromEmail: collapses runs of separators', () => {
  assert.equal(usernameFromEmail('a...b@example.com'), 'a.b')
})

test('usernameFromEmail: trims leading/trailing separators', () => {
  assert.equal(usernameFromEmail('.dylan.@example.com'), 'dylan')
})

test('usernameFromEmail: falls back to "user" when nothing usable remains', () => {
  assert.equal(usernameFromEmail('+++@example.com'), 'user')
})

test('usernameFromEmail: handles null/undefined without throwing', () => {
  assert.equal(usernameFromEmail(null), 'user')
  assert.equal(usernameFromEmail(undefined), 'user')
})
