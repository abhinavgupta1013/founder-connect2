const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const { isAuthenticated } = require('../../middleware/authMiddleware');
const emailService = require('../../services/emailService');
const path = require('path');

/**
 * @route   POST /api/web-search
 * @desc    Get business recommendations based on web search
 * @access  Private
 */
router.post('/', isAuthenticated, function(req, res) {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'A valid search query is required' 
      });
    }

    // Spawn Python process to handle the web search and recommendation
    const pythonProcess = spawn('python', [
      'services/web_search_recommendations.py',
      query
    ], {
      // Add cwd to ensure Python script can find its dependencies
      cwd: process.cwd(),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let dataString = '';
    let errorString = '';

    // Collect data from stdout
    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    // Collect any errors
    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
      console.error('Python script error:', errorString);
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        console.error(`Error: ${errorString}`);
        return res.status(503).json({ 
          success: false, 
          message: 'The search service is temporarily unavailable. Please try again later.'
        });
      }

      try {
        // Get the last JSON object in the output
        const jsonLines = dataString.split('\n')
          .filter(line => line.trim())
          .filter(line => {
            try {
              JSON.parse(line);
              return true;
            } catch (e) {
              return false;
            }
          });
        
        const lastJsonLine = jsonLines[jsonLines.length - 1];
        
        if (!lastJsonLine) {
          console.error('No valid JSON found in Python output');
          console.error('Raw output:', dataString);
          return res.status(503).json({
            success: false,
            message: 'The search service is temporarily unavailable. Please try again later.'
          });
        }
        
        // Parse the JSON response
        const parsedData = JSON.parse(lastJsonLine);
        
        if (parsedData.error) {
          console.error('Error from Python script:', parsedData.error);
          return res.status(503).json({
            success: false,
            message: 'The search service is temporarily unavailable. Please try again later.'
          });
        }

        if (parsedData.result) {
          return res.json({
            success: true,
            data: parsedData.result
          });
        }

        return res.status(503).json({
          success: false,
          message: 'The search service is temporarily unavailable. Please try again later.'
        });
      } catch (e) {
        console.error('Error parsing Python response:', e);
        console.error('Raw Python output:', dataString);
        return res.status(503).json({ 
          success: false, 
          message: 'The search service is temporarily unavailable. Please try again later.'
        });
      }
    });
  } catch (error) {
    console.error('Web search error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/market-research
 * @desc    Get market research results (emails, companies, profiles) from Python script
 * @access  Private
 */
router.post('/market-research', isAuthenticated, function(req, res) {
  try {
    const { query, extractEmails } = req.body;
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({ success: false, message: 'A valid search query is required' });
    }
    // Spawn Python process to run market research
    const args = ['services/market_research.py'];
    if (extractEmails) {
      args.push('extract-emails', query);
    } else {
      args.push(query);
    }
    const pythonProcess = spawn('python', args, {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });
    let dataString = '';
    let errorString = '';
    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });
    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
      console.error('Python script error:', errorString);
    });
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        console.error(`Error: ${errorString}`);
        return res.status(503).json({ success: false, message: 'The market research service is temporarily unavailable. Please try again later.' });
      }
      try {
        // Find last valid JSON in output
        const jsonLines = dataString.split('\n').filter(line => {
          try { JSON.parse(line); return true; } catch (e) { return false; }
        });
        const lastJsonLine = jsonLines[jsonLines.length - 1];
        if (!lastJsonLine) {
          console.error('No valid JSON found in Python output');
          return res.status(503).json({ success: false, message: 'No valid data returned.' });
        }
        const parsedData = JSON.parse(lastJsonLine);
        return res.json({ success: true, data: parsedData });
      } catch (e) {
        console.error('Error parsing Python response:', e);
        return res.status(503).json({ success: false, message: 'Error parsing Python output.' });
      }
    });
  } catch (error) {
    console.error('Market research error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/web-search/send-intro-email
 * @desc    Send introduction emails to business contacts
 * @access  Private
 */
router.post('/send-intro-email', isAuthenticated, async (req, res) => {
  try {
    const { toEmails, fromName, fromEmail, businessContext } = req.body;
    
    // Validate required fields
    if (!toEmails || !Array.isArray(toEmails) || toEmails.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'At least one recipient email is required' 
      });
    }
    
    if (!fromName || !fromEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Sender name and email are required' 
      });
    }
    
    // Send emails to all recipients
    const results = [];
    for (const toEmail of toEmails) {
      const result = await emailService.sendIntroEmail(
        toEmail, 
        fromName, 
        fromEmail, 
        businessContext || ''
      );
      results.push({ email: toEmail, ...result });
    }
    
    // Check if any emails failed to send
    const failedEmails = results.filter(r => !r.success);
    if (failedEmails.length > 0) {
      return res.status(207).json({
        success: true,
        message: `Sent ${results.length - failedEmails.length} of ${results.length} emails successfully`,
        failedEmails: failedEmails.map(r => ({ email: r.email, error: r.error }))
      });
    }
    
    return res.json({
      success: true,
      message: `Successfully sent introduction emails to ${results.length} contacts`
    });
  } catch (error) {
    console.error('Error sending intro emails:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send introduction emails' 
    });
  }
});

