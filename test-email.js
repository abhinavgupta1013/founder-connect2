require('dotenv').config();
const nodemailer = require('nodemailer');

// Create a test function
async function testEmailService() {
  console.log('Testing email service with the following credentials:');
  console.log('GMAIL_USER:', process.env.GMAIL_USER);
  console.log('GMAIL_PASS:', '********'); // Don't log the actual password

  try {
    // Create a transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });

    // Verify connection
    console.log('Verifying SMTP connection...');
    const connectionResult = await transporter.verify();
    console.log('SMTP Connection verified:', connectionResult);

    // Send a test email
    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER, // Send to self for testing
      subject: 'FOUNDER CONNECT - Test Email',
      text: 'This is a test email to verify the email service is working correctly.',
      html: '<p>This is a test email to verify the email service is working correctly.</p>'
    });

    console.log('Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    return true;
  } catch (error) {
    console.error('Error testing email service:', error);
    return false;
  }
}

// Run the test
testEmailService()
  .then(result => {
    console.log('Test completed with result:', result);
    process.exit(result ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });