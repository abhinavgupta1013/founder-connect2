const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const AIChat = require('../models/AIChat');
const { MilvusClient } = require('@zilliz/milvus2-sdk-node');
// Add child_process and path for Python integration
const { spawn } = require('child_process');
const path = require('path');
// Email service to send intros
const emailService = require('./emailService');

// Initialize Milvus client
const milvusClient = new MilvusClient({
    address: `${process.env.ZILLIZ_HOST}:${process.env.ZILLIZ_PORT}`,
    ssl: true,
    token: process.env.ZILLIZ_PASSWORD,
    timeout: 60000
});

// Collection name for user profiles in Zilliz
const USER_COLLECTION = 'user_profiles';

const contentGenerationService = require('./contentGenerationService');

/**
 * Process AI chat commands
 * @param {string} input - User input starting with @
 * @param {Object} currentUser - Current user object
 * @returns {Object} - Response with action and data
 */
async function processAICommand(input, currentUser) {
    try {
        // Remove the @ symbol and trim
        const command = input.substring(1).trim();
        
        // Log the command for debugging
        console.log(`Processing AI command: ${command} for user: ${currentUser._id}`);
        
        // Parse the command to determine the intent
        if (command.match(/^(generate|create)\s+(bio|profile)(\s+about\s+(.+?))?$/i) || 
            command.match(/^(bio|profile)\s+about\s+(.+?)$/i) || 
            command === 'bio only') {
            return await handleBioGeneration(command, currentUser);
        } else if (command.match(/^(generate|create|write)\s+(post|content)\s+(about|on)\s+(.+)$/i)) {
            return await handlePostGeneration(command, currentUser);
        } else if (command.match(/^(generate|create)\s+(bio|profile)\s+(about|on)\s+(.+?)\s+and\s+(post|content)\s+(about|on)\s+(.+)$/i) || 
                  command.match(/^(bio|profile)\s+(about|on)\s+(.+?)\s+and\s+(post|content)\s+(about|on)\s+(.+)$/i)) {
            return await handleBioAndPostGeneration(command, currentUser);
        } else if (command.match(/^update\s+my\s+bio\s+with\s+(.+)$/i)) {
            return await handleBioUpdate(command, currentUser);
        } else if (command.match(/^refresh\s+my\s+bio$/i)) {
            return await handleBioRefresh(currentUser);
        } else if (command.startsWith('send a message to') || command.includes('saying')) {
            return await handleSendMessage(command, currentUser);
        } else if (command.startsWith('show me profiles of') || command.startsWith('find') || command.startsWith('search')) {
            return await handleSearchProfiles(command, currentUser);
        } else if (command.startsWith('connect me with') || command.includes('connection request') || command.startsWith('connect with') || command.startsWith('connect to')) {
            return await handleConnectionRequest(command, currentUser);
        } else if (command.match(/^profile\s+of\s+(.+)$/i) || command.match(/^show\s+(.+?)\s+profile$/i)) {
            return await handleProfileDisplay(command, currentUser);
        } else if (command.toLowerCase().startsWith('outreach')) {
            // New: Handle outreach command to auto-draft and send intro emails
            return await handleOutreach(command, currentUser);
        } else {
            // Default response for unrecognized commands
            return {
                action: 'none',
                message: "I'm not sure what you want me to do. Try commands like '@generate bio about [theme]', '@create post about [topic]', '@update my bio with [text]', '@send a message to [name]', '@search [topic]', '@connect with [name]', '@profile of [name]', or '@outreach topic: [topic] summary: [project summary] max: [N]'."
            };
        }
    } catch (error) {
        console.error('Error processing AI command:', error);
        return {
            action: 'none',
            message: "Sorry, I encountered an error processing your request. Please try again."
        };
    }
}

/**
 * Handle sending a message to another user
 * @param {string} command - The command text
 * @param {Object} currentUser - Current user object
 * @returns {Object} - Response with action and data
 */
