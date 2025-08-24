/**
 * Email Service
 * Handles all email-related functionality for the application
 */

const nodemailer = require('nodemailer');
const path = require('path');

// Nodemailer Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

/**
 * Send OTP via email for account verification
 * @param {string} email - Recipient email address
 * @param {string} otp - One-time password to send
 * @returns {Promise<{success: boolean, error?: string}>} Success status and optional error
 */
const sendOTPEmail = async (email, otp) => {
  try {
    // Create a transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });

    // Path to logo
    const logoPath = path.join(__dirname, '../public/images/founder-connect-logo.svg');

    // Email options
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'FOUNDER CONNECT - Email Verification OTP',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4285f4; padding: 20px; text-align: center; color: white;">
          <h1><img src="cid:logo" alt="FOUNDER CONNECT" style="height: 60px; vertical-align: middle; margin-right: 10px;">FOUNDER CONNECT</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <p>Thank you for registering with FOUNDER CONNECT. Please use the following OTP to verify your email address:</p>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP is valid for 10 minutes. If you did not request this verification, please ignore this email.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #777; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} FOUNDER CONNECT. All rights reserved.</p>
          </div>
        </div>
      </div>
      `,
      attachments: [
        {
          filename: 'founder-connect-logo.svg',
          path: logoPath,
          cid: 'logo'
        }
      ]
    };

    // Send email
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

exports.sendOTPEmail = sendOTPEmail;

/**
 * Send password reset email with token link
 * @param {string} email - Recipient email address
 * @param {string} token - Reset token
 * @returns {Promise<boolean>} Success status
 */
exports.sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${process.env.SITE_URL}/reset-password?token=${token}`;
  
  // Path to logo
  const logoPath = path.join(__dirname, '../public/images/founder-connect-logo.svg');
  
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'FOUNDER CONNECT - Password Reset',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4285f4; padding: 20px; text-align: center; color: white;">
          <h1><img src="cid:logo" alt="FOUNDER CONNECT" style="height: 60px; vertical-align: middle; margin-right: 10px;">FOUNDER CONNECT</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <h2>Password Reset</h2>
          <p>You requested a password reset for your FOUNDER CONNECT account. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4285f4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Reset Password</a>
          </div>
          <p>If you didn't request this reset, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>&copy; ${new Date().getFullYear()} FOUNDER CONNECT. All rights reserved.</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: 'founder-connect-logo.svg',
        path: logoPath,
        cid: 'logo'
      }
    ]
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

/**
 * Send welcome email to newly registered users
 * @param {string} email - Recipient email address
 * @param {string} name - User's name
 * @returns {Promise<boolean>} Success status
 */
exports.sendWelcomeEmail = async (email, name) => {
  // Path to logo
  const logoPath = path.join(__dirname, '../public/images/founder-connect-logo.svg');
  
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Welcome to FOUNDER CONNECT!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4285f4; padding: 20px; text-align: center; color: white;">
          <h1><img src="cid:logo" alt="FOUNDER CONNECT" style="height: 60px; vertical-align: middle; margin-right: 10px;">FOUNDER CONNECT</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <h2>Welcome, ${name}!</h2>
          <p>Thank you for joining FOUNDER CONNECT - the next-gen social graph for founders, builders, funders, operators, vendors, and visionaries.</p>
          
          <div style="margin: 30px 0;">
            <h3>Get Started:</h3>
            <ul style="line-height: 1.6;">
              <li>Complete your profile to stand out</li>
              <li>Connect with other founders and investors</li>
              <li>Explore opportunities in your network</li>
              <li>Share your journey and insights</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.SITE_URL}/profile" style="background-color: #4285f4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Complete Your Profile</a>
          </div>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>&copy; ${new Date().getFullYear()} FOUNDER CONNECT. All rights reserved.</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: 'founder-connect-logo.svg',
        path: logoPath,
        cid: 'logo'
      }
    ]
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

/**
 * Send introduction email to business contacts
 * @param {string} toEmail - Recipient email address
 * @param {string} fromName - Sender's name
 * @param {string} fromEmail - Sender's email address
 * @param {string} businessContext - Context about the business or industry
 * @returns {Promise<{success: boolean, error?: string}>} Success status and optional error
 */
exports.sendIntroEmail = async (toEmail, fromName, fromEmail, businessContext) => {
  try {
    // Path to logo
    const logoPath = path.join(__dirname, '../public/images/founder-connect-logo.svg');
    
    // Format the business context if provided
    const contextSection = businessContext ? `
      <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #4285f4;">
        <p style="margin: 0; font-style: italic;">${businessContext}</p>
      </div>
    ` : '';
    
    // Email options
    const mailOptions = {
      from: `"${fromName} via FOUNDER CONNECT" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      replyTo: fromEmail,
      subject: `Introduction from ${fromName} via FOUNDER CONNECT`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4285f4; padding: 20px; text-align: center; color: white;">
          <h1><img src="cid:logo" alt="FOUNDER CONNECT" style="height: 60px; vertical-align: middle; margin-right: 10px;">FOUNDER CONNECT</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <h2>Hello,</h2>
          <p>I'm ${fromName}, reaching out to you through FOUNDER CONNECT, a platform connecting founders, investors, and business professionals.</p>
          
          ${contextSection}
          
          <p>I'd love to connect and explore potential opportunities to collaborate or share insights about our respective ventures.</p>
          
          <p>Feel free to reply directly to this email or connect with me on FOUNDER CONNECT.</p>
          
          <div style="margin-top: 30px;">
            <p>Best regards,<br>${fromName}<br>${fromEmail}</p>
          </div>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>This introduction was facilitated by <a href="${process.env.SITE_URL}" style="color: #4285f4; text-decoration: none;">FOUNDER CONNECT</a>.</p>
          <p>&copy; ${new Date().getFullYear()} FOUNDER CONNECT. All rights reserved.</p>
        </div>
      </div>
      `,
      attachments: [
        {
          filename: 'founder-connect-logo.svg',
          path: logoPath,
          cid: 'logo'
        }
      ]
    };

    // Send email
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending intro email:', error);
    return { success: false, error: error.message };
  }
};