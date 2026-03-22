const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  // Check if email config is set
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('⚠️  Email configuration incomplete. Missing required fields:');
    if (!process.env.SMTP_HOST) console.warn('   - SMTP_HOST');
    if (!process.env.SMTP_USER) console.warn('   - SMTP_USER');
    if (!process.env.SMTP_PASSWORD) console.warn('   - SMTP_PASSWORD');
    console.warn('   Password reset emails will not be sent.');
    return null;
  }

  const isGmail = (process.env.SMTP_HOST || '').toLowerCase().includes('gmail.com');
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1';

  // Use nodemailer's built-in Gmail config when using Gmail (more reliable with App Password)
  const transporterConfig = isGmail
    ? {
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      }
    : {
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
        tls: { rejectUnauthorized: false },
      };

  // Connection timeout so we don't hang if SMTP is unreachable
  transporterConfig.connectionTimeout = 10000;
  transporterConfig.greetingTimeout = 5000;

  try {
    const transporter = nodemailer.createTransport(transporterConfig);
    
    // Verify connection on creation (optional, can be removed if causing issues)
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ SMTP connection verification failed:', error.message);
        console.error('   Check your SMTP credentials in .env file');
      } else {
        console.log('✅ SMTP connection verified successfully');
      }
    });
    
    return transporter;
  } catch (error) {
    console.error('❌ Error creating email transporter:', error.message);
    return null;
  }
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name (optional)
 * @returns {Promise<boolean>} - Returns true if email was sent successfully
 */
const sendPasswordResetEmail = async (email, resetToken, userName = 'User') => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('📧 Email not configured. Reset token (for testing):', resetToken);
    return false;
  }

  // Get frontend URL from environment or use default
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'Volunteer Connect'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Password Reset Request - Volunteer Connect',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .token { background: #fff; padding: 15px; border-radius: 5px; margin: 20px 0; font-family: monospace; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>We received a request to reset your password for your Volunteer Connect account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <div class="token">${resetLink}</div>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            <p>Best regards,<br>Volunteer Connect Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Password Reset Request - Volunteer Connect
      
      Hello ${userName},
      
      We received a request to reset your password for your Volunteer Connect account.
      
      Click this link to reset your password:
      ${resetLink}
      
      This link will expire in 1 hour.
      
      If you didn't request a password reset, please ignore this email.
      
      Best regards,
      Volunteer Connect Team
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully');
    console.log('   To:', email);
    console.log('   Message ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:');
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    
    // Provide helpful error messages
    if (error.code === 'EAUTH') {
      console.error('   ⚠️  Authentication failed. Check SMTP_USER and SMTP_PASSWORD in .env');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.error('   ⚠️  Connection failed. Check SMTP_HOST and SMTP_PORT in .env');
    } else if (error.code === 'EENVELOPE') {
      console.error('   ⚠️  Invalid email address');
    }
    
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  createTransporter,
};

