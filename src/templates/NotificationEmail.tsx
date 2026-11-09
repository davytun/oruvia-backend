/** @jsxImportSource react */
import { Button, Section, Text } from '@react-email/components'
import { BaseEmailLayout } from './BaseEmailLayout'

export interface NotificationEmailProps {
  recipientName: string
  title: string
  previewText?: string
  message: string
  actionLabel?: string
  actionUrl?: string
  metadata?: Array<{ label: string; value: string }>
}

/**
 * Reusable React Email template for Oruvia platform notifications:
 * - New inquiries
 * - Inspection requests, confirmations, rescheduling
 * - Verification status updates
 * - Listing moderation & status updates
 */
export function NotificationEmail({
  recipientName,
  title,
  previewText,
  message,
  actionLabel,
  actionUrl,
  metadata,
}: NotificationEmailProps) {
  return (
    <BaseEmailLayout
      previewText={previewText || title}
      heading={title}
    >
      <Text style={styles.paragraph}>Hello {recipientName},</Text>
      <Text style={styles.paragraph}>{message}</Text>

      {metadata && metadata.length > 0 ? (
        <Section style={styles.metaBox}>
          {metadata.map((item) => (
            <Text key={item.label} style={styles.metaItem}>
              <strong>{item.label}:</strong> {item.value}
            </Text>
          ))}
        </Section>
      ) : null}

      {actionLabel && actionUrl ? (
        <Section style={styles.buttonSection}>
          <Button href={actionUrl} style={styles.button}>
            {actionLabel}
          </Button>
        </Section>
      ) : null}

      <Text style={styles.signOff}>
        Warm regards,
        <br />
        The Oruvia Team
      </Text>
    </BaseEmailLayout>
  )
}

const styles = {
  paragraph: {
    color: '#334155',
    fontSize: '15px',
    lineHeight: '24px',
    margin: '0 0 16px 0',
  },
  metaBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '12px 16px',
    margin: '16px 0',
  },
  metaItem: {
    color: '#1e293b',
    fontSize: '14px',
    lineHeight: '20px',
    margin: '4px 0',
  },
  buttonSection: {
    margin: '24px 0',
  },
  button: {
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: '600',
    padding: '12px 20px',
    textDecoration: 'none',
  },
  signOff: {
    color: '#475569',
    fontSize: '14px',
    lineHeight: '22px',
    marginTop: '24px',
  },
}

