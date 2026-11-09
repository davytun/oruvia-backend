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
 * Email Service: renders React Email templates and dispatches via Resend
 */
export async function sendEmail(
  env: AppBindings,
  input: SendEmailInput
): Promise<{ sent: boolean; id?: string }> {
  const { html, text } = await renderEmailTemplate(input.template)
  const from = input.from || env.EMAIL_FROM || 'Oruvia <noreply@oruvia.ng>'

  if (!env.RESEND_API_KEY) {
    console.info(
      `[EmailService:Dev] Skipping external send (no RESEND_API_KEY). To=${Array.isArray(input.to) ? input.to.join(',') : input.to} Subject="${input.subject}"`
    )
    return { sent: false }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html,
      text,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error(`[EmailService] Failed to send email: ${errText}`)
    return { sent: false }
  }

  const data = (await response.json()) as { id?: string }
  return { sent: true, id: data.id }
}

