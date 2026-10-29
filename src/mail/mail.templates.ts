import * as React from 'react';
import { render } from '@react-email/render';
import { VerificationEmail } from './templates/verification.email.js';
import { PasswordResetEmail } from './templates/password-reset.email.js';
import { KycDecisionEmail } from './templates/kyc-decision.email.js';

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export async function buildVerificationEmail(
  code: string,
  accountType: 'seeker' | 'landlord' | 'agent' = 'seeker',
): Promise<RenderedEmail> {
  const subject = `Verify your Oruvia ${accountType} account`;
  const element = React.createElement(VerificationEmail, { code, accountType });
  const html = await render(element);

  const text = [
    `Oruvia - Verify your ${accountType} account`,
    '',
    `Your verification code is: ${code}`,
    '',
    'This code will expire in 15 minutes.',
    '',
    `Enter this code in the application to verify your email address and activate your ${accountType} account.`,
    '',
    'If you did not create an account on Oruvia, you can safely ignore this email.',
  ].join('\n');

  return { subject, text, html };
}

export async function buildPasswordResetEmail(
  code: string,
  accountType: 'seeker' | 'landlord' | 'agent' | 'admin' = 'seeker',
): Promise<RenderedEmail> {
  const subject = `Reset your Oruvia ${accountType} password`;
  const element = React.createElement(PasswordResetEmail, { code, accountType });
  const html = await render(element);

  const text = [
    `Oruvia - Reset your ${accountType} password`,
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

export async function buildKycDecisionEmail(
  fullName: string,
  approved: boolean,
  accountType: 'landlord' | 'agent',
  rejectionReason?: string,
): Promise<RenderedEmail> {
  const subject = approved
    ? `You are now a verified Oruvia ${accountType}`
    : `Action needed on your Oruvia ${accountType} verification`;
  const element = React.createElement(KycDecisionEmail, {
    fullName,
    approved,
    rejectionReason,
    accountType,
  });
  const html = await render(element);

  const text = approved
    ? [
        `Oruvia - You are now a verified ${accountType}`,
        '',
        `Hello ${fullName},`,
        '',
        'Your identity document was approved by our team. Your profile now carries the Oruvia Verified badge, and you can publish listings.',
        '',
        'For your security, Oruvia never asks for your BVN or full ID number by email.',
      ].join('\n')
    : [
        `Oruvia - Identity verification rejected for your ${accountType} account`,
        '',
        `Hello ${fullName},`,
        '',
        'We could not verify the identity document you submitted.',
        rejectionReason ? `Reason: ${rejectionReason}` : '',
        '',
        'You can submit a different, clearly legible government-issued ID (such as a NIN slip, driver’s licence or international passport) from the verification screen in your dashboard.',
        '',
        'For your security, Oruvia never asks for your BVN or full ID number by email.',
      ]
        .filter(Boolean)
        .join('\n');

  return { subject, text, html };
}
