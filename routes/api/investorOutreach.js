/**
 * Investor Outreach API Routes
 */

const express = require('express');
const router = express.Router();
const investorOutreachService = require('../../services/investorOutreachService');
const { isAuthenticated } = require('../../middleware/authMiddleware');

/**
 * @route GET /api/investor-outreach/contacts
 * @desc Get all investor contacts
 * @access Private
 */
router.get('/contacts', isAuthenticated, (req, res) => {
  try {
    const contacts = investorOutreachService.getInvestorContacts();
    res.json({ success: true, contacts });
  } catch (error) {
    console.error('Error fetching investor contacts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch investor contacts' });
  }
});

/**
 * @route POST /api/investor-outreach/draft
 * @desc Draft an email using AI
 * @access Private
 */
router.post('/draft', isAuthenticated, async (req, res) => {
  try {
    const { topic, guidelines } = req.body;
    
    if (!topic || !guidelines) {
      return res.status(400).json({ 
        success: false, 
        message: 'Topic and guidelines are required' 
      });
    }
    
    const emailContent = await investorOutreachService.draftEmailWithAI(topic, guidelines);
    res.json({ success: true, emailContent });
  } catch (error) {
    console.error('Error drafting email:', error);
    res.status(500).json({ success: false, message: 'Failed to draft email' });
  }
});

/**
 * @route POST /api/investor-outreach/send
 * @desc Send emails to all investor contacts
 * @access Private
 */
router.post('/send', isAuthenticated, async (req, res) => {
  try {
    const { fromName, fromEmail, emailContent } = req.body;
    
    if (!fromName || !fromEmail || !emailContent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Sender name, email, and content are required' 
      });
    }
    
    const results = await investorOutreachService.sendEmailsToInvestors(
      fromName, 
      fromEmail, 
      emailContent
    );
    
    res.json({ 
      success: true, 
      results 
    });
  } catch (error) {
    console.error('Error sending emails:', error);
    res.status(500).json({ success: false, message: 'Failed to send emails' });
  }
});

/**
 * @route POST /api/investor-outreach/auto-send
 * @desc Automatically draft and send emails to all investor contacts
 * @access Private
 */
router.post('/auto-send', isAuthenticated, async (req, res) => {
  try {
    const { topic, guidelines, fromName, fromEmail } = req.body;
    
    if (!topic || !guidelines || !fromName || !fromEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Topic, guidelines, sender name, and email are required' 
      });
    }
    
    // Draft the email
    const emailContent = await investorOutreachService.draftEmailWithAI(topic, guidelines);
    
    // Send to all contacts
    const results = await investorOutreachService.sendEmailsToInvestors(
      fromName, 
      fromEmail, 
      emailContent
    );
    
    res.json({ 
      success: true, 
      emailContent,
      results 
    });
  } catch (error) {
    console.error('Error in auto-send process:', error);
    res.status(500).json({ success: false, message: 'Failed to process auto-send request' });
  }
});

module.exports = router;