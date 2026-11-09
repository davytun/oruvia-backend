import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server.browser'

export * from './BaseEmailLayout'
export * from './NotificationEmail'
export * from './PasswordResetEmail'
export * from './VerificationEmail'

/**
 * Strip HTML tags and normalize whitespace for plain-text email fallback
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|section|li)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Render any React Email component into HTML and plain text strings (Workers/Edge safe)
 */
export async function renderEmailTemplate(element: ReactElement): Promise<{
  html: string
  text: string
}> {
  const rawMarkup = renderToStaticMarkup(element)
  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">${rawMarkup.replace(/<!DOCTYPE.*?>/i, '')}`
  const text = htmlToPlainText(rawMarkup)
  return { html, text }
}
