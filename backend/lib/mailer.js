// Gmail SMTP client. lib/ is the only layer that reads process.env (backend rules).
// Uses an app password (GMAIL_APP_PASSWORD) — no OAuth. Created once as a module
// singleton, like lib/prisma.js and lib/supabase.js.
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  // Force IPv4 (the "old-style" address). Some hosts (e.g. Render) have no route
  // to IPv6 addresses, so letting Node pick Gmail's IPv6 address first fails with
  // ENETUNREACH. Pinning family: 4 makes it always dial the reachable IPv4 address.
  family: 4,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

// Sends one message. `from` is always the authenticated Gmail account (never a
// spoofed address — spoofing fails SPF/DKIM and lands the mail in spam). `to`
// also defaults to that account so the message always carries a valid To: header;
// an empty/undisclosed-recipients To: is a common spam signal, so real recipients
// go in `bcc`. `replyTo` points replies at a real address (e.g. the sender), and
// `html` lets callers send a proper multipart/alternative body instead of a bare
// text line with only an attachment (which also scores worse with spam filters).
// attachments: [{ filename, content: Buffer, contentType }].
export function sendMail({ to, bcc, subject, text, html, replyTo, attachments }) {
  return transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: to ?? process.env.GMAIL_USER,
    bcc,
    replyTo,
    subject,
    text,
    html,
    attachments,
  })
}

export default transporter
