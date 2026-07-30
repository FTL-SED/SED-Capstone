// Detect an image's real type from its leading "magic" bytes, so upload
// handlers can verify content instead of trusting the client-supplied
// Content-Type (which is spoofable — a user can rename evil.html to cover.png
// and set image/png). Pure and dependency-free. Returns 'png' | 'jpeg' |
// 'webp', or null when the bytes match no supported image signature.
//
// Signatures:
//   PNG  : 89 50 4E 47 0D 0A 1A 0A
//   JPEG : FF D8 FF
//   WebP : "RIFF" (52 49 46 46) .... "WEBP" (57 45 42 50) at offset 8
export function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null

  const startsWith = (bytes, offset = 0) =>
    bytes.every((b, i) => buffer[offset + i] === b)

  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (startsWith([0xff, 0xd8, 0xff])) return 'jpeg'
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return 'webp'
  }

  return null
}
