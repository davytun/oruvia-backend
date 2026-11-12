/** @jsxImportSource react */
import { Button, Section, Text } from '@react-email/components'
import { BaseEmailLayout } from './BaseEmailLayout'

export interface InspectionEmailProps {
  recipientName: string
  title: string
  previewText?: string
  message: string
  reference: string
  listingTitle: string
  propertyAddress: string
  scheduledAtWat: string
  mode: 'physical' | 'virtual'
  virtualMethod?: string | null
  meetingLink?: string | null
  recordedVideoUrl?: string | null
  contactName?: string
  contactPhone?: string
  contactWhatsapp?: string
  inspectionFee?: number
  feeStatus?: string
  note?: string | null
  actionLabel?: string
  actionUrl?: string
}

export function InspectionEmail({
  recipientName,
  title,
  previewText,
  message,
  reference,
  listingTitle,
  propertyAddress,
  scheduledAtWat,
  mode,
  virtualMethod,
  meetingLink,
  recordedVideoUrl,
  contactName,
  contactPhone,
  contactWhatsapp,
  inspectionFee,
  feeStatus,
  note,
  actionLabel,
  actionUrl,
}: InspectionEmailProps) {
  return (
    <BaseEmailLayout previewText={previewText || title} heading={title}>
      <Text style={styles.paragraph}>Hello {recipientName},</Text>
      <Text style={styles.paragraph}>{message}</Text>

      {/* Booking Details Card */}
      <Section style={styles.card}>
        <Text style={styles.referenceText}>
          Reference: <span style={styles.badge}>{reference}</span>
        </Text>
        <Text style={styles.metaRow}>
          <strong>Property:</strong> {listingTitle}
        </Text>
        <Text style={styles.metaRow}>
          <strong>Location:</strong> {propertyAddress}
        </Text>
        <Text style={styles.metaRow}>
          <strong>Scheduled For:</strong> {scheduledAtWat} (WAT)
        </Text>
        <Text style={styles.metaRow}>
          <strong>Mode:</strong> {mode === 'virtual' ? 'Virtual Inspection' : 'Physical Inspection'}
          {virtualMethod === 'live_video_call' ? ' (Live Video Call)' : ''}
          {virtualMethod === 'recorded_walkthrough' ? ' (Recorded Walkthrough)' : ''}
        </Text>

        {mode === 'virtual' && meetingLink ? (
          <Text style={styles.metaRow}>
            <strong>Meeting Link:</strong>{' '}
            <a href={meetingLink} style={styles.link}>
              {meetingLink}
            </a>
          </Text>
        ) : null}

        {mode === 'virtual' && recordedVideoUrl ? (
          <Text style={styles.metaRow}>
            <strong>Walkthrough Video:</strong>{' '}
            <a href={recordedVideoUrl} style={styles.link}>
              {recordedVideoUrl}
            </a>
          </Text>
        ) : null}

        {inspectionFee && inspectionFee > 0 ? (
          <Text style={styles.metaRow}>
            <strong>Inspection Fee:</strong> ₦{inspectionFee.toLocaleString()} (
            {feeStatus === 'paid' ? 'Paid' : feeStatus === 'waived' ? 'Waived' : 'Unpaid - pay offline'}
            )
          </Text>
        ) : null}

        {contactName ? (
          <Text style={styles.metaRow}>
            <strong>Contact:</strong> {contactName}{' '}
            {contactPhone ? `(${contactPhone})` : ''}
          </Text>
        ) : null}

        {contactWhatsapp ? (
          <Text style={styles.metaRow}>
            <strong>WhatsApp:</strong>{' '}
            <a
              href={`https://wa.me/${contactWhatsapp.replace(/[^0-9]/g, '')}`}
              style={styles.link}
            >
              Chat on WhatsApp ({contactWhatsapp})
            </a>
          </Text>
        ) : null}

        {note ? (
          <Text style={styles.noteBox}>
            <strong>Note / Reason:</strong> {note}
          </Text>
        ) : null}
      </Section>

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
    margin: '0 0 16px',
  },
  card: {
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '16px 20px',
    margin: '20px 0',
  },
  referenceText: {
    color: '#0F172A',
    fontSize: '14px',
    fontWeight: '600' as const,
    margin: '0 0 12px',
  },
  badge: {
    backgroundColor: '#0F766E',
    color: '#FFFFFF',
    padding: '2px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '13px',
  },
  metaRow: {
    color: '#334155',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '4px 0',
  },
  noteBox: {
    color: '#475569',
    fontSize: '13px',
    lineHeight: '20px',
    backgroundColor: '#FFFFFF',
    borderLeft: '3px solid #0F766E',
    padding: '8px 12px',
    borderRadius: '4px',
    marginTop: '10px',
  },
  link: {
    color: '#0F766E',
    textDecoration: 'underline',
  },
  buttonSection: {
    textAlign: 'center' as const,
    margin: '24px 0',
  },
  button: {
    backgroundColor: '#0F766E',
    borderRadius: '6px',
    color: '#FFFFFF',
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: '600' as const,
    lineHeight: '1',
    padding: '12px 24px',
    textDecoration: 'none',
  },
  signOff: {
    color: '#64748B',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '24px 0 0',
  },
}
