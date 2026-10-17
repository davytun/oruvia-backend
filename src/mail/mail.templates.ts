import * as React from 'react';
import { render } from '@react-email/render';
import { VerificationEmail } from './templates/verification.email.js';
import { PasswordResetEmail } from './templates/password-reset.email.js';

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export async function buildVerificationEmail(
  code: string,
): Promise<RenderedEmail> {
  const subject = 'Verify your Oruvia seeker account';
  const element = React.createElement(VerificationEmail, { code });
  const html = await render(element);

  const text = [
    'Oruvia - Verify your seeker account',
    '',
    `Your verification code is: ${code}`,
    '',
    'This code will expire in 15 minutes.',
    '',
    'Enter this code in the application to verify your email address and activate your seeker account.',
    '',
    'If you did not create an account on Oruvia, you can safely ignore this email.',
  ].join('\n');

  return { subject, text, html };
}

export async function buildPasswordResetEmail(
  code: string,
): Promise<RenderedEmail> {
  const subject = 'Reset your Oruvia seeker password';
  const element = React.createElement(PasswordResetEmail, { code });
  const html = await render(element);

  const text = [
    'Oruvia - Reset your seeker password',
    '',
    `Your password reset code is: ${code}`,
    '',
    'This code will expire in 15 minutes.',
    '',
    'Enter this code in the application to reset your password.',
    '',
    'If you did not request a password reset, you can safely ignore this email. Your account remains secure and your password has not been changed.',
  ].join('\n');

  return { subject, text, html };
}
