export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailSender {
  sendEmail(message: EmailMessage): Promise<void>;
}
