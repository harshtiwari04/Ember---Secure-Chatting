/**
 * utils/sendEmail.js
 * ------------------
 * Thin wrapper around Nodemailer so the rest of the app can just call
 * sendEmail({ to, subject, html }) without worrying about transport setup.
 */

const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports (STARTTLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, html }) {
  const mailTransporter = getTransporter();
  await mailTransporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

/** Small helper to render a consistent, minimal OTP email template. */
function otpEmailTemplate({ code, purpose, minutes }) {
  const heading =
    purpose === 'register' ? 'Verify your email' : 'Reset your password';
  const body =
    purpose === 'register'
      ? 'Use this code to finish creating your Secure Chat account.'
      : 'Use this code to reset your Secure Chat password.';

  return `
  <div style="font-family: -apple-system, Segoe UI, sans-serif; background:#0B0A0D; padding:32px; color:#F5EFE6;">
    <div style="max-width:420px; margin:0 auto; background:#15121A; border:1px solid #2A2430; border-radius:12px; padding:32px;">
      <h2 style="margin:0 0 8px; font-size:20px; color:#F5EFE6;">${heading}</h2>
      <p style="margin:0 0 24px; font-size:14px; color:#9C9389;">${body}</p>
      <div style="font-size:32px; letter-spacing:8px; font-weight:700; text-align:center; padding:16px 0; color:#FF7A45;">
        ${code}
      </div>
      <p style="margin:24px 0 0; font-size:12px; color:#6E655C;">
        This code expires in ${minutes} minutes. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  </div>`;
}

module.exports = { sendEmail, otpEmailTemplate };
