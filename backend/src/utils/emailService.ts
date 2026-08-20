import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const testEmailConnection = async (): Promise<boolean> => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return false;
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
};
