/** @jsxImportSource react */
import { Button, Section, Text } from '@react-email/components'
import { BaseEmailLayout } from './BaseEmailLayout'

export interface InquiryEmailProps {
  recipientName: string
  title: string
  previewText?: string
  introText: string
  reference: string
  listingTitle: string
  propertyAddress: string
  senderName: string
  senderRole: string
  messageBody: string
  whatsappUrl?: string | null
  actionLabel?: string
  actionUrl?: string
}

export function InquiryEmail({
  recipientName,
  title,
  previewText,
  introText,
  reference,
  listingTitle,
  propertyAddress,
  senderName,
  senderRole,
  messageBody,
  whatsappUrl,
  actionLabel = 'View & Reply on Oruvia',
  actionUrl,
}: InquiryEmailProps) {
  return (
    <BaseEmailLayout previewText={previewText || title} heading={title}>
      <Text
        style={{
          fontSize: '15px',
          lineHeight: '24px',
          color: '#374151',
          margin: '0 0 16px',
        }}
      >
        Hello {recipientName},
      </Text>

      <Text
        style={{
          fontSize: '15px',
          lineHeight: '24px',
          color: '#374151',
          margin: '0 0 20px',
        }}
      >
        {introText}
      </Text>

      <Section
        style={{
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '16px 20px',
          margin: '0 0 20px',
        }}
      >
        <Text
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#0F766E',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            margin: '0 0 6px',
          }}
        >
          Inquiry Reference: {reference}
        </Text>
        <Text
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#0F172A',
            margin: '0 0 4px',
          }}
        >
          {listingTitle}
        </Text>
        <Text
          style={{
            fontSize: '13px',
            color: '#64748B',
            margin: '0 0 14px',
          }}
        >
          {propertyAddress}
        </Text>

        <Section
          style={{
            backgroundColor: '#FFFFFF',
            borderLeft: '3px solid #0F766E',
            borderRadius: '6px',
            padding: '12px 14px',
          }}
        >
          <Text
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              margin: '0 0 4px',
            }}
          >
            {senderName} ({senderRole}):
          </Text>
          <Text
            style={{
              fontSize: '14px',
              lineHeight: '22px',
              color: '#1E293B',
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}
          >
            {messageBody}
          </Text>
        </Section>
      </Section>

      {actionUrl && (
        <Section style={{ textAlign: 'center', margin: '0 0 16px' }}>
          <Button
            href={actionUrl}
            style={{
              backgroundColor: '#0F766E',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              display: 'inline-block',
            }}
          >
            {actionLabel}
          </Button>
        </Section>
      )}

      {whatsappUrl && (
        <Section style={{ textAlign: 'center', margin: '0 0 16px' }}>
          <Button
            href={whatsappUrl}
            style={{
              backgroundColor: '#16A34A',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              display: 'inline-block',
            }}
          >
            Continue on WhatsApp
          </Button>
        </Section>
      )}
    </BaseEmailLayout>
  )
}