/**
 * @route   GET /api/web-search/ai-outreach
 * @desc    Render the AI Outreach Assistant page
 * @access  Private
 */
router.get('/ai-outreach', isAuthenticated, (req, res) => {
  try {
    res.render('ai-outreach', {
      user: req.user,
      title: 'AI Outreach Assistant'
    });
  } catch (error) {
    console.error('Error rendering AI Outreach Assistant page:', error);
    res.status(500).render('error', { 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error : {} 
    });
  }
});

/**
 * @route   POST /api/web-search/ai-outreach/search
 * @desc    Search for emails using the AI Outreach Assistant
 * @access  Private
 */
router.post('/ai-outreach/search', isAuthenticated, (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'A valid search query is required' 
      });
    }

    // Spawn Python process to handle the email search
    const pythonProcess = spawn('python', [
      path.join(process.cwd(), 'ai_outreach_assistant.py'),
      'search',
      query
    ], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let dataString = '';
    let errorString = '';

    // Collect data from stdout
    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    // Collect any errors
    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
      console.error('Python script error:', errorString);
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        console.error('Error output:', errorString);
        return res.status(500).json({ 
          success: false, 
          message: 'Error executing email search' 
        });
      }

      try {
        const parsedData = JSON.parse(dataString);
        return res.json({
          success: true,
          emails: parsedData.emails || []
        });
      } catch (e) {
        console.error('Error parsing Python response:', e);
        return res.status(500).json({ 
          success: false, 
          message: 'Error parsing search results' 
        });
      }
    });
  } catch (error) {
    console.error('AI Outreach search error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/web-search/ai-outreach/send-intro
 * @desc    Draft and send introduction emails using AI
 * @access  Private
 */
router.post('/ai-outreach/send-intro', isAuthenticated, async (req, res) => {
  try {
    const { emails, query, project_summary, fromName, fromEmail } = req.body;
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least one recipient email is required' 
      });
    }
    
    if (!query || !project_summary || !fromName || !fromEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Spawn Python process to draft the email
    const pythonProcess = spawn('python', [
      path.join(process.cwd(), 'ai_outreach_assistant.py'),
      'draft',
      query,
      project_summary
    ], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let dataString = '';
    let errorString = '';

    // Collect data from stdout
    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    // Collect any errors
    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
      console.error('Python script error:', errorString);
    });

    // Handle process completion
    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        console.error('Error output:', errorString);
        return res.status(500).json({ 
          success: false, 
          message: 'Error drafting email content' 
        });
      }

      try {
        const parsedData = JSON.parse(dataString);
        const emailBody = parsedData.email_body;
        
        if (!emailBody) {
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to generate email content' 
          });
        }
        
        // Send emails to all recipients using our existing email service
        const results = [];
        let sentCount = 0;
        for (const toEmail of emails) {
          const result = await emailService.sendIntroEmail(
            toEmail, 
            fromName, 
            fromEmail, 
            emailBody
          );
          results.push({ email: toEmail, ...result });
          if (result.success) sentCount++;
        }
        
        // Check if any emails failed to send
        const failedEmails = results.filter(r => !r.success);
        if (failedEmails.length > 0) {
          return res.status(207).json({
            success: true,
            message: `Sent ${results.length - failedEmails.length} of ${results.length} emails successfully`,
            failedEmails: failedEmails.map(r => ({ email: r.email, error: r.error }))
          });
        }
        
        return res.json({
          success: true,
          message: `Successfully sent introduction emails to ${results.length} contacts`
        });
      } catch (e) {
        console.error('Error processing email draft:', e);
        return res.status(500).json({ 
          success: false, 
          message: 'Error processing email draft' 
        });
      }
    });
  } catch (error) {
    console.error('AI Outreach send intro error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = router;