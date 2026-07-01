'use strict';
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

const send = async ({ to, subject, html, text }) => {
  try {
    const info = await getTransporter().sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to, subject, html, text,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Email send failed to ${to}: ${err.message}`);
    throw err;
  }
};

const sendPasswordReset = async ({ email, name, token }) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await send({
    to: email,
    subject: 'ProHorizon Scope Tracker — Password Reset',
    html: `
      <h2>Password Reset Request</h2>
      <p>Hi ${name},</p>
      <p>You requested to reset your password. Click the link below (valid for 1 hour):</p>
      <a href="${resetUrl}" style="background:#3b5bdb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Reset Password</a>
      <p style="margin-top:20px;color:#888;">If you did not request this, ignore this email.</p>
    `,
  });
};

const sendWelcome = async ({ email, name, tempPassword }) => {
  await send({
    to: email,
    subject: 'Welcome to ProHorizon Scope Tracker',
    html: `
      <h2>Welcome, ${name}!</h2>
      <p>Your account has been created on <strong>ProHorizon Scope Tracker</strong>.</p>
      <p><strong>Login:</strong> ${email}</p>
      <p><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
      <p>Please change your password after first login.</p>
      <a href="${process.env.FRONTEND_URL}/login" style="background:#3b5bdb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Login Now</a>
    `,
  });
};

const sendTaskAssignment = async ({ email, name, taskTitle, projectName, dueDate, assignerName }) => {
  await send({
    to: email,
    subject: `[ProHorizon] Task Assigned: ${taskTitle}`,
    html: `
      <h2>New Task Assigned</h2>
      <p>Hi ${name},</p>
      <p><strong>${assignerName}</strong> assigned you a task:</p>
      <ul>
        <li><strong>Task:</strong> ${taskTitle}</li>
        <li><strong>Project:</strong> ${projectName}</li>
        ${dueDate ? `<li><strong>Due:</strong> ${dueDate}</li>` : ''}
      </ul>
      <a href="${process.env.FRONTEND_URL}/tasks" style="background:#3b5bdb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">View Task</a>
    `,
  });
};

module.exports = { send, sendPasswordReset, sendWelcome, sendTaskAssignment };