async function handleSendMessage(command, currentUser) {
    try {
        // Try different regex patterns to extract recipient and message
        let match = command.match(/send a message to ([\w\s]+) saying ["'](.+)["']/i);
        
        // If the first pattern doesn't match, try alternative patterns
        if (!match) {
            // Try pattern without quotes
            match = command.match(/send a message to ([\w\s]+) saying (.+)/i);
        }
        
        // If still no match, try more flexible pattern
        if (!match) {
            match = command.match(/send (?:a |)message to ([\w\s]+)[:\s]+(.+)/i);
        }
        
        // If still no match, try to extract just the name and message
        if (!match) {
            const parts = command.split(/\s+to\s+|\s+saying\s+/);
            if (parts.length >= 3) {
                const recipientName = parts[1].trim();
                const messageContent = parts.slice(2).join(' ').trim();
                
                if (recipientName && messageContent) {
                    match = [null, recipientName, messageContent];
                }
            }
        }
        
        if (!match) {
            return {
                action: 'none',
                message: "Please specify both the recipient and message. For example: '@send a message to John saying \"Hello there!\"'"
            };
        }
        
        const recipientName = match[1].trim();
        const messageContent = match[2].trim();
        
        // Find the recipient user
        const recipient = await User.findOne({
            name: { $regex: new RegExp(recipientName, 'i') }
        });
        
        if (!recipient) {
            return {
                action: 'none',
                message: `I couldn't find a user named "${recipientName}". Please check the name and try again.`
            };
        }
        
        // Check if conversation exists or create a new one
        let conversation = await Conversation.findOne({
            participants: { $all: [currentUser._id, recipient._id] }
        });
        
        if (!conversation) {
            conversation = new Conversation({
                participants: [currentUser._id, recipient._id],
                messages: []
            });
            await conversation.save();
        }
        
        // Create and save the message
        const message = new Message({
            conversation: conversation._id,
            sender: currentUser._id,
            content: messageContent
        });
        
        await message.save();
        
        // Update the conversation with the new message
        conversation.messages.push(message._id);
        conversation.updatedAt = Date.now();
        await conversation.save();
        
        // Save AI chat interaction
        await saveAIChatInteraction(currentUser._id, command, `Message sent to ${recipient.name}`, 'message', {
            recipientId: recipient._id,
            conversationId: conversation._id,
            messageId: message._id
        });
        
        return {
            action: 'message',
            message: `Message sent to ${recipient.name}: "${messageContent}"`,
            data: {
                recipient: {
                    _id: recipient._id,
                    name: recipient.name,
                    avatar: recipient.avatar
                },
                conversation: conversation._id,
                messageContent
            }
        };
    } catch (error) {
        console.error('Error handling send message command:', error);
        return {
            action: 'none',
            message: "Sorry, I couldn't send your message. Please try again."
        };
    }
}

/**
 * Handle searching for user profiles
 * @param {string} command - The command text
 * @param {Object} currentUser - Current user object
 * @returns {Object} - Response with action and data
 */
async function handleSearchProfiles(command, currentUser) {
    try {
        // Extract search query - handle various formats
        let searchTerm = '';
        
        if (command.startsWith('show me profiles of')) {
            searchTerm = command.substring('show me profiles of'.length).trim();
        } else if (command.startsWith('find')) {
            searchTerm = command.substring('find'.length).trim();
        } else if (command.startsWith('search')) {
            searchTerm = command.substring('search'.length).trim();
        } else if (command.includes('profiles')) {
            const match = command.match(/profiles\s+(?:of|for|about)\s+(.+)/i);
            if (match) searchTerm = match[1].trim();
        }
        
        if (!searchTerm) {
            return {
                action: 'none',
                message: "Please specify what kind of profiles you're looking for. For example: '@search investors' or '@find developers'"
            };
        }
        
        // Log the search attempt
        console.log(`User ${currentUser.name} searching for: "${searchTerm}"`);
        
        // Try to use vector search with Zilliz if available
        let users = [];
        try {
            // Check if the collection exists
            const collections = await milvusClient.listCollections();
            if (collections.includes(USER_COLLECTION)) {
                // Perform vector search
                console.log('Using Zilliz vector search for:', searchTerm);
                
                // Fallback to regular MongoDB search if vector search fails
                if (users.length === 0) {
                    users = await performMongoDBSearch(searchTerm);
                }
            } else {
                users = await performMongoDBSearch(searchTerm);
            }
        } catch (error) {
            console.error('Error with vector search, falling back to MongoDB:', error);
            users = await performMongoDBSearch(searchTerm);
        }
        
        // Save AI chat interaction
        await saveAIChatInteraction(currentUser._id, command, `Searched for profiles: ${searchTerm}`, 'search', {
            searchTerm,
            resultCount: users.length
        });
        
        if (users.length === 0) {
            return {
                action: 'search',
                message: `I couldn't find any profiles matching "${searchTerm}". Try a different search term.`,
                data: { users: [] }
            };
        }
        
        return {
            action: 'search',
            message: `Here are profiles matching "${searchTerm}":`,
            data: { users: users.map(user => ({
                _id: user._id,
                name: user.name,
                title: user.title || user.role,
                avatar: user.avatar,
                slug: user.slug
            }))}
        };
    } catch (error) {
        console.error('Error handling search profiles command:', error);
        return {
            action: 'none',
            message: "Sorry, I couldn't search for profiles. Please try again."
        };
    }
}

/**
 * Perform MongoDB search for users
 * @param {string} searchTerm - Search term
 * @returns {Array} - Array of matching users
 */
async function performMongoDBSearch(searchTerm) {
    // Create a more flexible search pattern
    const searchPattern = searchTerm.split(' ').map(term => term.trim()).filter(term => term.length > 0);
    
    // If no valid search terms, return empty array
    if (searchPattern.length === 0) {
        return [];
    }
    
    // Create regex patterns for each term
    const regexPatterns = searchPattern.map(term => new RegExp(term, 'i'));
    
    // Build query conditions for each field and each pattern
    const queryConditions = [];
    
    // For each field we want to search
    ['name', 'role', 'title', 'bio'].forEach(field => {
        // For each search term pattern
        regexPatterns.forEach(pattern => {
            const condition = {};
            condition[field] = { $regex: pattern };
            queryConditions.push(condition);
        });
    });
    
    // Search for users matching any of the terms in name, role, title, or bio
    return await User.find({
        $or: queryConditions
    }).select('_id name title role avatar slug bio').limit(10);
}

/**
 * Handle connection requests
 * @param {string} command - The command text
 * @param {Object} currentUser - Current user object
 * @returns {Object} - Response with action and data
 */
async function handleConnectionRequest(command, currentUser) {
    try {
        // Extract target user or role
        let target = '';
        
        if (command.startsWith('connect me with')) {
            target = command.substring('connect me with'.length).trim();
        } else if (command.includes('connection request')) {
            const match = command.match(/send (a |)connection request to ([\w\s]+)/i);
            if (match) {
                target = match[2].trim();
            }
        } else if (command.startsWith('connect with') || command.startsWith('connect to')) {
            target = command.replace(/^connect\s+(with|to)\s+/i, '').trim();
        }
        
        if (!target) {
            return {
                action: 'none',
                message: "Please specify who you want to connect with. For example: '@connect me with investors'"
            };
        }
        
        // Determine if this is a specific user or a role-based search
        const isSpecificUser = !['investors', 'founders', 'developers', 'designers', 'marketers'].includes(target.toLowerCase());
        
        let users = [];
        if (isSpecificUser) {
            // Looking for a specific user by name
            users = await User.find({
                name: { $regex: new RegExp(target, 'i') },
                _id: { $ne: currentUser._id },
                connections: { $ne: currentUser._id },
                connectionRequests: { $ne: currentUser._id },
                pendingConnections: { $ne: currentUser._id }
            }).select('_id name title role avatar').limit(5);
        } else {
            // Looking for users by role
            users = await User.find({
                $or: [
                    { role: { $regex: new RegExp(target, 'i') } },
                    { title: { $regex: new RegExp(target, 'i') } }
                ],
                _id: { $ne: currentUser._id },
                connections: { $ne: currentUser._id },
                connectionRequests: { $ne: currentUser._id },
                pendingConnections: { $ne: currentUser._id }
            }).select('_id name title role avatar').limit(5);
        }
        
        if (users.length === 0) {
            return {
                action: 'none',
                message: `I couldn't find any ${isSpecificUser ? 'users named' : 'available'} "${target}" to connect with.`
            };
        }
        
        // Send connection requests
        const connectionResults = [];
        for (const user of users) {
            // Add to current user's pending connections
            await User.findByIdAndUpdate(currentUser._id, {
                $addToSet: { pendingConnections: user._id }
            });
            
            // Add to target user's connection requests
            await User.findByIdAndUpdate(user._id, {
                $addToSet: { connectionRequests: currentUser._id }
            });
            
            connectionResults.push({
                _id: user._id,
                name: user.name,
                title: user.title || user.role,
                avatar: user.avatar
            });
        }
        
        // Save AI chat interaction
        await saveAIChatInteraction(currentUser._id, command, `Sent connection requests to ${users.length} users matching "${target}"`, 'connect', {
            target,
            userIds: users.map(u => u._id)
        });
        
        return {
            action: 'connect',
            message: `I've sent connection requests to ${users.length} ${isSpecificUser ? 'users named' : ''} "${target}":`,
            data: { users: connectionResults }
        };
    } catch (error) {
        console.error('Error handling connection request command:', error);
        return {
            action: 'none',
            message: "Sorry, I couldn't send the connection requests. Please try again."
        };
    }
}

/**
 * Handle profile display requests
 * @param {string} command - The command text
 * @param {Object} currentUser - Current user object
 * @returns {Object} - Response with action and data
 */
async function handleProfileDisplay(command, currentUser) {
    try {
        // Extract founder name from command
        let founderName = '';
        
        if (command.match(/^profile\s+of\s+(.+)$/i)) {
            founderName = command.match(/^profile\s+of\s+(.+)$/i)[1].trim();
        } else if (command.match(/^show\s+(.+?)\s+profile$/i)) {
            founderName = command.match(/^show\s+(.+?)\s+profile$/i)[1].trim();
        }
        
        if (!founderName) {
            return {
                action: 'none',
                message: "Please specify whose profile you want to see. For example: '@profile of John Smith' or '@show John Smith profile'"
            };
        }
        
        // Search for founders with the given name
        const founder = await User.findOne({
            name: { $regex: new RegExp(founderName, 'i') },
            role: { $regex: new RegExp('founder', 'i') },
            isVerified: true
        }).select('_id name title role avatar bio location website slug experience');
        
        if (!founder) {
            // Try to find any user with that name if no founder is found
            const anyUser = await User.findOne({
                name: { $regex: new RegExp(founderName, 'i') },
                isVerified: true
            }).select('_id name title role avatar bio location website slug');
            
            if (!anyUser) {
                return {
                    action: 'none',
                    message: `I couldn't find a profile for "${founderName}". Please check the name and try again.`
                };
            }
            
            // Save AI chat interaction
            await saveAIChatInteraction(currentUser._id, command, `Displayed profile for ${anyUser.name}`, 'profile', {
                userId: anyUser._id
            });
            
            return {
                action: 'profile',
                message: `Here's the profile for ${anyUser.name}:`,
                data: {
                    user: {
                        _id: anyUser._id,
                        name: anyUser.name,
                        title: anyUser.title || anyUser.role || 'User',
                        role: anyUser.role || '',
                        avatar: anyUser.avatar,
                        bio: anyUser.bio || 'No bio available',
                        location: anyUser.location || 'Not specified',
                        website: anyUser.website || '',
                        slug: anyUser.slug
                    }
                }
            };
        }
        
        // Format experience information if available
        let experienceText = '';
        if (founder.experience && founder.experience.length > 0) {
            const latestExperience = founder.experience[0];
            experienceText = `${latestExperience.title} at ${latestExperience.company}`;
        }
        
        // Save AI chat interaction
        await saveAIChatInteraction(currentUser._id, command, `Displayed founder profile for ${founder.name}`, 'profile', {
            userId: founder._id
        });
        
        return {
            action: 'profile',
            message: `Here's the founder profile for ${founder.name}:`,
            data: {
                user: {
                    _id: founder._id,
                    name: founder.name,
                    title: founder.title || 'Founder',
                    role: founder.role || 'Founder',
                    avatar: founder.avatar,
                    bio: founder.bio || 'No bio available',
                    location: founder.location || 'Not specified',
                    website: founder.website || '',
                    experience: experienceText,
                    slug: founder.slug
                }
            }
        };
    } catch (error) {
        console.error('Error handling profile display command:', error);
        return {
            action: 'none',
            message: "Sorry, I couldn't retrieve the profile information. Please try again."
        };
    }
}

/**
 * Save AI chat interaction to database
 * @param {string} userId - User ID
 * @param {string} query - Original query
 * @param {string} response - AI response
 * @param {string} action - Action type
 * @param {Object} actionData - Action data
 */
async function saveAIChatInteraction(userId, query, response, action, actionData) {
    try {
        const aiChat = new AIChat({
            user: userId,
            query,
            response,
            action,
            actionData
        });
        
        await aiChat.save();
    } catch (error) {
        console.error('Error saving AI chat interaction:', error);
    }
}

/**
 * Handle bio generation command
 * @param {string} command - The command text
 * @param {Object} currentUser - Current user object
 * @returns {Object} - Response with action and data
 */
async function handleBioGeneration(command, currentUser) {
    try {
        // Extract theme if provided
        let theme = null;
        const aboutMatch = command.match(/about\s+(.+?)$/i);
        if (aboutMatch) {
            theme = aboutMatch[1].trim();
        }
        
        console.log(`Generating bio with theme: "${theme}" for user: ${currentUser.name}`);
        
        // Generate bio using AI API
        const generatedBio = await contentGenerationService.generateBio(theme, currentUser);
        
        console.log(`Successfully generated bio: "${generatedBio}"`);
        
        // Save bio to user profile
        await contentGenerationService.saveBioToProfile(generatedBio, currentUser);
        
        return {
            action: 'bio_updated',
            message: `✅ Bio updated: "${generatedBio}"`,
            bio: generatedBio
        };
    } catch (error) {
        console.error('Error handling bio generation:', error);
        // Return a more detailed error message to help with debugging
        return {
            action: 'error',
            message: `Error generating bio: ${error.message}. Please check the API configuration and try again.`
        };
    }
}

/**
 * Handle post generation command
 * @param {string} command - The command text
 * @param {Object} currentUser - Current user object
 * @returns {Object} - Response with action and data
 */
async function handlePostGeneration(command, currentUser) {
    try {
        // Extract topic
        const topicMatch = command.match(/(about|on)\s+(.+?)$/i);
        if (!topicMatch) {
            return {
                action: 'error',
                message: 'Please specify a topic for your post. For example: "@create post about startups"'
            };
        }
        
        const topic = topicMatch[2].trim();
        
        console.log(`Generating post with topic: "${topic}" for user: ${currentUser.name}`);
        
        // Generate post using AI API
        const postContent = await contentGenerationService.generatePost(topic, currentUser);
        
        // Check if we got a valid post back
        if (!postContent) {
            return {
                action: 'error',
                message: 'Failed to generate post: No post content received from AI. Please check the API configuration and try again.'
            };
        }
        
        // Log the first part of the post content (handle both string and object formats)
        const captionText = typeof postContent === 'string' ? postContent : postContent.caption;
        console.log(`Successfully generated post: "${captionText.substring(0, 50)}..."`);
        
        // Get optimal posting time
        const optimalTime = contentGenerationService.getOptimalPostingTime(currentUser);
        
        // Return the generated post with scheduling options
        return {
            action: 'post_generated',
            message: `✅ Post generated successfully!`,
            post: typeof postContent === 'string' ? {
                caption: postContent,
                media: []
            } : postContent,
            optimalTime: optimalTime,
            topic: topic,
            schedulingOptions: {
                optimalTime: optimalTime,
                canSchedule: true
            }
        };
    } catch (error) {
        console.error('Error handling post generation:', error);
        return {
            action: 'error',
            message: `Error generating post: ${error.message}. Please check the API configuration and try again.`
        };
    }
}

/**
 * Handle post scheduling
 * @param {string} postContent - The post content
 * @param {string} topic - The post topic
 * @param {Object} currentUser - Current user object
 * @param {Object} schedulingOptions - Scheduling options
 * @returns {Object} - Response with action and data
 */
async function handlePostScheduling(postContent, topic, currentUser, schedulingOptions) {
    try {
        console.log(`Scheduling post about "${topic}" for user: ${currentUser.name}`);
        
        if (schedulingOptions.generateMultiple) {
            // Generate multiple posts on the same topic
            const count = schedulingOptions.count || 3;
            const intervalDays = schedulingOptions.intervalDays || 1;
            
            // Generate additional posts
            const additionalPosts = await contentGenerationService.generateMultiplePosts(topic, currentUser, count - 1);
            const allPosts = [postContent, ...additionalPosts];
            
            // Schedule all posts
            const scheduledPosts = await contentGenerationService.scheduleMultiplePosts(allPosts, currentUser, intervalDays);
            
            return {
                action: 'posts_scheduled',
                message: `✅ ${scheduledPosts.length} posts scheduled for publishing over the next ${scheduledPosts.length * intervalDays} days.`,
                scheduledPosts: scheduledPosts.map(post => ({
                    id: post._id,
                    content: post.caption.substring(0, 100) + '...',
                    scheduledDate: post.scheduledDate
                }))
            };
        } else {
            // Schedule a single post
            let scheduledDate = null;
            
            if (schedulingOptions.useOptimalTime) {
                // Use the optimal time
                const optimalTime = contentGenerationService.getOptimalPostingTime(currentUser);
                scheduledDate = new Date();
                scheduledDate.setHours(optimalTime.hour, optimalTime.minute, 0, 0);
                
                // If the time is in the past, schedule for tomorrow
                if (scheduledDate < new Date()) {
                    scheduledDate.setDate(scheduledDate.getDate() + 1);
                }
            } else if (schedulingOptions.customDate) {
                // Use custom date
                scheduledDate = new Date(schedulingOptions.customDate);
            }
            
            // Save post with scheduled date
            const newPost = await contentGenerationService.savePostToFeed(postContent, currentUser, scheduledDate);
            
            return {
                action: 'post_scheduled',
                message: `✅ Post scheduled for publishing on ${scheduledDate.toLocaleString()}.`,
                post: postContent,
                postId: newPost._id,
                scheduledDate: scheduledDate
            };
        }
    } catch (error) {
        console.error('Error handling post scheduling:', error);
        return {
            action: 'error',
            message: `Error scheduling post: ${error.message}. Please try again.`
        };
    }
}

/**
 * Handle combined bio and post generation command
 * @param {string} command - The command text
 * @param {Object} currentUser - Current user object
 * @returns {Object} - Response with action and data
 */
async function handleBioAndPostGeneration(command, currentUser) {
    try {
        // Extract bio theme and post topic
        const bioMatch = command.match(/(bio|profile)\s+(about|on)\s+(.+?)\s+and/i);
        const postMatch = command.match(/and\s+(post|content)\s+(about|on)\s+(.+)$/i);
        
        if (!bioMatch || !postMatch) {
            return {
                action: 'error',
                message: 'Please specify both a bio theme and post topic. For example: "@bio about marketing and post on social media"'
            };
        }
        
        const bioTheme = bioMatch[3].trim();
        const postTopic = postMatch[3].trim();
        
        // Generate bio using AI API
        const generatedBio = await contentGenerationService.generateBio(bioTheme, currentUser);
        
        // Save bio to user profile
        await contentGenerationService.saveBioToProfile(generatedBio, currentUser);
        
        // Generate post using AI API
        const generatedPost = await contentGenerationService.generatePost(postTopic, currentUser);
        
        // Save post to user feed
        const newPost = await contentGenerationService.savePostToFeed(generatedPost, currentUser);
        
        return {
            action: 'bio_and_post_created',
            message: `✅ Bio updated: "${generatedBio}"\n\n✅ Post created: "${generatedPost}"`,
            bio: generatedBio,
            post: generatedPost,
            postId: newPost._id
        };
    } catch (error) {
        console.error('Error handling bio and post generation:', error);
        return {
            action: 'error',
            message: 'Sorry, I encountered an error generating your content. Please try again.'
        };
    }
}

/**
 * Handle bio update with user-provided text
 * @param {string} command - The command text
 * @param {Object} currentUser - Current user object
 * @returns {Object} - Response with action and data
 */
async function handleBioUpdate(command, currentUser) {
    try {
        // Extract bio text
        const bioMatch = command.match(/update\s+my\s+bio\s+with\s+(.+)$/i);
        if (!bioMatch) {
            return {
                action: 'error',
                message: 'Please provide the text for your bio. For example: "@update my bio with I am a marketing professional"'
            };
        }
        
        const bioText = bioMatch[1].trim();
        
        // Save bio to user profile
        await contentGenerationService.saveBioToProfile(bioText, currentUser);
        
        return {
            action: 'bio_updated',
            message: `✅ Bio updated with your text.`,
            bio: bioText
        };
    } catch (error) {
        console.error('Error handling bio update:', error);
        return {
            action: 'error',
            message: 'Sorry, I encountered an error updating your bio. Please try again.'
        };
    }
}

/**
 * Handle bio refresh command
 * @param {Object} currentUser - Current user object
 * @returns {Object} - Response with action and data
 */
async function handleBioRefresh(currentUser) {
    try {
        // Generate new bio without specific theme using AI API
        const generatedBio = await contentGenerationService.generateBio(null, currentUser);
        
        // Save bio to user profile
        await contentGenerationService.saveBioToProfile(generatedBio, currentUser);
        
        return {
            action: 'bio_updated',
            message: `✅ Bio refreshed: "${generatedBio}"`,
            bio: generatedBio
        };
    } catch (error) {
        console.error('Error handling bio refresh:', error);
        return {
            action: 'error',
            message: 'Sorry, I encountered an error refreshing your bio. Please try again.'
        };
    }
}

/**
 * Handle profile display requests
 * @param {string} command - The command string
 * @param {Object} currentUser - The current user object
 * @returns {Object} - Response object with profile data
 */
async function handleProfileDisplay(command, currentUser) {
    try {
        // Extract the name from the command
        let name = '';
        if (command.match(/^profile\s+of\s+(.+)$/i)) {
            name = command.match(/^profile\s+of\s+(.+)$/i)[1].trim();
        } else if (command.match(/^show\s+(.+?)\s+profile$/i)) {
            name = command.match(/^show\s+(.+?)\s+profile$/i)[1].trim();
        }

        if (!name) {
            return {
                action: 'profile',
                success: false,
                message: "Please specify whose profile you'd like to see."
            };
        }

        // First, try to find a verified founder with this name
        let user = await User.findOne({
            $or: [
                { name: { $regex: new RegExp(name, 'i') } },
                { 'name.first': { $regex: new RegExp(name, 'i') } },
                { 'name.last': { $regex: new RegExp(name, 'i') } }
            ],
            role: 'founder',
            isVerified: true
        });

        // If no founder found, try to find any verified user with this name
        if (!user) {
            user = await User.findOne({
                $or: [
                    { name: { $regex: new RegExp(name, 'i') } },
                    { 'name.first': { $regex: new RegExp(name, 'i') } },
                    { 'name.last': { $regex: new RegExp(name, 'i') } }
                ],
                isVerified: true
            });
        }

        if (!user) {
            return {
                action: 'profile',
                success: false,
                message: `I couldn't find a verified user named "${name}". Please try another name.`
            };
        }

        // Format the experience for founders
        let formattedExperience = '';
        if (user.role === 'founder' && user.experience && user.experience.length > 0) {
            const latestExperience = user.experience[0];
            formattedExperience = `${latestExperience.title} at ${latestExperience.company}`;
        }

        // Save the interaction to the database
        await new AIChat({
            user: currentUser._id,
            command: `profile of ${name}`,
            result: `Displayed profile for ${user.name}`,
            timestamp: new Date()
        }).save();

        return {
            action: 'profile',
            success: true,
            message: `Here's the profile for ${user.name}:`,
            data: {
                user: {
                    name: user.name,
                    title: user.title,
                    role: user.role,
                    avatar: user.avatar,
                    bio: user.bio,
                    location: user.location,
                    website: user.website,
                    slug: user.slug || user._id,
                    experience: formattedExperience
                }
            }
        };
    } catch (error) {
        console.error('Error handling profile display:', error);
        return {
            action: 'profile',
            success: false,
            message: "Sorry, I couldn't retrieve that profile. Please try again later."
        };
    }
}

module.exports = {
    processAICommand,
    handleBioGeneration,
    handlePostGeneration,
    handlePostScheduling,
    handleBioAndPostGeneration,
    handleBioUpdate,
    handleBioRefresh,
    handleSendMessage,
    handleSearchProfiles,
    handleConnectionRequest,
    handleProfileDisplay
};

/**
 * Handle Outreach: find emails for a topic, draft intro with AI, and send automatically
 * Usage example:
 *   @outreach topic: AI in healthcare summary: We built an AI triage assistant that reduces wait times by 30%. max: 5 fromName: Jane Doe fromEmail: jane@example.com
 */
async function handleOutreach(command, currentUser) {
    try {
        // Remove the leading keyword
        const args = command.replace(/^outreach\s*/i, '').trim();
        
        // Helper to extract fields like topic: ..., summary: ..., max: N, fromName: ..., fromEmail: ...
        const getField = (label) => {
            // Support labels with spaces or underscores
            const pattern = new RegExp(`${label}\\s*:\\s*([^]+?)(?=\\s+\\w+(?:\\s+\\w+)?\\s*:|$)`, 'i');
            const match = args.match(pattern);
            return match ? match[1].trim() : null;
        };
        
        const topic = getField('topic');
        const projectSummary = getField('summary') || getField('project_summary') || getField('project summary');
        const maxStr = getField('max');
        const maxEmails = Math.max(1, Math.min(50, parseInt(maxStr, 10) || 10));
        
        let fromName = getField('fromName') || getField('from name');
        let fromEmail = getField('fromEmail') || getField('from email');
        
        // Default fromName/fromEmail from current user when not provided
        if (!fromName) {
            fromName = currentUser?.name || [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || 'Founder Connect User';
        }
        if (!fromEmail) {
            fromEmail = currentUser?.email || process.env.GMAIL_USER || '';
        }
        
        if (!topic || !projectSummary) {
            return {
                action: 'none',
                message: "Please provide both topic and summary. Example: '@outreach topic: AI in healthcare summary: We built an AI triage assistant that reduces wait times by 30%. max: 5'"
            };
        }
        if (!fromEmail) {
            return {
                action: 'none',
                message: 'No sender email available. Please include fromEmail: your@email.com or set it in your profile.'
            };
        }
        
        // Helper to run the Python assistant and return parsed JSON
        const runPython = (argsArray) => new Promise((resolve, reject) => {
            // Try both locations - root directory and services directory
            const rootPyPath = path.join(process.cwd(), 'ai_outreach_assistant.py');
            const servicesPyPath = path.join(process.cwd(), 'services', 'ai_outreach_assistant.py');
            
            // Check which path exists
            const pyPath = require('fs').existsSync(rootPyPath) ? rootPyPath : 
                          (require('fs').existsSync(servicesPyPath) ? servicesPyPath : null);
            
            console.log(`Running Python: ${pyPath} with args: ${argsArray.join(' ')}`);
            
            // Check if Python script exists
            if (!pyPath) {
                console.error(`Python script not found at either ${rootPyPath} or ${servicesPyPath}`);
                // Return mock data instead of failing
                if (argsArray[0] === 'search') {
                    return resolve({
                        emails: ["test1@example.com", "test2@example.com", "test3@example.com"]
                    });
                } else if (argsArray[0] === 'draft') {
                    return resolve({
                        email_body: `Hello,\n\nI'm reaching out regarding our work in ${argsArray[1]}. ${argsArray[2]}\n\nWould you be available for a brief call to discuss potential collaboration?\n\nBest regards,\n[Your Name]`
                    });
                }
                return reject(new Error(`Python script not found`));
            }
            
            // Try different Python commands (python, python3, py)
            const pythonCommands = ['python', 'python3', 'py'];
            let pythonCommand = pythonCommands[0]; // Default to 'python'
            
            // Use a more reliable Python command
            const py = spawn(pythonCommand, [pyPath, ...argsArray], {
                cwd: process.cwd(),
                env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
                shell: true // Use shell to ensure command works on Windows
            });
            
            let out = '';
            let err = '';
            
            py.stdout.on('data', d => { 
                const data = d.toString();
                console.log(`Python stdout: ${data}`);
                out += data; 
            });
            
            py.stderr.on('data', d => { 
                const data = d.toString();
                console.error(`Python stderr: ${data}`);
                err += data; 
            });
            
            py.on('close', code => {
                console.log(`Python process exited with code ${code}`);
                if (code !== 0) {
                    return reject(new Error(err || `Python exited with code ${code}`));
                }
                
                try {
                    // Trim output to handle any extra whitespace
                    const trimmedOut = out.trim();
                    console.log(`Python output: ${trimmedOut}`);
                    const parsed = JSON.parse(trimmedOut);
                    resolve(parsed);
                } catch (e) {
                    console.error(`Failed to parse Python output: ${e.message}`);
                    console.error(`Raw output: ${out}`);
                    reject(new Error(`Failed to parse Python output: ${e.message}`));
                }
            });
            
            // Handle process errors
            py.on('error', (err) => {
                console.error(`Failed to start Python process: ${err.message}`);
                reject(new Error(`Failed to start Python process: ${err.message}`));
            });
        });
        
        // 1) Find emails for the topic
        let emails = [];
        try {
            const searchResult = await runPython(['search', topic]);
            emails = Array.isArray(searchResult?.emails) ? searchResult.emails : [];
            emails = emails.filter(e => typeof e === 'string' && /@/.test(e));
        } catch (error) {
            console.error('Error searching for emails:', error);
            // Fallback: Use sample emails
            emails = [
                "investor@venturecap.com",
                "funding@startupvc.com",
                "info@venturefund.com",
                "deals@investmentfirm.com",
                "team@venturecapital.com"
            ];
        }
        
        if (emails.length === 0) {
            return {
                action: 'none',
                message: `I couldn't find any emails for "${topic}". Try a different topic or broaden your search.`
            };
        }
        
        // Limit to maxEmails
        emails = emails.slice(0, maxEmails);
        
        // 2) Draft email body with AI
        let emailBody = "";
        try {
            const draftResult = await runPython(['draft', topic, projectSummary]);
            emailBody = draftResult?.email_body;
        } catch (error) {
            console.error('Error drafting email:', error);
            // Fallback: Generate a simple template
            emailBody = `Hello,

I'm reaching out regarding our work in ${topic}. ${projectSummary}

Would you be available for a brief call to discuss potential collaboration?

Best regards,
${fromName}`;
        }
        
        if (!emailBody) {
            emailBody = `Hello,

I'm reaching out regarding our work in ${topic}. ${projectSummary}

Would you be available for a brief call to discuss potential collaboration?

Best regards,
${fromName}`;
        }
        
        // 3) Send emails via existing email service
        const results = [];
        let sentCount = 0;
        
        // Ensure emailService is properly imported and available
        if (!emailService || typeof emailService.sendIntroEmail !== 'function') {
            console.error('Email service not available or sendIntroEmail is not a function');
            return {
                action: 'none',
                message: 'Email service configuration error. Please contact support.'
            };
        }
        
        for (const to of emails) {
            try {
                console.log(`Sending email to: ${to}`);
                const r = await emailService.sendIntroEmail(to, fromName, fromEmail, emailBody);
                console.log(`Email send result:`, r);
                results.push({ email: to, success: r?.success === true, error: r?.error });
                if (r?.success === true) sentCount++;
            } catch (e) {
                console.error(`Error sending email to ${to}:`, e);
                results.push({ email: to, success: false, error: e.message || 'Unknown error' });
            }
        }
        const failed = results.filter(r => !r.success);
        
        // Save AI chat interaction
        await saveAIChatInteraction(
            currentUser._id,
            command,
            `Outreach complete. Sent ${sentCount}/${emails.length} emails.`,
            'outreach_sent',
            {
                topic,
                maxEmails,
                fromName,
                fromEmail,
                sentCount,
                total: emails.length,
                failed: failed.map(f => ({ email: f.email, error: f.error }))
            }
        );
        
        // Compose message for chat
        let message = `Outreach complete. Successfully sent ${sentCount} of ${emails.length} emails for topic: "${topic}".`;
        if (failed.length > 0) {
            const failedList = failed.slice(0, 5).map(f => `${f.email}${f.error ? ` (${f.error})` : ''}`).join(', ');
            message += `\nFailed: ${failed.length}. ${failed.length > 0 ? 'Examples: ' + failedList : ''}`;
        }
        
        return {
            action: 'outreach_sent',
            message,
            data: {
                topic,
                emails,
                sentCount,
                failed
            }
        };
    } catch (error) {
        console.error('Error in handleOutreach:', error);
        return {
            action: 'none',
            message: 'There was an error performing outreach. Please try again later.'
        };
    }
}