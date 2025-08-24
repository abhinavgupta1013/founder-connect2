const axios = require('axios');
const User = require('../models/User');
const Post = require('../models/Post');
require('dotenv').config();

/**
 * Content Generation Service
 * Handles generation of bios and posts using AI
 */

// OpenAI API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'mistralai/mistral-7b-instruct:free'; // Using free tier model

/**
 * Generate a professional bio
 * @param {string} theme - Theme or focus area for the bio
 * @param {Object} user - User object with profile information
 * @returns {Promise<string>} - Generated bio content
 */
async function generateBio(theme, user) {
  try {
    console.log('Starting bio generation with theme:', theme);
    console.log('Using API key:', OPENROUTER_API_KEY ? 'Key is set' : 'Key is missing');
    console.log('Using model:', OPENROUTER_MODEL);
    
    const userInfo = `Name: ${user.name || 'Unknown'}, Role: ${user.role || 'Professional'}, Title: ${user.title || 'Professional'}, Skills: ${user.skills?.join(', ') || 'Various skills'}`;
    let prompt = `Write a professional, engaging bio for a user with the following information: ${userInfo}.`;
    if (theme) {
      prompt += ` The bio should highlight their expertise and interests in ${theme}.`;
    }
    prompt += ` Keep it under 150 characters, make it sound natural and professional, and include their role/title.`;

    console.log('Sending request to OpenRouter API with prompt:', prompt);
    
    const requestData = {
      model: OPENROUTER_MODEL,
      messages: [
        { 
          role: 'system', 
          content: 'You are a professional profile writer who creates concise, engaging bios. Your bios are impactful, highlight key strengths, and maintain a professional tone while being authentic.' 
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.7
    };
    
    console.log('Request payload:', JSON.stringify(requestData));
    
    const response = await axios.post(
      OPENROUTER_API_URL,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://founderconnect.ai',
          'X-Title': 'Founder Connect AI Chat'
        }
      }
    );

    console.log('Received response from API:', response.status);
    
    if (!response.data) {
      console.error('No data received from API');
      throw new Error('No response data received from API');
    }
    
    console.log('API response data:', JSON.stringify(response.data));
    
    // Check if we have a response with content
    if (response.data?.choices?.[0]?.message?.content) {
      const generatedBio = response.data.choices[0].message.content.trim();
      console.log('Successfully generated bio:', generatedBio);
      return generatedBio;
    } 
    // If we have a response but no content property
    else if (response.data?.choices?.[0]?.message) {
      console.log('Message object exists but content might be in a different format:', response.data.choices[0].message);
      // Try to extract content from message object
      const messageObj = response.data.choices[0].message;
      
      if (typeof messageObj === 'object') {
        // If message is an object, try to access known properties
        if (messageObj.text) {
          // Extract the actual bio from the text field
          const text = messageObj.text.trim();
          console.log('Found text field:', text);
          
          // Try to extract the actual bio from the reasoning text
          // Look for text in quotes which is likely the bio
          const bioMatch = text.match(/"([^"]+)"/);
          if (bioMatch && bioMatch[1]) {
            console.log('Extracted bio from quotes:', bioMatch[1]);
            return bioMatch[1].trim();
          }
          
          // If no quoted text found, look for a sentence that looks like a bio
          // Typically after "Let's craft:" or similar phrases
          const craftMatch = text.match(/Let's craft:?\s*"([^"]+)"/i);
          if (craftMatch && craftMatch[1]) {
            console.log('Extracted bio from craft phrase:', craftMatch[1]);
            return craftMatch[1].trim();
          }
          
          // If we can't find a specific bio, return a reasonable portion of the text
          // Limit to first 150 characters to make it bio-sized
          return text.split('\n')[0].substring(0, 150).trim();
        } else if (messageObj.content) {
          return messageObj.content.trim();
        } else {
          // Try to extract bio from reasoning field if it exists
          if (messageObj.reasoning) {
            const reasoning = messageObj.reasoning.trim();
            console.log('Found reasoning field:', reasoning);
            
            // Try to extract the actual bio from the reasoning text
            // Look for text in quotes which is likely the bio
            const bioMatch = reasoning.match(/"([^"]+)"/);
            if (bioMatch && bioMatch[1]) {
              console.log('Extracted bio from quotes in reasoning:', bioMatch[1]);
              return bioMatch[1].trim();
            }
            
            // If no quoted text found, return a reasonable portion of the reasoning
            return reasoning.split('\n')[0].substring(0, 150).trim();
          }
          
          // Last resort - extract a usable bio from the JSON structure
          const jsonStr = JSON.stringify(messageObj);
          // Try to find any quoted content that might be the bio
          const jsonBioMatch = jsonStr.match(/"([^"]{20,150})"/);
          if (jsonBioMatch && jsonBioMatch[1]) {
            return jsonBioMatch[1].trim();
          }
          
          // If all else fails, create a simple bio
          return "Professional with diverse skills and a passion for innovation.";
        }
      } else if (typeof messageObj === 'string') {
        // If message is directly a string
        return messageObj.trim();
      }
    }
    
    console.error('No usable content in API response:', response.data);
    throw new Error('No bio content received from AI');
  } catch (error) {
    console.error('Error generating bio:', error);
    // Log detailed error information
    if (error.response) {
      console.error('API Error Response:', error.response.data);
      console.error('API Error Status:', error.response.status);
      console.error('API Error Headers:', error.response.headers);
      
      // Handle 402 Payment Required error specifically
      if (error.response.status === 402) {
        console.error('API subscription limit reached. Switching to free tier model.');
        // Switch to free tier model and retry
        OPENROUTER_MODEL = 'mistralai/mistral-7b-instruct:free';
        throw new Error('API limit reached. Retrying with free tier model...');
      }
      
      // Handle other API errors
      if (error.response.data?.error?.message) {
        throw new Error(`AI Service Error: ${error.response.data.error.message}`);
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw new Error('Unable to connect to AI service. Please check your internet connection.');
    } else {
      console.error('Error setting up request:', error.message);
      throw new Error(`Bio generation failed: ${error.message}`);
    }
    // Throw the error instead of returning a fallback
    throw new Error(`Failed to generate bio: ${error.message}`);
  }
}

