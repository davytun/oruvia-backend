import type { ReactElement } from 'react'
import type { AppBindings } from '../config/env'
import { renderEmailTemplate } from '../templates'

interface TlsSocket {
  setTimeout(timeout: number, callback: () => void): void
  on(event: 'error', listener: (err: Error) => void): void
  on(event: 'data', listener: (chunk: Uint8Array) => void): void
  write(data: string): void
  end(): void
}

export interface SendEmailInput {
  to: string | string[]
  subject: string
  template: ReactElement
  from?: string
}

/**
 * Parse a sender string like "Oruvia <oruvia@gmail.com>" or "oruvia@gmail.com"
 * into `{ name, email }`.
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
 * Encode UTF-8 string into Base64 using Web-standard TextEncoder + btoa
 */
function utf8ToBase64(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

/**
 * Encode UTF-8 string as base64 wrapped at 76 characters per line for MIME
 */
function toMimeBase64(input: string): string {
  return utf8ToBase64(input).replace(/(.{76})/g, '$1\r\n')
}

/**
 * Send email via Gmail SMTP over implicit TLS (smtp.gmail.com:465)
 */
async function sendViaGmailSmtp(params: {
  user: string
  appPassword: string
  senderName: string
  recipients: string[]
  subject: string
  html: string
  text: string
}): Promise<{ sent: boolean; id?: string }> {
  const cleanPassword = params.appPassword.replace(/\s+/g, '')
  const authPlain = utf8ToBase64(`\0${params.user}\0${cleanPassword}`)

  const boundary = `oruvia_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const encodedSubject = `=?UTF-8?B?${utf8ToBase64(params.subject)}?=`
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2, 10)}@gmail.com>`

  const mimeMessage = [
    `From: "${params.senderName}" <${params.user}>`,
    `To: ${params.recipients.join(', ')}`,
    `Subject: ${encodedSubject}`,
    `Message-ID: ${messageId}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    toMimeBase64(params.text),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    toMimeBase64(params.html),
    '',
    `--${boundary}--`,
    '',
    '.',
    '',
  ].join('\r\n')

  // @ts-expect-error node:tls is provided by Cloudflare Workers nodejs_compat and Node.js runtime
  const tlsModule = (await import('node:tls')) as {
    connect(options: {
      host: string
      port: number
      servername: string
    }): TlsSocket
  }

  return new Promise((resolve) => {
    const socket = tlsModule.connect({
      host: 'smtp.gmail.com',
      port: 465,
      servername: 'smtp.gmail.com',
    })

    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let step = 0
    let rcptIndex = 0
    let finished = false

    const finish = (result: { sent: boolean; id?: string }) => {
      if (finished) return
      finished = true
      try {
        socket.end()
      } catch {
        // Ignore close errors
      }
      resolve(result)
    }

    socket.setTimeout(15000, () => {
      console.error('[EmailService:Gmail] SMTP connection timed out')
      finish({ sent: false })
    })

    socket.on('error', (err: Error) => {
      console.error(`[EmailService:Gmail] Socket error: ${err.message}`)
      finish({ sent: false })
    })

    socket.on('data', (chunk: Uint8Array) => {
      buffer += decoder.decode(chunk, { stream: true })
      const lines = buffer.split('\r\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line) continue
        if (line.length >= 4 && line[3] === '-') continue

        const code = Number.parseInt(line.slice(0, 3), 10)
        if (code >= 400) {
          console.error(
            `[EmailService:Gmail] SMTP error at step ${step}: ${line}`
          )
          finish({ sent: false })
          return
        }

        if (step === 0 && code === 220) {
          step = 1
          socket.write('EHLO oruvia.workers.dev\r\n')
        } else if (step === 1 && code === 250) {
          step = 2
          socket.write(`AUTH PLAIN ${authPlain}\r\n`)
        } else if (step === 2 && code === 235) {
          step = 3
          socket.write(`MAIL FROM:<${params.user}>\r\n`)
        } else if (step === 3 && code === 250) {
          if (rcptIndex < params.recipients.length) {
            const rcpt = params.recipients[rcptIndex++]
            socket.write(`RCPT TO:<${rcpt}>\r\n`)
          } else {
            step = 4
            socket.write('DATA\r\n')
          }
        } else if (step === 4 && code === 354) {
          step = 5
          socket.write(mimeMessage)
        } else if (step === 5 && code === 250) {
          step = 6
          socket.write('QUIT\r\n')
          finish({ sent: true, id: messageId })
          return
        }
      }
    })
  })
}

/**
 * Email Service: renders React Email templates and dispatches via Gmail SMTP
 * (with fallback to Brevo or Resend if configured).
 */
export async function sendEmail(
  env: AppBindings,
  input: SendEmailInput
): Promise<{ sent: boolean; id?: string }> {
  const { html, text } = await renderEmailTemplate(input.template)
  const rawFrom =
    input.from || env.EMAIL_FROM || 'Oruvia <davidakintunde433@gmail.com>'
  const sender = parseSender(rawFrom)
  const recipients = Array.isArray(input.to) ? input.to : [input.to]

  // 1. Primary provider: Gmail SMTP with App Password
  if (env.GMAIL_APP_PASSWORD) {
    const gmailUser = env.GMAIL_USER || sender.email
    return sendViaGmailSmtp({
      user: gmailUser,
      appPassword: env.GMAIL_APP_PASSWORD,
      senderName: sender.name,
      recipients,
      subject: input.subject,
      html,
      text,
    })
  }

  // 2. Fallback provider: Brevo REST API
  if (env.BREVO_API_KEY) {
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

  // 3. Fallback provider: Resend REST API
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
    `[EmailService:Dev] Skipping external send (no email credentials configured). To=${recipients.join(',')} Subject="${input.subject}"`
  )
  return { sent: false }
}
