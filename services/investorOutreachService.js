/**
 * Investor Outreach Service
 * Handles automated email drafting and sending to investor contacts
 */

const emailService = require('./emailService');
// Update OpenAI SDK initialization for v4+
let openai = null;
if (process.env.OPENAI_API_KEY) {
  const { OpenAI } = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Predefined investor contacts from the provided list
const investorContacts = [
  { email: 'capital@fundingpartners.com', website: 'https://www.fundingpartners.com', domain: 'fundingpartners.com' },
  { email: 'funding@startupvc.com', website: 'https://www.startupvc.com', domain: 'startupvc.com' },
  { email: 'partner@angelinvestors.com', website: 'https://www.angelinvestors.com', domain: 'angelinvestors.com' },
  { email: 'support@investornetwork.com', website: 'https://www.investornetwork.com', domain: 'investornetwork.com' }
];

/**
 * Get all investor contacts
 * @returns {Array} List of investor contacts
 */
const getInvestorContacts = () => {
  return investorContacts;
};

/**
 * Draft an email using AI based on topic and guidelines
 * @param {string} topic - Email topic
 * @param {string} guidelines - Content guidelines
 * @returns {Promise<string>} Generated email content
 */
const draftEmailWithAI = async (topic, guidelines) => {
  try {
    // If OpenAI is not configured, return a template email
    if (!openai) {
      return generateTemplateEmail(topic, guidelines);
    }

    const prompt = `
      Draft a professional email to potential investors with the following details:
      
      Topic: ${topic}
      Content Guidelines: ${guidelines}
      
      The email should be concise, professional, and persuasive.
      Include a clear call to action.
      Format the email in HTML with appropriate paragraphs.
      Do not include any salutation or signature as these will be added separately.
    `;

    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error('Error drafting email with AI:', error);
    // Fallback to template email if AI drafting fails
    return generateTemplateEmail(topic, guidelines);
  }
};

/**
 * Generate a template email when AI is not available
 * @param {string} topic - Email topic
 * @param {string} guidelines - Content guidelines
 * @returns {string} Template email content
 */
const generateTemplateEmail = (topic, guidelines) => {
  return `
    <p>I'm reaching out regarding ${topic}.</p>
    
    <p>${guidelines}</p>
    
    <p>I believe there could be potential synergies between our organizations and would appreciate the opportunity to discuss this further.</p>
    
    <p>Would you be available for a brief call in the coming week to explore potential collaboration?</p>
    
    <p>Looking forward to your response.</p>
  `;
};

/**
 * Send emails to all investor contacts
 * @param {string} fromName - Sender's name
 * @param {string} fromEmail - Sender's email
 * @param {string} emailContent - Email content
 * @returns {Promise<{success: boolean, results: Array}>} Results of email sending
 */
const sendEmailsToInvestors = async (fromName, fromEmail, emailContent) => {
  const results = {
    success: true,
    sent: [],
    failed: []
  };

  for (const contact of investorContacts) {
    try {
      const result = await emailService.sendIntroEmail(
        contact.email,
        fromName,
        fromEmail,
        emailContent
      );

      if (result.success) {
        results.sent.push(contact.email);
      } else {
        results.failed.push({ email: contact.email, error: result.error });
        results.success = false;
      }
    } catch (error) {
      results.failed.push({ email: contact.email, error: error.message });
      results.success = false;
    }
  }

  return results;
};

module.exports = {
  getInvestorContacts,
  draftEmailWithAI,
  sendEmailsToInvestors
};