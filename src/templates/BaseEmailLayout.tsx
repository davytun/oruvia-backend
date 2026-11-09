/** @jsxImportSource react */
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { ReactNode } from 'react'

export interface BaseEmailLayoutProps {
  previewText: string
  heading?: string
  children: ReactNode
}

export function BaseEmailLayout({
  previewText,
  heading,
  children,
}: BaseEmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brandTitle}>Oruvia</Text>
            <Text style={styles.brandTagline}>Your path to a roof.</Text>
          </Section>

          <Section style={styles.content}>
            {heading ? <Heading style={styles.heading}>{heading}</Heading> : null}
            {children}
          </Section>

          <Hr style={styles.divider} />

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Oruvia — Connecting property seekers with verified landlords and
              real estate agents across Nigeria.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const styles = {
  body: {
    backgroundColor: '#f6f8fa',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    margin: '0',
    padding: '24px 0',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    maxWidth: '580px',
    margin: '0 auto',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#0f172a',
    padding: '20px 32px',
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '700',
    margin: '0',
  },
  brandTagline: {
    color: '#94a3b8',
    fontSize: '13px',
    margin: '4px 0 0 0',
  },
  content: {
    padding: '28px 32px',
  },
  heading: {
    color: '#0f172a',
    fontSize: '20px',
    fontWeight: '600',
    margin: '0 0 16px 0',
  },
  divider: {
    borderColor: '#e5e7eb',
    margin: '0',
  },
  footer: {
    padding: '16px 32px 24px 32px',
  },
  footerText: {
    color: '#64748b',
    fontSize: '12px',
    lineHeight: '18px',
    margin: '0',
  },
}

