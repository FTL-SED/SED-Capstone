// Unit tests for the banner service: the pure prompt builder (context folding,
// empty-field handling, style append, length cap) and generateBanner's handling
// of success / malformed / thrown errors via an injected image fn. No live API.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildBannerPrompt, generateBanner } from './banner.js'

test('buildBannerPrompt: includes the fixed no-text scaffold', () => {
  const prompt = buildBannerPrompt({ title: 'SF Day', location: 'San Francisco' }, 'sunset vibes')
  assert.match(prompt, /no text|no words|no letters/i)
})

test('buildBannerPrompt: folds in title, location, and user style text', () => {
  const prompt = buildBannerPrompt(
    { title: 'Foodie Crawl', location: 'San Francisco', description: 'tacos and views' },
    'watercolor, warm',
  )
  assert.match(prompt, /Foodie Crawl/)
  assert.match(prompt, /San Francisco/)
  assert.match(prompt, /tacos and views/)
  assert.match(prompt, /watercolor, warm/)
})

test('buildBannerPrompt: omits empty optional fields without crashing', () => {
  const prompt = buildBannerPrompt({ title: '', location: '', description: '' }, '')
  assert.equal(typeof prompt, 'string')
  assert.ok(prompt.length > 0) // scaffold is always present
})

test('buildBannerPrompt: caps the user style text length', () => {
  const long = 'a'.repeat(2000)
  const prompt = buildBannerPrompt({ title: 'T', location: 'L' }, long)
  // The 2000-char run must be truncated well below its original length.
  assert.ok(!prompt.includes('a'.repeat(600)))
})

test('generateBanner: returns base64 image + mediaType on success', async () => {
  const fakeImageFn = async ({ prompt }) => {
    assert.match(prompt, /San Francisco/) // details reached the image fn
    return { b64_json: 'ZmFrZS1iYXNlNjQ=' }
  }
  const out = await generateBanner(
    { title: 'SF Day', location: 'San Francisco' },
    'cozy',
    fakeImageFn,
  )
  assert.equal(out.image, 'ZmFrZS1iYXNlNjQ=')
  assert.equal(out.mediaType, 'image/png')
})

test('generateBanner: throws when the image fn returns no b64', async () => {
  const badImageFn = async () => ({})
  await assert.rejects(
    () => generateBanner({ title: 'T', location: 'L' }, 'x', badImageFn),
    /no image/i,
  )
})

test('generateBanner: propagates a thrown API error', async () => {
  const throwingImageFn = async () => {
    throw new Error('boom')
  }
  await assert.rejects(
    () => generateBanner({ title: 'T', location: 'L' }, 'x', throwingImageFn),
    /boom/,
  )
})
