import type { ReactElement } from 'react'
import type { AppBindings } from '../config/env'
import { renderEmailTemplate } from '../templates'

export interface SendEmailInput {
  to: string | string[]
  subject: string
  template: ReactElement
  from?: string
}

/**
 * Parse a sender string like "Oruvia <oruvia@gmail.com>" or "oruvia@gmail.com"
 * into `{ name, email }` for Brevo's API.
 */
function parseSender(rawFrom: string): { name: string; email: string } {
  const match = rawFrom.match(/^(.*?)\s*<([^>]+)>$/)
  if (match) {
    return {
      name: match[1].trim() || 'Oruvia',
      email: match[2].trim(),
    }
  }
  return {
    name: 'Oruvia',
    email: rawFrom.trim(),
  }
}

/**
 * Email Service: renders React Email templates and dispatches via Brevo HTTP API
 * (with optional fallback to Resend if BREVO_API_KEY is not set).
 */
export async function sendEmail(
  env: AppBindings,
  input: SendEmailInput
): Promise<{ sent: boolean; id?: string }> {
  const { html, text } = await renderEmailTemplate(input.template)
  const rawFrom = input.from || env.EMAIL_FROM || 'Oruvia <noreply@oruvia.ng>'
  const recipients = Array.isArray(input.to) ? input.to : [input.to]

  // Primary provider: Brevo REST API (works with any verified @gmail.com sender without a custom domain)
  if (env.BREVO_API_KEY) {
    const sender = parseSender(rawFrom)
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender,
        to: recipients.map((email) => ({ email })),
        subject: input.subject,
        htmlContent: html,
        textContent: text,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[EmailService:Brevo] Failed to send email: ${errText}`)
      return { sent: false }
    }

    const data = (await response.json()) as { messageId?: string }
    return { sent: true, id: data.messageId }
  }

  // Fallback provider: Resend REST API
  if (env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: rawFrom,
        to: recipients,
        subject: input.subject,
        html,
        text,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[EmailService:Resend] Failed to send email: ${errText}`)
      return { sent: false }
    }

    const data = (await response.json()) as { id?: string }
    return { sent: true, id: data.id }
  }

  console.info(
    `[EmailService:Dev] Skipping external send (no BREVO_API_KEY or RESEND_API_KEY). To=${recipients.join(',')} Subject="${input.subject}"`
  )
  return { sent: false }
}
