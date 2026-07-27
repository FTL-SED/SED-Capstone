// Gmail SMTP client. lib/ is the only layer that reads process.env (backend rules).
// Uses an app password (GMAIL_APP_PASSWORD) — no OAuth. Created once as a module
// singleton, like lib/prisma.js and lib/supabase.js.
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

// Sends one message. `from` defaults to the configured Gmail account.
// attachments: [{ filename, content: Buffer, contentType }].
export function sendMail({ to, bcc, subject, text, attachments }) {
  return transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    bcc,
    subject,
    text,
    attachments,
  })
}

export default transporter
