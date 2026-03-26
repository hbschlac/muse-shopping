/**
 * Email Service
 * Handles sending emails for password resets, welcome emails, etc.
 */

const nodemailer = require('nodemailer');
const logger = require('../config/logger');

/**
 * Create email transporter
 * Uses SMTP configuration from environment variables
 */
const createTransporter = () => {
  // Check if email is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn('Email service not fully configured. Check SMTP environment variables.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465', // true for port 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's full name
 * @returns {Promise<boolean>} - Success status
 */
async function sendPasswordResetEmail(email, resetToken, userName) {
  try {
    if (process.env.NODE_ENV === 'test') {
      logger.info(`[emailService] TEST MODE — skipping real send to: ${email}`);
      return { messageId: 'test-skipped' };
    }

    const transporter = createTransporter();

    if (!transporter) {
      logger.error('Cannot send email: Email service not configured');
      // In development, just log the token
      logger.info(`[DEV] Password reset token for ${email}: ${resetToken}`);
      logger.info(`[DEV] Reset link: ${process.env.BASE_URL}/auth/reset-password?token=${resetToken}`);
      return true; // Return success so app doesn't break in dev
    }

    const resetLink = `${process.env.BASE_URL}/auth/reset-password?token=${resetToken}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #FEFDFB;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #FFFFFF;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          .logo {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo img {
            height: 40px;
            max-width: 200px;
          }
          .content {
            margin-bottom: 32px;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background-color: #F4C4B0;
            color: #333333;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 500;
            margin: 24px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #E9E5DF;
            font-size: 14px;
            color: #6B625C;
          }
          .link {
            color: #6B625C;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="${process.env.BASE_URL || 'https://muse.shopping'}/muse-wordmark-gradient.svg" alt="Muse" />
          </div>
          <div class="content">
            <h2 style="color: #333333; margin-top: 0;">Reset Your Password</h2>
            <p>Hi ${userName || 'there'},</p>
            <p>We received a request to reset your password for your Muse account. Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.</p>
          </div>
          <div class="footer">
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p class="link">${resetLink}</p>
            <p style="margin-top: 24px;">Shop all your favorites in one place,<br>The Muse Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Reset Your Password

Hi ${userName || 'there'},

We received a request to reset your password for your Muse account.

Click this link to create a new password:
${resetLink}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.

---
Shop all your favorites in one place,
The Muse Team
    `.trim();

    const mailOptions = {
      from: process.env.EMAIL_FROM_NOREPLY || process.env.EMAIL_FROM || 'Muse <noreply@muse.shopping>',
      to: email,
      subject: 'Reset Your Muse Password',
      text: textContent,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send password reset email to ${email}:`, error);
    // In non-production, don't fail auth flows on SMTP issues.
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[DEV] Password reset token for ${email}: ${resetToken}`);
      logger.info(`[DEV] Reset link: ${process.env.BASE_URL}/auth/reset-password?token=${resetToken}`);
      return true;
    }
    throw error;
  }
}

/**
 * Send welcome email to new users
 * @param {string} email - Recipient email address
 * @param {string} userName - User's full name
 * @returns {Promise<boolean>} - Success status
 */
