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

interface PasswordResetEmailProps {
  code: string;
  accountType?: 'seeker' | 'landlord' | 'agent' | 'admin';
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  code,
  accountType = 'seeker',
}) => {
  return (
    <Html lang="en">
      <Head />
      <Preview>Your Oruvia password reset code: {code}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Text style={logoText}>Oruvia</Text>
          </Section>
          <Section style={contentSection}>
            <Heading style={heading}>Reset your password</Heading>
            <Text style={paragraph}>
              We received a request to reset the password for your Oruvia {accountType}{' '}
              account. Enter the code below to proceed with setting a new
              password.
            </Text>

            <Section style={codeBox}>
              <Text style={codeText}>{code}</Text>
            </Section>

            <Section style={alertBox}>
              <Text style={alertText}>
                This code will expire in <strong>15 minutes</strong>.
              </Text>
            </Section>

            <Text style={instructionText}>
              Enter this 6-digit code along with your new password in the Oruvia
              application. For security, never share this code with anyone.
            </Text>

            <Hr style={hr} />

            <Text style={footerNote}>
              If you did not request a password reset, you can safely ignore this
              email. Your account remains secure and your password has not been
              changed.
            </Text>
          </Section>

          <Section style={footerSection}>
            <Text style={footerCopy}>
              &copy; {new Date().getFullYear()} Oruvia Platform. All rights reserved.
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

const codeBox: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  textAlign: 'center',
  padding: '16px 0',
  margin: '24px 0',
};

const codeText: React.CSSProperties = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: '32px',
  fontWeight: 700,
  letterSpacing: '8px',
  color: '#0f172a',
  margin: 0,
};

const alertBox: React.CSSProperties = {
  backgroundColor: '#eff6ff',
  borderLeft: '4px solid #3b82f6',
  borderRadius: '4px',
  padding: '12px 16px',
  margin: '0 0 20px',
};

const alertText: React.CSSProperties = {
  color: '#1e40af',
  fontSize: '13px',
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

export default PasswordResetEmail;
