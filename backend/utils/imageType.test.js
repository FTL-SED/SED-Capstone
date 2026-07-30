// Unit tests for detectImageType — a pure magic-byte sniffer used to verify an
// uploaded buffer is really an image, independent of the client-supplied
// Content-Type (which is spoofable). No I/O.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { detectImageType } from './imageType.js'

// Build a buffer that starts with the given signature bytes, padded so length
// is never the thing under test.
function bufferWith(bytes) {
  return Buffer.concat([Buffer.from(bytes), Buffer.alloc(32)])
}

test('detectImageType: recognizes a PNG signature', () => {
  const png = bufferWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  assert.equal(detectImageType(png), 'png')
})

test('detectImageType: recognizes a JPEG signature', () => {
  const jpeg = bufferWith([0xff, 0xd8, 0xff, 0xe0])
  assert.equal(detectImageType(jpeg), 'jpeg')
})

test('detectImageType: recognizes a WebP signature (RIFF....WEBP)', () => {
  // RIFF + 4-byte size + WEBP
  const webp = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x00, 0x00, 0x00, 0x00, // size (ignored)
    0x57, 0x45, 0x42, 0x50, // WEBP
  ])
  assert.equal(detectImageType(webp), 'webp')
})

test('detectImageType: returns null for a non-image (HTML disguised as png)', () => {
  const html = Buffer.from('<html><script>alert(1)</script></html>', 'utf8')
  assert.equal(detectImageType(html), null)
})

test('detectImageType: returns null for a RIFF that is not WEBP (e.g. WAV)', () => {
  const wav = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x00, 0x00, 0x00, 0x00,
    0x57, 0x41, 0x56, 0x45, // WAVE, not WEBP
  ])
  assert.equal(detectImageType(wav), null)
})

test('detectImageType: returns null for an empty or too-short buffer', () => {
  assert.equal(detectImageType(Buffer.alloc(0)), null)
  assert.equal(detectImageType(Buffer.from([0x89, 0x50])), null)
})

test('detectImageType: returns null for a non-buffer input', () => {
  assert.equal(detectImageType(undefined), null)
  assert.equal(detectImageType('not a buffer'), null)
})