/**
 * Generate a post using OpenAI
 * @param {string} topic - Topic for the post
 * @param {Object} user - User object with profile information
 * @returns {string} - Generated post content
 */
async function generatePost(topic, user) {
  try {
    console.log('Starting post generation with topic:', topic);
    console.log('Using API key:', OPENROUTER_API_KEY ? 'Key is set' : 'Key is missing');
    console.log('Using model:', OPENROUTER_MODEL);
    
    const userInfo = `Name: ${user.name || 'Unknown'}, Title: ${user.title || 'Professional'}, Skills: ${user.skills?.join(', ') || 'Various skills'}`;
    let prompt = `Write an engaging, professional social media post about ${topic} for a user with the following information: ${userInfo}.`;
    prompt += ` The post should be 2-3 paragraphs long, include relevant insights, and end with appropriate hashtags. Make it sound natural and professional.`;
    
    console.log('Sending request to OpenRouter API with prompt:', prompt);
    
    const requestData = {
      model: OPENROUTER_MODEL,
      messages: [
        { 
          role: 'system', 
          content: 'You are a social media expert who creates engaging, professional posts. Your posts are insightful, well-structured, and maintain a professional tone while being conversational.' 
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 750,
      temperature: 0.7
    };
    
    console.log('Request payload:', JSON.stringify(requestData));
    
    const response = await axios.post(
      OPENROUTER_API_URL,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://founderconnect.ai',
          'X-Title': 'Founder Connect AI Chat'
        }
      }
    );

    console.log('Received response from API:', response.status);
    
    if (!response.data) {
      console.error('No data received from API');
      throw new Error('No response data received from API');
    }
    
    console.log('API response data:', JSON.stringify(response.data));
    
    let postContent = null;
    if (response.data?.choices?.[0]?.message?.content) {
      postContent = response.data.choices[0].message.content.trim();
    } else if (response.data?.choices?.[0]?.message) {
      const messageObj = response.data.choices[0].message;
      if (typeof messageObj === 'object') {
        if (messageObj.text) {
          postContent = messageObj.text.trim();
        } else if (messageObj.content) {
          postContent = messageObj.content.trim();
        } else {
          postContent = JSON.stringify(messageObj).substring(0, 750);
        }
      } else if (typeof messageObj === 'string') {
        postContent = messageObj.trim();
      }
    }
    
    if (!postContent) {
      console.error('No usable content in API response:', response.data);
      throw new Error('No post content received from AI');
    }
    // Return as object for frontend compatibility
    return { caption: postContent, media: [] };
  } catch (error) {
    console.error('Error generating post:', error);
    if (error.response) {
      console.error('API Error Response:', error.response.data);
      console.error('API Error Status:', error.response.status);
      console.error('API Error Headers:', error.response.headers);
      
      // Handle 402 Payment Required error specifically
      if (error.response.status === 402) {
        throw new Error('API subscription limit reached. Please update your API key or subscription plan.');
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    throw new Error(`Failed to generate post: ${error.message}`);
  }
}

/**
 * Save generated bio to user profile
 * @param {string} bio - Generated bio content
 * @param {Object} user - User object
 * @returns {Object} - Updated user object
 */
async function saveBioToProfile(bio, user) {
  try {
    if (!bio || typeof bio !== 'string' || bio.trim().length === 0) {
      throw new Error('Invalid bio content');
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { bio: bio.trim() },
      { new: true }
    );
    
    if (!updatedUser) {
      throw new Error('Failed to update user profile');
    }

    return updatedUser;
  } catch (error) {
    console.error('Error saving bio to profile:', error);
    throw error;
  }
}

/**
 * Save generated post to user's feed
 * @param {string} postContent - Generated post content
 * @param {Object} user - User object
 * @param {Date|null} scheduledDate - Optional scheduled date for the post
 * @returns {Object} - Created post object
 */
async function savePostToFeed(postContent, user, scheduledDate = null) {
  try {
    // Handle different post content formats (string or object)
    let content = '';
    if (typeof postContent === 'string') {
      content = postContent;
    } else if (typeof postContent === 'object') {
      content = postContent.caption || postContent.content || JSON.stringify(postContent);
    } else {
      throw new Error('Invalid post content format');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Empty post content');
    }

    const newPost = new Post({
      user: user._id,
      caption: content.trim(),
      media: [],
      createdAt: scheduledDate ? scheduledDate : new Date(),
      isScheduled: !!scheduledDate,
      scheduledDate: scheduledDate
    });
    
    await newPost.save();
    return newPost;
  } catch (error) {
    console.error('Error saving post to feed:', error);
    throw error;
  }
}

/**
 * Generate multiple posts for scheduling
 * @param {string} topic - Topic for the posts
 * @param {Object} user - User object
 * @param {number} count - Number of posts to generate (default: 3)
 * @returns {Array} - Array of generated post contents
 */
async function generateMultiplePosts(topic, user, count = 3) {
  try {
    console.log(`Generating ${count} posts about ${topic} for user ${user.name}`);
    
    const posts = [];
    for (let i = 0; i < count; i++) {
      const post = await generatePost(topic, user);
      posts.push(post);
    }
    
    return posts;
  } catch (error) {
    console.error('Error generating multiple posts:', error);
    throw error;
  }
}

/**
 * Schedule multiple posts for future publishing
 * @param {Array} postContents - Array of post contents
 * @param {Object} user - User object
 * @param {number} intervalDays - Days between each post (default: 1)
 * @returns {Array} - Array of scheduled post objects
 */
async function scheduleMultiplePosts(postContents, user, intervalDays = 1) {
  try {
    if (!Array.isArray(postContents) || postContents.length === 0) {
      throw new Error('Invalid post contents array');
    }
    
    const scheduledPosts = [];
    const now = new Date();
    
    for (let i = 0; i < postContents.length; i++) {
      // Calculate scheduled date (current date + i * intervalDays)
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() + (i * intervalDays));
      
      // Set the time to a high-engagement time (e.g., 9:00 AM)
      scheduledDate.setHours(9, 0, 0, 0);
      
      const post = await savePostToFeed(postContents[i], user, scheduledDate);
      scheduledPosts.push(post);
    }
    
    return scheduledPosts;
  } catch (error) {
    console.error('Error scheduling multiple posts:', error);
    throw error;
  }
}

/**
 * Get optimal posting time based on user's profile and engagement data
 * @param {Object} user - User object
 * @returns {Object} - Optimal posting time information
 */
function getOptimalPostingTime(user) {
  // This would ideally use analytics data to determine the best time
  // For now, we'll return some default values
  return {
    dayOfWeek: 'Tuesday', // Most engaging day
    hour: 9, // 9 AM
    minute: 0,
    description: 'Tuesday at 9:00 AM - Typically high engagement for professional content'
  };
}

module.exports = {
  generateBio,
  generatePost,
  generateMultiplePosts,
  saveBioToProfile,
  savePostToFeed,
  scheduleMultiplePosts,
  getOptimalPostingTime
};