async function sendWelcomeEmail(email, userName) {
  try {
    if (process.env.NODE_ENV === 'test') {
      logger.info(`[emailService] TEST MODE — skipping real send to: ${email}`);
      return { messageId: 'test-skipped' };
    }

    const transporter = createTransporter();

    if (!transporter) {
      logger.warn('Cannot send welcome email: Email service not configured');
      return true; // Return success so app doesn't break in dev
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #FEFDFB;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #FFFFFF;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          .logo {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo img {
            height: 40px;
            max-width: 200px;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background-color: #F4C4B0;
            color: #333333;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 500;
            margin: 24px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #E9E5DF;
            font-size: 14px;
            color: #6B625C;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="${process.env.BASE_URL || 'https://muse.shopping'}/muse-wordmark-gradient.svg" alt="Muse" />
          </div>
          <div style="margin-bottom: 32px;">
            <h2 style="color: #333333; margin-top: 0;">Welcome to Muse!</h2>
            <p>Hi ${userName},</p>
            <p>We're excited to have you join Muse! Your account has been created successfully.</p>
            <p>Muse brings together all your favorite brands and products in one personalized feed. Discover, save, and shop everything you love, all in one place.</p>
            <div style="text-align: center;">
              <a href="${process.env.BASE_URL}" class="button">Start Shopping</a>
            </div>
          </div>
          <div class="footer">
            <p>Shop all your favorites in one place,<br>The Muse Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Welcome to Muse!

Hi ${userName},

We're excited to have you join Muse! Your account has been created successfully.

Muse brings together all your favorite brands and products in one personalized feed. Discover, save, and shop everything you love, all in one place.

Visit: ${process.env.BASE_URL}

---
Shop all your favorites in one place,
The Muse Team
    `.trim();

    const mailOptions = {
      from: process.env.EMAIL_FROM_TEAM || process.env.EMAIL_FROM || 'Muse Team <team@muse.shopping>',
      to: email,
      subject: 'Welcome to Muse!',
      text: textContent,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send welcome email to ${email}:`, error);
    // Don't throw - welcome email is not critical
    return false;
  }
}

/**
 * Send marketing/promotional email to shopper
 * @param {string} email - Recipient email address
 * @param {string} userName - User's full name
 * @param {object} emailData - Email content data
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.preheader - Preview text
 * @param {string} emailData.heading - Main heading
 * @param {string} emailData.body - Email body content (HTML or plain text)
 * @param {string} emailData.buttonText - CTA button text (optional)
 * @param {string} emailData.buttonUrl - CTA button URL (optional)
 * @returns {Promise<boolean>} - Success status
 */
async function sendMarketingEmail(email, userName, emailData) {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      logger.warn('Cannot send marketing email: Email service not configured');
      logger.info(`[DEV] Marketing email to ${email}: ${emailData.subject}`);
      return true; // Return success so app doesn't break in dev
    }

    const { subject, preheader, heading, body, buttonText, buttonUrl } = emailData;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${preheader ? `<meta name="description" content="${preheader}">` : ''}
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #FEFDFB;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #FFFFFF;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          .logo {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo img {
            height: 40px;
            max-width: 200px;
          }
          .content {
            margin-bottom: 32px;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background-color: #F4C4B0;
            color: #333333;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 500;
            margin: 24px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #E9E5DF;
            font-size: 14px;
            color: #6B625C;
          }
          .unsubscribe {
            margin-top: 16px;
            font-size: 12px;
            color: #6B625C;
          }
          .unsubscribe a {
            color: #6B625C;
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        ${preheader ? `<div style="display:none;max-height:0px;overflow:hidden;">${preheader}</div>` : ''}
        <div class="container">
          <div class="logo">
            <img src="${process.env.BASE_URL || 'https://muse.shopping'}/muse-wordmark-gradient.svg" alt="Muse" />
          </div>
          <div class="content">
            <h2 style="color: #333333; margin-top: 0;">${heading}</h2>
            <p>Hi ${userName},</p>
            ${body}
            ${buttonText && buttonUrl ? `
              <div style="text-align: center;">
                <a href="${buttonUrl}" class="button">${buttonText}</a>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>Shop all your favorites in one place,<br>The Muse Team</p>
            <div class="unsubscribe">
              <a href="${process.env.BASE_URL}/profile/privacy">Manage email preferences</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Generate plain text version
    const textContent = `
${heading}

Hi ${userName},

${body.replace(/<[^>]*>/g, '').replace(/\n\n+/g, '\n\n')}

${buttonText && buttonUrl ? `${buttonText}: ${buttonUrl}\n\n` : ''}
---
Shop all your favorites in one place,
The Muse Team

Manage email preferences: ${process.env.BASE_URL}/profile/privacy
    `.trim();

    const mailOptions = {
      from: process.env.EMAIL_FROM_MARKETING || process.env.EMAIL_FROM || 'Muse <hello@muse.shopping>',
      to: email,
      subject,
      text: textContent,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Marketing email sent to ${email}: ${subject}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send marketing email to ${email}:`, error);
    throw error;
  }
}

