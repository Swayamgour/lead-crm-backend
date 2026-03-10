// src/utils/emailService.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

export const sendWelcomeEmail = async (executive) => {
  const html = `
    <h1>Welcome to CRM System</h1>
    <p>Hello ${executive.name},</p>
    <p>Your account has been created successfully.</p>
    <p>Email: ${executive.email}</p>
    <p>Password: ${executive.tempPassword}</p>
    <p>Please login and change your password.</p>
  `;

  await sendEmail({
    to: executive.email,
    subject: 'Welcome to CRM System',
    html
  });
};