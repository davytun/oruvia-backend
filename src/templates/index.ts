import { render } from '@react-email/render'
import type { ReactElement } from 'react'

export * from './BaseEmailLayout'
export * from './NotificationEmail'

/**
 * Render any React Email component into HTML and plain text strings
 */
export async function renderEmailTemplate(element: ReactElement): Promise<{
  html: string
  text: string
}> {
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ])
  return { html, text }
}