/**
 * Send transactional email to shopper
 * @param {string} email - Recipient email address
 * @param {string} userName - User's full name
 * @param {object} emailData - Email content data
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.heading - Main heading
 * @param {string} emailData.body - Email body content (HTML or plain text)
 * @param {string} emailData.buttonText - CTA button text (optional)
 * @param {string} emailData.buttonUrl - CTA button URL (optional)
 * @returns {Promise<boolean>} - Success status
 */
async function sendTransactionalEmail(email, userName, emailData) {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      logger.warn('Cannot send transactional email: Email service not configured');
      logger.info(`[DEV] Transactional email to ${email}: ${emailData.subject}`);
      return true;
    }

    const { subject, heading, body, buttonText, buttonUrl } = emailData;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #FEFDFB;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #FFFFFF;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          .logo {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo img {
            height: 40px;
            max-width: 200px;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background-color: #F4C4B0;
            color: #333333;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 500;
            margin: 24px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #E9E5DF;
            font-size: 14px;
            color: #6B625C;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="${process.env.BASE_URL || 'https://muse.shopping'}/muse-wordmark-gradient.svg" alt="Muse" />
          </div>
          <div style="margin-bottom: 32px;">
            <h2 style="color: #333333; margin-top: 0;">${heading}</h2>
            <p>Hi ${userName},</p>
            ${body}
            ${buttonText && buttonUrl ? `
              <div style="text-align: center;">
                <a href="${buttonUrl}" class="button">${buttonText}</a>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>Shop all your favorites in one place,<br>The Muse Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
${heading}

Hi ${userName},

${body.replace(/<[^>]*>/g, '').replace(/\n\n+/g, '\n\n')}

${buttonText && buttonUrl ? `${buttonText}: ${buttonUrl}\n\n` : ''}
---
Shop all your favorites in one place,
The Muse Team
    `.trim();

    const mailOptions = {
      from: process.env.EMAIL_FROM_NOREPLY || process.env.EMAIL_FROM || 'Muse <noreply@muse.shopping>',
      to: email,
      subject,
      text: textContent,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Transactional email sent to ${email}: ${subject}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send transactional email to ${email}:`, error);
    throw error;
  }
}

/**
 * Send admin access request notification
 * @param {object} requestData - Request details
 * @param {string} requestData.full_name - Requester's name
 * @param {string} requestData.email - Requester's email
 * @param {string} requestData.reason - Reason for request
 * @param {number} requestData.id - Request ID
 * @returns {Promise<boolean>} - Success status
 */
async function sendAdminRequestNotification(requestData) {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      logger.warn('Cannot send admin request notification: Email service not configured');
      logger.info(`[DEV] Admin request from ${requestData.email}`);
      return true;
    }

    const { full_name, email, reason, id } = requestData;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #FEFDFB;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #FFFFFF;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          .logo {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo img {
            height: 40px;
            max-width: 200px;
          }
          .alert-badge {
            background: #F4C4B0;
            color: #333333;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
            margin-bottom: 16px;
          }
          .content {
            margin-bottom: 32px;
          }
          .info-box {
            background: #F4EFE7;
            border-left: 4px solid #F4C4B0;
            padding: 16px;
            margin: 24px 0;
            border-radius: 4px;
          }
          .info-label {
            font-weight: 600;
            color: #6B625C;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .info-value {
            color: #333333;
            font-size: 16px;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background-color: #F4C4B0;
            color: #333333;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 500;
            margin: 24px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #E9E5DF;
            font-size: 14px;
            color: #6B625C;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="${process.env.BASE_URL || 'https://muse.shopping'}/muse-wordmark-gradient.svg" alt="Muse" />
          </div>
          <div class="content">
            <span class="alert-badge">NEW ADMIN REQUEST</span>
            <h2 style="color: #333333; margin-top: 8px;">Admin Access Request</h2>
            <p>A new admin access request has been submitted.</p>

            <div class="info-box">
              <div class="info-label">Request ID</div>
              <div class="info-value">#${id}</div>
            </div>

            <div class="info-box">
              <div class="info-label">Full Name</div>
              <div class="info-value">${full_name}</div>
            </div>

            <div class="info-box">
              <div class="info-label">Email Address</div>
              <div class="info-value">${email}</div>
            </div>

            ${reason ? `
            <div class="info-box">
              <div class="info-label">Reason for Request</div>
              <div class="info-value">${reason}</div>
            </div>
            ` : ''}

            <div style="text-align: center;">
              <a href="${process.env.BASE_URL}/api/v1/admin/email-ui" class="button">Review in Admin Panel</a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Muse Admin System.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
NEW ADMIN ACCESS REQUEST

Request ID: #${id}
Full Name: ${full_name}
Email: ${email}
${reason ? `Reason: ${reason}` : ''}

Review this request in the admin panel: ${process.env.BASE_URL}/api/v1/admin/email-ui

---
This is an automated notification from Muse Admin System.
    `.trim();

    const mailOptions = {
      from: process.env.EMAIL_FROM_NOREPLY || process.env.EMAIL_FROM || 'Muse <noreply@muse.shopping>',
      to: process.env.EMAIL_FROM_SUPPORT || 'support@muse.shopping',
      subject: `[ADMIN REQUEST] ${full_name} - Request #${id}`,
      text: textContent,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Admin request notification sent for request #${id}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send admin request notification:`, error);
    throw error;
  }
}

/**
 * Send feedback notification to feedback@muse.shopping
 * @param {Object} feedback - Feedback submission
 * @returns {Promise<boolean>} - Success status
 */
async function sendFeedbackNotificationEmail(feedback) {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      logger.warn('Cannot send feedback notification: Email service not configured');
      logger.info(`[DEV] Feedback notification: ${feedback.ticket_number}`);
      return true;
    }

    const categoryLabels = {
      bug: 'Bug Report',
      feature_request: 'Feature Request',
      complaint: 'Complaint',
      question: 'Question',
      tech_help: 'Tech Help',
      other: 'Other'
    };

    const categoryLabel = categoryLabels[feedback.category] || feedback.category;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #FEFDFB;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #FFFFFF;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          .logo {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo img {
            height: 40px;
            max-width: 200px;
          }
          .alert-badge {
            background: #F4C4B0;
            color: #333333;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
            margin-bottom: 16px;
          }
          .ticket-number {
            background: #F4EFE7;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 18px;
            font-weight: 600;
            color: #333333;
            text-align: center;
            margin: 24px 0;
          }
          .info-box {
            background: #F4EFE7;
            border-left: 4px solid #F4C4B0;
            padding: 16px;
            margin: 16px 0;
            border-radius: 4px;
          }
          .info-label {
            font-weight: 600;
            color: #6B625C;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .info-value {
            color: #333333;
            font-size: 16px;
          }
          .message-box {
            background: #FEFDFB;
            border: 1px solid #E9E5DF;
            padding: 20px;
            margin: 24px 0;
            border-radius: 8px;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #E9E5DF;
            font-size: 14px;
            color: #6B625C;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="${process.env.BASE_URL || 'https://muse.shopping'}/muse-wordmark-gradient.svg" alt="Muse" />
          </div>
          <div>
            <span class="alert-badge">NEW FEEDBACK</span>
            <h2 style="color: #333333; margin-top: 8px;">New Feedback Submission</h2>

            <div class="ticket-number">
              Ticket: ${feedback.ticket_number}
            </div>

            <div class="info-box">
              <div class="info-label">Category</div>
              <div class="info-value">${categoryLabel}</div>
            </div>

            <div class="info-box">
              <div class="info-label">From</div>
              <div class="info-value">${feedback.full_name || 'Anonymous'} (${feedback.email})</div>
            </div>

            <div class="info-box">
              <div class="info-label">Subject</div>
              <div class="info-value">${feedback.subject}</div>
            </div>

            <div class="info-box">
              <div class="info-label">Message</div>
              <div class="message-box">${feedback.message}</div>
            </div>

            ${feedback.user_agent ? `
            <div class="info-box">
              <div class="info-label">User Agent</div>
              <div class="info-value" style="font-size: 12px; color: #6B625C;">${feedback.user_agent}</div>
            </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>Submitted on ${new Date(feedback.created_at).toLocaleString()}</p>
            <p style="margin-top: 16px; font-size: 12px;">This is an automated notification from Muse Feedback System.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
NEW FEEDBACK SUBMISSION

Ticket Number: ${feedback.ticket_number}
Category: ${categoryLabel}
From: ${feedback.full_name || 'Anonymous'} (${feedback.email})
Subject: ${feedback.subject}

Message:
${feedback.message}

${feedback.user_agent ? `User Agent: ${feedback.user_agent}` : ''}

Submitted on: ${new Date(feedback.created_at).toLocaleString()}

---
This is an automated notification from Muse Feedback System.
    `.trim();

    // Determine recipients based on category
    let recipients = process.env.EMAIL_FEEDBACK || 'feedback@muse.shopping';

    // Tech help goes to both feedback@ and help@
    if (feedback.category === 'tech_help') {
      const helpEmail = process.env.EMAIL_HELP || 'help@muse.shopping';
      recipients = `${recipients}, ${helpEmail}`;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM_NOREPLY || process.env.EMAIL_FROM || 'Muse <noreply@muse.shopping>',
      to: recipients,
      subject: `[${feedback.ticket_number}] ${categoryLabel}: ${feedback.subject}`,
      text: textContent,
      html: htmlContent,
      replyTo: feedback.email
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Feedback notification sent for ${feedback.ticket_number}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send feedback notification for ${feedback.ticket_number}:`, error);
    // Don't throw - feedback was saved successfully
    return false;
  }
}

/**
 * Send feedback confirmation to user
 * @param {Object} feedback - Feedback submission
 * @returns {Promise<boolean>} - Success status
 */
async function sendFeedbackConfirmationEmail(feedback) {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      logger.warn('Cannot send feedback confirmation: Email service not configured');
      logger.info(`[DEV] Feedback confirmation to ${feedback.email}: ${feedback.ticket_number}`);
      return true;
    }

    const categoryLabels = {
      bug: 'Bug Report',
      feature_request: 'Feature Request',
      complaint: 'Complaint',
      question: 'Question',
      tech_help: 'Tech Help',
      other: 'Other'
    };

    const categoryLabel = categoryLabels[feedback.category] || feedback.category;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #FEFDFB;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #FFFFFF;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          .logo {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo img {
            height: 40px;
            max-width: 200px;
          }
          .success-badge {
            background: #D4F4DD;
            color: #1E5631;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
            margin-bottom: 16px;
          }
          .ticket-number {
            background: #F4EFE7;
            padding: 16px 24px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 20px;
            font-weight: 600;
            color: #333333;
            text-align: center;
            margin: 24px 0;
            border: 2px dashed #F4C4B0;
          }
          .content {
            margin-bottom: 32px;
          }
          .info-box {
            background: #F4EFE7;
            padding: 20px;
            margin: 24px 0;
            border-radius: 8px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #E9E5DF;
            font-size: 14px;
            color: #6B625C;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="${process.env.BASE_URL || 'https://muse.shopping'}/muse-wordmark-gradient.svg" alt="Muse" />
          </div>
          <div class="content">
            <span class="success-badge">✓ FEEDBACK RECEIVED</span>
            <h2 style="color: #333333; margin-top: 8px;">Thank You for Your Feedback!</h2>
            <p>Hi ${feedback.full_name || 'there'},</p>
            <p>We've received your feedback and created a ticket for tracking. Our team will review it and get back to you as soon as possible.</p>

            <div class="ticket-number">
              ${feedback.ticket_number}
            </div>

            <p style="text-align: center; color: #6B625C; font-size: 14px;">Save this ticket number for your records</p>

            <div class="info-box">
              <p style="margin: 0; font-weight: 600; margin-bottom: 8px;">Your Submission</p>
              <p style="margin: 4px 0; color: #6B625C;"><strong>Category:</strong> ${categoryLabel}</p>
              <p style="margin: 4px 0; color: #6B625C;"><strong>Subject:</strong> ${feedback.subject}</p>
            </div>

            <p>We typically respond to feedback within 2-3 business days. If your issue is urgent, please reach out to us directly at <a href="mailto:support@muse.shopping" style="color: #F4C4B0;">support@muse.shopping</a>.</p>
          </div>
          <div class="footer">
            <p>Shop all your favorites in one place,<br>The Muse Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Thank You for Your Feedback!

Hi ${feedback.full_name || 'there'},

We've received your feedback and created a ticket for tracking. Our team will review it and get back to you as soon as possible.

TICKET NUMBER: ${feedback.ticket_number}
(Save this ticket number for your records)

Your Submission:
Category: ${categoryLabel}
Subject: ${feedback.subject}

We typically respond to feedback within 2-3 business days. If your issue is urgent, please reach out to us directly at support@muse.shopping.

---
Shop all your favorites in one place,
The Muse Team
    `.trim();

    const mailOptions = {
      from: process.env.EMAIL_FROM_TEAM || process.env.EMAIL_FROM || 'Muse Team <team@muse.shopping>',
      to: feedback.email,
      subject: `[${feedback.ticket_number}] We've received your feedback`,
      text: textContent,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Feedback confirmation sent to ${feedback.email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send feedback confirmation to ${feedback.email}:`, error);
    // Don't throw - feedback was saved successfully
    return false;
  }
}

/**
 * Send notification to user when admin responds to their feedback
 * @param {Object} feedback - Feedback submission
 * @param {Object} response - Admin response
 * @param {string} adminName - Name of admin who responded
 * @returns {Promise<boolean>} - Success status
 */
async function sendFeedbackResponseNotification(feedback, response, adminName = 'Our Team') {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      logger.warn('Cannot send response notification: Email service not configured');
      logger.info(`[DEV] Response notification to ${feedback.email}: ${feedback.ticket_number}`);
      return true;
    }

    const categoryLabels = {
      bug: 'Bug Report',
      feature_request: 'Feature Request',
      complaint: 'Complaint',
      question: 'Question',
      tech_help: 'Tech Help',
      other: 'Other'
    };

    const categoryLabel = categoryLabels[feedback.category] || feedback.category;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #FEFDFB;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #FFFFFF;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          .logo {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo img {
            height: 40px;
            max-width: 200px;
          }
          .update-badge {
            background: #E3F2FD;
            color: #1565C0;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
            margin-bottom: 16px;
          }
          .ticket-number {
            background: #F4EFE7;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            font-weight: 600;
            color: #333333;
            text-align: center;
            margin: 16px 0;
          }
          .response-box {
            background: #FEFDFB;
            border-left: 4px solid #F4C4B0;
            padding: 20px;
            margin: 24px 0;
            border-radius: 4px;
          }
          .your-message-box {
            background: #F4EFE7;
            padding: 16px;
            border-radius: 8px;
            margin: 16px 0;
            font-size: 14px;
            color: #6B625C;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background-color: #F4C4B0;
            color: #333333;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 500;
            margin: 24px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #E9E5DF;
            font-size: 14px;
            color: #6B625C;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="${process.env.BASE_URL || 'https://muse.shopping'}/muse-wordmark-gradient.svg" alt="Muse" />
          </div>
          <div>
            <span class="update-badge">📬 NEW RESPONSE</span>
            <h2 style="color: #333333; margin-top: 8px;">We've Responded to Your Feedback</h2>
            <p>Hi ${feedback.full_name || 'there'},</p>
            <p>${adminName} has responded to your ${categoryLabel.toLowerCase()}:</p>

            <div class="ticket-number">
              Ticket: ${feedback.ticket_number}
            </div>

            <p style="font-weight: 600; margin-bottom: 8px; color: #333333;">Their Response:</p>
            <div class="response-box">
              ${response.message.replace(/\n/g, '<br>')}
            </div>

            <p style="font-size: 14px; color: #6B625C; margin-top: 24px;">Your Original Message:</p>
            <div class="your-message-box">
              <strong>${feedback.subject}</strong><br>
              ${feedback.message.substring(0, 200)}${feedback.message.length > 200 ? '...' : ''}
            </div>

            <p>If you have any questions or need further assistance, you can reply to this email or contact us at <a href="mailto:support@muse.shopping" style="color: #F4C4B0; text-decoration: none;">support@muse.shopping</a>.</p>

            <div style="text-align: center;">
              <a href="${process.env.BASE_URL}/feedback" class="button">Submit New Feedback</a>
            </div>
          </div>
          <div class="footer">
            <p>Shop all your favorites in one place,<br>The Muse Team</p>
            <p style="margin-top: 16px; font-size: 12px; color: #6B625C;">
              Reference: ${feedback.ticket_number} • ${categoryLabel}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
📬 NEW RESPONSE

We've Responded to Your Feedback

Hi ${feedback.full_name || 'there'},

${adminName} has responded to your ${categoryLabel.toLowerCase()}:

Ticket: ${feedback.ticket_number}

Their Response:
${response.message}

---

Your Original Message:
${feedback.subject}
${feedback.message.substring(0, 200)}${feedback.message.length > 200 ? '...' : ''}

---

If you have any questions or need further assistance, you can reply to this email or contact us at support@muse.shopping.

---
Shop all your favorites in one place,
The Muse Team

Reference: ${feedback.ticket_number} • ${categoryLabel}
    `.trim();

    const mailOptions = {
      from: process.env.EMAIL_FROM_TEAM || process.env.EMAIL_FROM || 'Muse Team <team@muse.shopping>',
      to: feedback.email,
      subject: `[${feedback.ticket_number}] New response from ${adminName}`,
      text: textContent,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Response notification sent to ${feedback.email} for ${feedback.ticket_number}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send response notification to ${feedback.email}:`, error);
    // Don't throw - response was saved successfully
    return false;
  }
}

/**
 * Send notification to user when ticket status changes
 * @param {Object} feedback - Feedback submission
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @returns {Promise<boolean>} - Success status
 */
async function sendStatusUpdateNotification(feedback, oldStatus, newStatus) {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      logger.warn('Cannot send status update: Email service not configured');
      logger.info(`[DEV] Status update to ${feedback.email}: ${oldStatus} → ${newStatus}`);
      return true;
    }

    const categoryLabels = {
      bug: 'Bug Report',
      feature_request: 'Feature Request',
      complaint: 'Complaint',
      question: 'Question',
      tech_help: 'Tech Help',
      other: 'Other'
    };

    const statusLabels = {
      new: 'New',
      in_review: 'In Review',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed'
    };

    const categoryLabel = categoryLabels[feedback.category] || feedback.category;
    const newStatusLabel = statusLabels[newStatus] || newStatus;
    const oldStatusLabel = statusLabels[oldStatus] || oldStatus;

    // Only send email for meaningful status changes
    if (newStatus === 'resolved' || newStatus === 'closed') {
      const isResolved = newStatus === 'resolved';

      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #FEFDFB;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #FFFFFF;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          .logo {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo img {
            height: 40px;
            max-width: 200px;
          }
          .status-badge {
            background: ${isResolved ? '#D4F4DD' : '#E9E5DF'};
            color: ${isResolved ? '#1E5631' : '#6B625C'};
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
            margin-bottom: 16px;
          }
          .ticket-number {
            background: #F4EFE7;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            font-weight: 600;
            color: #333333;
            text-align: center;
            margin: 16px 0;
          }
          .resolution-box {
            background: #F4EFE7;
            padding: 20px;
            margin: 24px 0;
            border-radius: 8px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #E9E5DF;
            font-size: 14px;
            color: #6B625C;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="${process.env.BASE_URL || 'https://muse.shopping'}/muse-wordmark-gradient.svg" alt="Muse" />
          </div>
          <div>
            <span class="status-badge">${isResolved ? '✅ RESOLVED' : '📋 CLOSED'}</span>
            <h2 style="color: #333333; margin-top: 8px;">
              ${isResolved ? 'Your Feedback Has Been Resolved' : 'Your Feedback Ticket Has Been Closed'}
            </h2>
            <p>Hi ${feedback.full_name || 'there'},</p>
            <p>We wanted to let you know that your ${categoryLabel.toLowerCase()} has been ${isResolved ? 'resolved' : 'closed'}.</p>

            <div class="ticket-number">
              Ticket: ${feedback.ticket_number}
            </div>

            <p><strong>Subject:</strong> ${feedback.subject}</p>
            <p><strong>Status:</strong> ${oldStatusLabel} → ${newStatusLabel}</p>

            ${feedback.resolution_notes ? `
            <div class="resolution-box">
              <p style="font-weight: 600; margin-bottom: 8px; color: #333333;">Resolution:</p>
              <p style="margin: 0;">${feedback.resolution_notes.replace(/\n/g, '<br>')}</p>
            </div>
            ` : ''}

            <p>If you have any questions or concerns about this resolution, please don't hesitate to reach out to us at <a href="mailto:support@muse.shopping" style="color: #F4C4B0; text-decoration: none;">support@muse.shopping</a>.</p>

            <p>Thank you for helping us improve Muse!</p>
          </div>
          <div class="footer">
            <p>Shop all your favorites in one place,<br>The Muse Team</p>
            <p style="margin-top: 16px; font-size: 12px; color: #6B625C;">
              Reference: ${feedback.ticket_number} • ${categoryLabel}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

      const textContent = `
${isResolved ? '✅ RESOLVED' : '📋 CLOSED'}

${isResolved ? 'Your Feedback Has Been Resolved' : 'Your Feedback Ticket Has Been Closed'}

Hi ${feedback.full_name || 'there'},

We wanted to let you know that your ${categoryLabel.toLowerCase()} has been ${isResolved ? 'resolved' : 'closed'}.

Ticket: ${feedback.ticket_number}

Subject: ${feedback.subject}
Status: ${oldStatusLabel} → ${newStatusLabel}

${feedback.resolution_notes ? `
Resolution:
${feedback.resolution_notes}
` : ''}

If you have any questions or concerns about this resolution, please don't hesitate to reach out to us at support@muse.shopping.

Thank you for helping us improve Muse!

---
Shop all your favorites in one place,
The Muse Team

Reference: ${feedback.ticket_number} • ${categoryLabel}
      `.trim();

      const mailOptions = {
        from: process.env.EMAIL_FROM_TEAM || process.env.EMAIL_FROM || 'Muse Team <team@muse.shopping>',
        to: feedback.email,
        subject: `[${feedback.ticket_number}] ${isResolved ? 'Resolved' : 'Closed'}: ${feedback.subject}`,
        text: textContent,
        html: htmlContent
      };

      await transporter.sendMail(mailOptions);
      logger.info(`Status update notification sent to ${feedback.email} for ${feedback.ticket_number}`);
      return true;
    }

    return true; // Don't send email for other status changes
  } catch (error) {
    logger.error(`Failed to send status update to ${feedback.email}:`, error);
    // Don't throw - status was updated successfully
    return false;
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendMarketingEmail,
  sendTransactionalEmail,
  sendAdminRequestNotification,
  sendFeedbackNotificationEmail,
  sendFeedbackConfirmationEmail,
  sendFeedbackResponseNotification,
  sendStatusUpdateNotification
};
