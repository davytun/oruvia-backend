import * as React from 'react';
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
} from '@react-email/components';

interface KycDecisionEmailProps {
  fullName: string;
  approved: boolean;
  rejectionReason?: string;
  accountType?: 'landlord' | 'agent';
}

export const KycDecisionEmail: React.FC<KycDecisionEmailProps> = ({
  fullName,
  approved,
  rejectionReason,
  accountType = 'agent',
}) => {
  return (
    <Html lang="en">
      <Head />
      <Preview>
        {approved
          ? 'Your Oruvia identity verification was approved'
          : 'Action needed on your Oruvia identity verification'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Text style={logoText}>Oruvia</Text>
          </Section>
          <Section style={contentSection}>
            <Heading style={heading}>
              {approved
                ? 'You are now a verified lister'
                : 'We could not verify your identity document'}
            </Heading>
            <Text style={paragraph}>
              Hello {fullName}, our team has reviewed the identity document you
              submitted for your Oruvia {accountType} account.
            </Text>

            {approved ? (
              <Section style={successBox}>
                <Text style={noticeText}>
                  <strong>Your document was approved.</strong> Your profile now
                  carries the Oruvia Verified badge, and you can publish
                  listings.
                </Text>
              </Section>
            ) : (
              <>
                <Section style={warningBox}>
                  <Text style={noticeText}>
                    <strong>Your submission was rejected.</strong>
                    {rejectionReason ? ` Reason: ${rejectionReason}` : ''}
                  </Text>
                </Section>
                <Text style={instructionText}>
                  You can submit a different, clearly legible government-issued
                  ID (such as a NIN slip, driver&rsquo;s licence or international
                  passport) from the verification screen in your dashboard.
                </Text>
              </>
            )}

            <Hr style={hr} />

            <Text style={footerNote}>
              For your security, Oruvia never asks for your BVN or full ID
              number by email. If you did not submit an identity document,
              please contact support immediately.
            </Text>
          </Section>

          <Section style={footerSection}>
            <Text style={footerCopy}>
              &copy; {new Date().getFullYear()} Oruvia Platform. All rights
              reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  padding: '40px 0',
  margin: 0,
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '560px',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  overflow: 'hidden',
};

const headerSection: React.CSSProperties = {
  backgroundColor: '#0f172a',
  padding: '24px 36px',
};

const logoText: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 700,
  letterSpacing: '-0.5px',
  margin: 0,
};

const contentSection: React.CSSProperties = {
  padding: '36px 36px 28px',
};

const heading: React.CSSProperties = {
  color: '#0f172a',
  fontSize: '20px',
  fontWeight: 600,
  lineHeight: '1.4',
  margin: '0 0 16px',
};

const paragraph: React.CSSProperties = {
  color: '#475569',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 24px',
};

const successBox: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  borderLeft: '4px solid #22c55e',
  borderRadius: '4px',
  padding: '12px 16px',
  margin: '0 0 20px',
};

const warningBox: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  borderLeft: '4px solid #ef4444',
  borderRadius: '4px',
  padding: '12px 16px',
  margin: '0 0 20px',
};

const noticeText: React.CSSProperties = {
  color: '#0f172a',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: 0,
};

const instructionText: React.CSSProperties = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 24px',
};

const hr: React.CSSProperties = {
  borderColor: '#f1f5f9',
  margin: '24px 0 20px',
};

const footerNote: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: 0,
};

const footerSection: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  borderTop: '1px solid #e2e8f0',
  padding: '16px 36px',
  textAlign: 'center',
};

const footerCopy: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '12px',
  margin: 0,
};

export default KycDecisionEmail;
