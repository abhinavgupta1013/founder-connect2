/**
 * New AI Chat Interface
 * Enhanced AI chat with improved UI, history management, and file attachments
 */

document.addEventListener('DOMContentLoaded', function() {
    // CSS styles are added later in the code
    // DOM Elements
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendMessageBtn = document.getElementById('send-message-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const clearAllChatsBtn = document.getElementById('clear-all-chats-btn');
    const exportChatBtn = document.getElementById('export-chat-btn');
    const chatHistoryList = document.getElementById('chat-history-list');
    const currentChatTitle = document.getElementById('current-chat-title');
    const commandSuggestions = document.getElementById('command-suggestions');
    const closeSuggestions = document.getElementById('close-suggestions');
    const imageUpload = document.getElementById('image-upload');
    const inputAttachments = document.getElementById('input-attachments');
    const voiceInputBtn = document.getElementById('voice-input-btn');
    const imageModal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const closeModal = document.querySelector('.close-modal');
    
    // Web Search Elements
    const webSearchModal = document.getElementById('web-search-modal');
    const webSearchInput = document.getElementById('web-search-input');
    const webSearchButton = document.getElementById('web-search-button');
    const closeWebSearch = document.getElementById('close-web-search');
    const webSearchLoading = document.querySelector('.web-search-loading');
    const webSearchResults = document.getElementById('web-search-results');
    const useResultsBtn = document.getElementById('use-results-btn');
    const draftMessageBtn = document.getElementById('draft-message-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // Web Search Functions
    function initializeWebSearch() {
        // Open web search modal
        draftMessageBtn.addEventListener('click', () => {
            webSearchModal.style.display = 'flex';
            webSearchInput.focus();
            
            // If there's text in the chat input, use it as initial search query
            const chatText = chatInput.value.trim();
            if (chatText) {
                webSearchInput.value = chatText;
            }
        });
        
        // Close web search modal
        closeWebSearch.addEventListener('click', () => {
            webSearchModal.style.display = 'none';
            webSearchResults.innerHTML = '';
            webSearchLoading.style.display = 'none';
        });
        
        // Handle search button click
        webSearchButton.addEventListener('click', performWebSearch);
        
        // Handle enter key in search input
        webSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performWebSearch();
            }
        });
        
        // Handle example queries
        const exampleQueries = document.querySelectorAll('.example-query');
        exampleQueries.forEach(query => {
            query.addEventListener('click', () => {
                webSearchInput.value = query.textContent;
                performWebSearch();
            });
        });
        
        // Handle use results button
        useResultsBtn.addEventListener('click', () => {
            const results = webSearchResults.innerHTML;
            if (results) {
                chatInput.value = results;
                webSearchModal.style.display = 'none';
                webSearchResults.innerHTML = '';
                webSearchLoading.style.display = 'none';
                chatInput.focus();
            }
        });
        
        // Close modal when clicking outside
        webSearchModal.addEventListener('click', (e) => {
            if (e.target === webSearchModal) {
                webSearchModal.style.display = 'none';
                webSearchResults.innerHTML = '';
                webSearchLoading.style.display = 'none';
            }
        });
    }
    
    function performWebSearch() {
        const query = webSearchInput.value.trim();
        
        if (!query) {
            alert('Please enter a search query');
            return;
        }
        
        // Show loading indicator
        webSearchLoading.style.display = 'flex';
        webSearchResults.innerHTML = '';
        
        // Detect investor email queries and use market research endpoint
        const shouldExtractEmails = /email/i.test(query) && /investor|fintech/i.test(query);
        const endpoint = shouldExtractEmails ? '/api/web-search/market-research' : '/api/web-search';
        const payload = shouldExtractEmails ? { query, extractEmails: true } : { query };
        
        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(async response => {
            const result = await response.json();
            webSearchLoading.style.display = 'none';
            
            if (!(result && result.success)) {
                webSearchResults.innerHTML = '<div class="error-message">No results found. Please try a different search query.</div>';
                useResultsBtn.style.display = 'none';
                return;
            }
            
            // If using market research with structured email results
            if (shouldExtractEmails && result.data) {
                const data = result.data;
                if (data.title && Array.isArray(data.emails)) {
                    // Store emails for potential intro email sending
                    window.foundEmails = data.emails.map(item => item.email).filter(email => email);
                    
                    // First, display the emails in the web search results panel
                    const html = `
                        <div class="ai-chat-message">
                            <h3 style="margin-top: 0; color: #4a6cf7;">${data.title}</h3>
                            <ul style="padding-left: 20px; margin-bottom: 0;">
                                ${data.emails.map(item => {
                                    const src = ((item && item.source) ? String(item.source) : '').replace(/`/g, '').trim();
                                    const em = (item && item.email) ? item.email : '';
                                    return `<li style=\"margin-bottom: 8px;\">\n                                        <strong>${em}</strong>\n                                        <span style=\"color: #666; font-size: 13px;\"> (Source: <a href=\"${src}\" target=\"_blank\" rel=\"noopener noreferrer\">${src}</a>)</span>\n                                    </li>`;
                                }).join('')}
                            </ul>
                            <div class="intro-email-prompt" style="margin-top: 15px; padding: 10px; background-color: #f5f9ff; border-radius: 5px; border-left: 4px solid #4a6cf7;">
                                <p style="margin: 0 0 10px 0; font-weight: bold;">Would you like to send an intro email to these contacts?</p>
                                <div style="display: flex; gap: 10px;">
                                    <button id="send-intro-email-btn" class="btn" style="background-color: #4a6cf7; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">Yes, send intro email</button>
                                    <button id="skip-intro-email-btn" class="btn" style="background-color: #f0f0f0; color: #333; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">No, thanks</button>
                                </div>
                            </div>
                        </div>`;
                    webSearchResults.innerHTML = html;
                    useResultsBtn.style.display = 'block';
                    
                    // Add event listeners for the intro email buttons
                    document.getElementById('send-intro-email-btn').addEventListener('click', function() {
                        const query = webSearchInput.value.trim() || 'Default Topic';
                        window.location.href = '/investor-outreach?topic=' + encodeURIComponent(query) + '&autoSend=true';
                    });
                    
                    document.getElementById('skip-intro-email-btn').addEventListener('click', function() {
                        addMessageToChat('ai', 'No problem! Let me know if you need anything else.');
                    });
                    
                    // Also add the email results to the chat
                    const emailListHtml = data.emails.map(item => {
                        const em = (item && item.email) ? item.email : '';
                        return `<strong>Email:</strong> ${em}<br>`;
                    }).join('');
                    
                    // Add the email results and prompt to the chat
                    const chatHtml = `
                    <div>
                        <strong>Email:</strong> ${data.emails.map(item => item.email).join('<br><strong>Email:</strong> ')}
                        <div class="intro-email-prompt" style="margin-top: 15px; padding: 10px; background-color: #f5f9ff; border-radius: 5px; border-left: 4px solid #4a6cf7;">
                            <p style="margin: 0 0 10px 0; font-weight: bold;">Would you like to send an intro email to these contacts?</p>
                            <div style="display: flex; gap: 10px;">
                                <button id="chat-send-intro-email-btn" class="btn" style="background-color: #4a6cf7; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">Yes, send intro email</button>
                                <button id="chat-skip-intro-email-btn" class="btn" style="background-color: #f0f0f0; color: #333; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">No, thanks</button>
                            </div>
                        </div>
                    </div>`;
                    
                    addMessageToChat('ai', chatHtml);
                    
                    // Add event listeners for the chat intro email buttons
                    document.getElementById('chat-send-intro-email-btn').addEventListener('click', function() {
                        const query = webSearchInput.value.trim() || 'Default Topic';
                        window.location.href = '/investor-outreach?topic=' + encodeURIComponent(query) + '&autoSend=true';
                    });
                    
                    document.getElementById('chat-skip-intro-email-btn').addEventListener('click', function() {
                        addMessageToChat('ai', 'No problem! Let me know if you need anything else.');
                    });
                    
                    return;
                }
                
                // Fallback array format
                if (Array.isArray(data)) {
                    const listHtml = data.map(item => {
                        const link = item.source_link || '#';
                        const srcTitle = item.source_title || 'Source';
                        const ctx = item.context ? `<br><em>${item.context}</em>` : '';
                        const email = item.email ? `<strong>Email:</strong> ${item.email}<br>` : '';
                        return `<div class=\"ai-chat-message\">${email}<strong>${srcTitle}:</strong> <a href=\"${link}\" target=\"_blank\" rel=\"noopener noreferrer\">${link}</a>${ctx}</div>`;
                    }).join('');
                    webSearchResults.innerHTML = listHtml;
                    useResultsBtn.style.display = 'block';
                    return;
                }
            }
            
            // Default behavior for general web search: render HTML string
            if (typeof result.data === 'string') {
                webSearchResults.innerHTML = result.data;
                useResultsBtn.style.display = 'block';
                return;
            }
            
            // Fallback: show JSON
            webSearchResults.innerHTML = `<pre>${JSON.stringify(result.data, null, 2)}</pre>`;
            useResultsBtn.style.display = 'block';
        })
        .catch(error => {
            webSearchLoading.style.display = 'none';
            webSearchResults.innerHTML = '<div class="error-message">Error: Could not connect to the server. Please try again later.</div>';
            useResultsBtn.style.display = 'none';
        });
    }
    
    // State
    let currentChatId = generateChatId();
    let chats = loadChats();
    let attachedImages = [];
    let isProcessing = false;
    
    // Initialize web search functionality
    initializeWebSearch();
    
    // Add CSS for intro message prompt
    const style = document.createElement('style');
    style.textContent = `
        .intro-message-prompt {
            background-color: #f5f8fa;
            border: 1px solid #e1e8ed;
            border-radius: 8px;
            padding: 12px 16px;
            margin: 10px 0;
            transition: opacity 0.3s ease;
        }
        
        .intro-message-prompt p {
            margin: 0 0 10px 0;
            font-weight: 500;
        }
        
        .intro-message-buttons {
            display: flex;
            gap: 10px;
        }
        
        .intro-yes-btn, .intro-no-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        
        .intro-yes-btn {
            background-color: #1da1f2;
            color: white;
        }
        
        .intro-yes-btn:hover {
            background-color: #0c85d0;
        }
        
        .intro-no-btn {
            background-color: #e1e8ed;
            color: #657786;
        }
        
        .intro-no-btn:hover {
            background-color: #ccd6dd;
        }
        
        .intro-yes-btn:disabled, .intro-no-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);

    // Initialize
    initializeChat();
    
    // Event Listeners
    chatInput.addEventListener('input', handleInputChange);
    chatInput.addEventListener('keydown', handleKeyDown);
    sendMessageBtn.addEventListener('click', sendMessage);
    newChatBtn.addEventListener('click', createNewChat);
    clearChatBtn.addEventListener('click', clearCurrentChat);
    clearAllChatsBtn.addEventListener('click', clearAllChats);
    exportChatBtn.addEventListener('click', exportChat);
    closeSuggestions.addEventListener('click', hideCommandSuggestions);
    imageUpload.addEventListener('change', handleImageUpload);
    voiceInputBtn.addEventListener('click', toggleVoiceInput);
    
    // Command suggestions click events
    document.querySelectorAll('.command-item').forEach(item => {
        item.addEventListener('click', function() {
            const command = this.getAttribute('data-command');
            chatInput.value = command + ' ';
            chatInput.focus();
            hideCommandSuggestions();
        });
    });
    
    // Image modal events
    closeModal.addEventListener('click', closeImageModal);
    
    // Auto-resize textarea as user types
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Reset height if empty
        if (this.value === '') {
            this.style.height = '';
        }
    });
    
    /**
     * Initialize the chat interface
     */
    function initializeChat() {
        // Load chat history
        renderChatHistory();
        
        // If there's a current chat, load it
        if (chats[currentChatId]) {
            loadChat(currentChatId);
        } else {
            // Create a new chat
            createNewChat();
        }
    }
    
    /**
     * Handle input changes and show command suggestions
     */
    function handleInputChange() {
        const input = chatInput.value;
        
        // Show command suggestions when @ is typed
        if (input.includes('@') && !commandSuggestions.style.display === 'block') {
            showCommandSuggestions();
        } else if (!input.includes('@') && commandSuggestions.style.display === 'block') {
            hideCommandSuggestions();
        }
    }
    
    /**
     * Handle keyboard events
     * @param {KeyboardEvent} e - Keyboard event
     */
    function handleKeyDown(e) {
        // Send message on Enter (without shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
        
        // Close command suggestions on Escape
        if (e.key === 'Escape' && commandSuggestions.style.display === 'block') {
            hideCommandSuggestions();
        }
    }
    
    /**
     * Send a message to the AI
     */
    async function sendMessage() {
        const message = chatInput.value.trim();
        
        // Don't send empty messages
        if (message === '' && attachedImages.length === 0) return;
        
        // Don't send if already processing
        if (isProcessing) return;
        
        // Add user message to chat
        addMessageToChat('user', message, attachedImages);
        
        // Clear input and attachments
        chatInput.value = '';
        chatInput.style.height = '';
        attachedImages = [];
        inputAttachments.innerHTML = '';
        
        // Process the message
        await processMessage(message);
        
        // Focus on input field for next message
        chatInput.focus();
    }
    
    /**
     * Process the user message and get AI response
     * @param {string} message - User message
     */
    async function processMessage(message) {
        try {
            isProcessing = true;
            showLoading();
            
            // Prepare request data
            const requestData = {
                message: message,
                images: attachedImages.map(img => img.path)
            };
            
            // Check if it's a command
            if (message.startsWith('@')) {
                await processCommand(message);
            } else {
                // Regular message processing
                const response = await fetch('/ai/chat/message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Add AI response to chat
                    addMessageToChat('ai', data.response);
                    
                    // Update chat title if it's a new chat
                    if (currentChatTitle.textContent === 'New Chat') {
                        updateChatTitle(message);
                    }
                } else {
                    // Handle error
                    addMessageToChat('ai', data.response || 'Sorry, I encountered an error processing your request.');
                }
            }
            
            // Save chat
            saveCurrentChat();
            
        } catch (error) {
            console.error('Error processing message:', error);
            addMessageToChat('ai', 'Sorry, I encountered an error processing your request. Please try again later.');
        } finally {
            isProcessing = false;
            hideLoading();
        }
    }
    
    /**
     * Process AI commands
     * @param {string} command - Command string starting with @
     */
    async function processCommand(command) {
        try {
            // Normalize shorthand commands to match backend patterns
            let normalized = command.trim();
            const lower = normalized.toLowerCase();
            if (lower.startsWith('@find ')) {
                normalized = `@show me profiles of ${normalized.slice(6).trim()}`;
            } else if (lower.startsWith('@search ')) {
                normalized = `@show me profiles of ${normalized.slice(8).trim()}`;
            } else if (lower.startsWith('@connect with ')) {
                normalized = `@connect me with ${normalized.slice(14).trim()}`;
            } else if (lower.startsWith('@profile ')) {
                normalized = `@profile of ${normalized.slice(9).trim()}`;
            } else if (lower.startsWith('@bio ')) {
                normalized = `@generate bio about ${normalized.slice(5).trim()}`;
            } else if (lower.startsWith('@post ')) {
                normalized = `@create post about ${normalized.slice(6).trim()}`;
            }
            
            // Show loading indicator for content generation commands
            if (lower.includes('bio') || lower.includes('post') || lower.includes('content')) {
                addMessageToChat('ai', '<div class="ai-generating-content">Generating content using AI...<div class="ai-loading-dots"><span></span><span></span><span></span></div></div>');
            }

            const response = await fetch('/ai/chat/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ command: normalized })
            });
            
            const data = await response.json();
            
            switch (data.action) {
                case 'search': {
                    if (data.data && Array.isArray(data.data.users) && data.data.users.length > 0) {
                        displayProfileSearchResults(data.data.users, normalized);
                    } else {
                        addMessageToChat('ai', data.message || 'No matching profiles found.');
                    }
                    break;
                }
                case 'connect': {
                    if (data.data && Array.isArray(data.data.users) && data.data.users.length > 0) {
                        let messageHtml = `<div class="connection-results"><p>${data.message || 'Connection requests sent.'}</p><div class="user-list">`;
                        data.data.users.forEach(user => {
                            messageHtml += `
                            <div class="user-item">
                                <div class="user-avatar">${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : (user.name ? user.name.charAt(0).toUpperCase() : '?')}</div>
                                <div class="user-info">
                                    <div class="user-name">${user.name || 'Unknown'}</div>
                                    <div class="user-title">${user.title || 'Member'}</div>
                                </div>
                            </div>`;
                        });
                        messageHtml += `</div></div>`;
                        addMessageToChat('ai', messageHtml);
                        
                        // Add intro message prompt after connection request
                        if (data.data.users.length === 1) {
                            const user = data.data.users[0];
                            setTimeout(() => {
                                const introPromptHtml = `
                                <div class="intro-message-prompt">
                                    <p>Would you like to send an intro message to ${user.name}?</p>
                                    <div class="intro-message-buttons">
                                        <button class="intro-yes-btn" data-profile-id="${user._id}" data-profile-name="${user.name}">Yes, send intro</button>
                                        <button class="intro-no-btn">No, thanks</button>
                                    </div>
                                </div>`;
                                addMessageToChat('ai', introPromptHtml);
                                
                                // Add event listeners to the newly created buttons
                                setupIntroMessageButtons();
                            }, 500);
                        }
                    } else {
                        addMessageToChat('ai', data.message || 'No users eligible for connection were found.');
                    }
                    break;
                }
                case 'profile': {
                    const user = data?.data?.user;
                    if (user) {
                        const profileHtml = `
                        <div class="profile-display" data-profile-id="${user._id}" data-profile-name="${user.name}">
                            <div class="profile-header">
                                <div class="profile-avatar">${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : (user.name ? user.name.charAt(0).toUpperCase() : '?')}</div>
                                <div class="profile-info">
                                    <h3>${user.name || 'Unknown User'}</h3>
                                    <div class="profile-title">${user.title || user.role || 'Member'}</div>
                                    ${user.location ? `<div class="profile-location">${user.location}</div>` : ''}
                                </div>
                            </div>
                            <div class="profile-content">
                                <div class="profile-bio">${user.bio || 'No bio available'}</div>
                                ${user.experience ? `<div class="profile-experience">${user.experience}</div>` : ''}
                                ${user.website ? `<div class="profile-website"><a href="${user.website}" target="_blank">${user.website}</a></div>` : ''}
                            </div>
                            <div class="profile-actions">
                                <a href="/profile/${user.slug || user._id}" class="view-full-profile-btn">View Full Profile</a>
                            </div>
                        </div>`;
                        addMessageToChat('ai', profileHtml);
                        
                        // Add intro message prompt after a short delay
                        setTimeout(() => {
                            const introPromptHtml = `
                            <div class="intro-message-prompt">
                                <p>Would you like to send an intro message to ${user.name}?</p>
                                <div class="intro-message-buttons">
                                    <button class="intro-yes-btn" data-profile-id="${user._id}" data-profile-name="${user.name}">Yes, send intro</button>
                                    <button class="intro-no-btn">No, thanks</button>
                                </div>
                            </div>`;
                            addMessageToChat('ai', introPromptHtml);
                            
                            // Add event listeners to the newly created buttons
                            setupIntroMessageButtons();
                        }, 1000);
                    } else {
                        addMessageToChat('ai', data.message || 'Profile not found.');
                    }
                    break;
                }
                case 'bio_updated': {
                    const bioMessage = data.bio ? 
                        `Your bio has been updated successfully! Here's your new bio:\n\n"${data.bio}"` :
                        data.message || 'Your bio has been updated successfully!';
                    addMessageToChat('ai', bioMessage);
                    break;
                }
                case 'post_created': {
                    addMessageToChat('ai', data.message || 'Your post has been created successfully!');
                    break;
                }
                case 'post_generated': {
                    // Display scheduling options for the generated post
                    displaySchedulingOptions(data);
                    break;
                }
                case 'post_scheduled': {
                    addMessageToChat('ai', data.message || 'Your post has been scheduled successfully!');
                    break;
                }
                case 'posts_scheduled': {
                    displayScheduledPosts(data);
                    break;
                }
                case 'bio_and_post_created': {
                    addMessageToChat('ai', data.message || 'Your bio and post have been created successfully!');
                    break;
                }
                case 'message': {
                    addMessageToChat('ai', data.message || 'Message sent.');
                    break;
                }
                case 'error': {
                    addMessageToChat('ai', data.message || 'Sorry, I encountered an error processing your command. Please try again later.');
                    break;
                }
                default: {
                    addMessageToChat('ai', data.message || 'Command processed successfully.');
                }
            }
        } catch (error) {
            console.error('Error processing command:', error);
            addMessageToChat('ai', 'Sorry, I encountered an error processing your command. Please try again later.');
        }
    }

    /**
     * Display scheduling options for a generated post
     * @param {Object} data - Post data from the server
     */
    function displaySchedulingOptions(data) {
        const post = data.post || {};
        const optimalTime = data.optimalTime || '';
        
        const container = document.createElement('div');
        container.className = 'post-scheduling-options';
        
        // Format optimal time for display
    let formattedOptimalTime = 'Best Time';
    if (optimalTime && typeof optimalTime === 'object') {
        if (optimalTime.hour !== undefined && optimalTime.minute !== undefined && optimalTime.dayOfWeek !== undefined) {
            formattedOptimalTime = `${optimalTime.hour}:${String(optimalTime.minute).padStart(2, '0')} ${optimalTime.dayOfWeek}`;
        }
    }
    
    container.innerHTML = `
            <div class="generated-post">
                <h3>Generated Post</h3>
                <div class="post-content">${post.caption || 'No content available'}</div>
                ${post.media && post.media.length > 0 ? `<div class="post-media"><img src="${post.media[0].url}" alt="Post media"></div>` : ''}
            </div>
            <div class="scheduling-options">
                <h3>Would you like to schedule this post?</h3>
                <div class="options-buttons">
                    <button class="post-now-btn">Post Now</button>
                    <button class="schedule-optimal-btn">Schedule at Optimal Time (${formattedOptimalTime})</button>
                    <button class="schedule-custom-btn">Schedule at Custom Time</button>
                    <button class="generate-multiple-btn">Generate Multiple Posts</button>
                </div>
                <div class="custom-schedule-form" style="display: none;">
                    <input type="datetime-local" id="custom-schedule-time" class="custom-time-input">
                    <button class="confirm-custom-time-btn">Confirm</button>
                </div>
                <div class="multiple-posts-form" style="display: none;">
                    <div class="form-group">
                        <label for="posts-count">Number of posts (3-7):</label>
                        <input type="number" id="posts-count" min="3" max="7" value="3">
                    </div>
                    <div class="form-group">
                        <label for="posts-interval">Days between posts:</label>
                        <input type="number" id="posts-interval" min="1" max="7" value="2">
                    </div>
                    <button class="confirm-multiple-posts-btn">Generate & Schedule</button>
                </div>
            </div>
        `;
        
        // Add to chat
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message';
        messageDiv.appendChild(container);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Add event listeners
        container.querySelector('.post-now-btn').addEventListener('click', function() {
            submitPostNow(post);
        });
        
        container.querySelector('.schedule-optimal-btn').addEventListener('click', function() {
            schedulePost(post, { scheduleType: 'optimal' });
        });
        
        container.querySelector('.schedule-custom-btn').addEventListener('click', function() {
            container.querySelector('.custom-schedule-form').style.display = 'flex';
        });
        
        container.querySelector('.confirm-custom-time-btn').addEventListener('click', function() {
            const customTime = container.querySelector('#custom-schedule-time').value;
            if (!customTime) {
                alert('Please select a valid date and time');
                return;
            }
            schedulePost(post, { scheduleType: 'custom', scheduledDate: customTime });
        });
        
        container.querySelector('.generate-multiple-btn').addEventListener('click', function() {
            container.querySelector('.multiple-posts-form').style.display = 'block';
        });
        
        container.querySelector('.confirm-multiple-posts-btn').addEventListener('click', function() {
            const count = container.querySelector('#posts-count').value;
            const interval = container.querySelector('#posts-interval').value;
            schedulePost(post, { 
                scheduleType: 'multiple', 
                count: parseInt(count), 
                interval: parseInt(interval) 
            });
        });
    }
    
    /**
     * Submit post for immediate publication
     * @param {Object} post - Post data
     */
    async function submitPostNow(post) {
        try {
            showLoading();
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(post)
            });
            
            const data = await response.json();
            
            if (data.success) {
                addMessageToChat('ai', 'Your post has been published successfully!');
            } else {
                addMessageToChat('ai', data.message || 'There was an error publishing your post.');
            }
        } catch (error) {
            console.error('Error publishing post:', error);
            addMessageToChat('ai', 'Sorry, there was an error publishing your post. Please try again later.');
        } finally {
            hideLoading();
        }
    }
    
    /**
     * Schedule post for later publication
     * @param {Object} post - Post data
     * @param {Object} options - Scheduling options
     */
    async function schedulePost(post, options) {
        try {
            showLoading();
            
            // Convert options format to match what the backend expects
            const schedulingData = {
                postContent: post,
                topic: options.topic || '',
                schedulingOptions: {}
            };
            
            // Map the options based on scheduleType
            if (options.scheduleType === 'optimal') {
                schedulingData.schedulingOptions.useOptimalTime = true;
            } else if (options.scheduleType === 'custom') {
                schedulingData.schedulingOptions.customDate = options.scheduledDate;
            } else if (options.scheduleType === 'multiple') {
                schedulingData.schedulingOptions.generateMultiple = true;
                schedulingData.schedulingOptions.count = options.count || 3;
                schedulingData.schedulingOptions.intervalDays = options.interval || 2;
            }
            
            const response = await fetch('/api/posts/schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(schedulingData)
            });
            
            const data = await response.json();
            
            if (data.success || data.action === 'post_scheduled' || data.action === 'posts_scheduled') {
                if (options.scheduleType === 'multiple' && data.scheduledPosts) {
                    displayScheduledPosts(data.scheduledPosts);
                } else {
                    addMessageToChat('ai', data.message || 'Your post has been scheduled successfully!');
                }
            } else {
                addMessageToChat('ai', data.message || 'There was an error scheduling your post.');
            }
        } catch (error) {
            console.error('Error scheduling post:', error);
            addMessageToChat('ai', 'Error scheduling post: ' + (error.message || 'Cannot read properties of undefined'));
        } finally {
            hideLoading();
        }
    }
    
    /**
     * Display a list of scheduled posts
     * @param {Object} data - Data containing scheduled posts
     */
    function displayScheduledPosts(data) {
        const posts = data.posts || [];
        
        const container = document.createElement('div');
        container.className = 'scheduled-posts-list';
        
        container.innerHTML = `
            <h3>Posts Scheduled Successfully</h3>
            <p>${data.message || 'Your posts have been scheduled at optimal times.'}</p>
            <div class="posts-list">
                ${posts.map((post, index) => `
                    <div class="scheduled-post-item">
                        <div class="post-number">#${index + 1}</div>
                        <div class="post-content">${post.caption || 'No content'}</div>
                        <div class="post-schedule-time">Scheduled for: ${new Date(post.scheduledDate).toLocaleString()}</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add to chat
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message';
        messageDiv.appendChild(container);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    /**
     * Display found profiles with connect buttons
     * @param {Array} users - Array of user profiles
     * @param {string} searchTerm - The search term used
     */
    function displayProfileSearchResults(users, searchTerm) {
        const container = document.createElement('div');
        container.className = 'profile-search-results';
        const heading = document.createElement('h3');
        heading.textContent = `Here are profiles matching "${searchTerm.replace('@find', '').trim()}"`;
        container.appendChild(heading);
        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'profile-card';
            card.innerHTML = `
                <div class="profile-header">
                    <div class="profile-avatar"><img src="${user.avatar || '/images/default-avatar.png'}" alt="${user.name}" /></div>
                    <div class="profile-info">
                        <div class="profile-name">${user.name}</div>
                        <div class="profile-title">${user.title || user.role || ''}</div>
                        ${user.location ? `<div class="profile-location"><i class="fas fa-map-marker-alt"></i> ${user.location}</div>` : ''}
                    </div>
                </div>
                <div class="profile-body">
                    ${user.bio ? `<div class="profile-bio">${user.bio}</div>` : ''}
                    ${user.experience ? `<div class="profile-experience"><i class="fas fa-briefcase"></i> ${user.experience}</div>` : ''}
                    ${user.website ? `<div class="profile-website"><i class="fas fa-globe"></i> <a href="${user.website}" target="_blank">${user.website}</a></div>` : ''}
                </div>
                <div class="profile-footer">
                    <a href="/profile/${user.slug}" class="view-profile-btn">View Full Profile</a>
                    <button class="connect-btn" data-name="${user.name}">Connect</button>
                </div>
            `;
            container.appendChild(card);
        });

        // Add to chat
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message';
        messageDiv.appendChild(container);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Add connect button event listeners
        container.querySelectorAll('.connect-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const targetName = this.getAttribute('data-name');
                this.disabled = true;
                this.textContent = 'Sending...';
                try {
                    const res = await fetch('/ai/chat/process', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ command: `@connect me with ${targetName}` })
                    });
                    const result = await res.json();
                    this.textContent = result.message || 'Request Sent!';
                } catch (err) {
                    console.error('Error sending connection request:', err);
                    this.textContent = 'Error';
                }
            });
        });

        // Ask if user wants to send connection requests automatically
        const promptDiv = document.createElement('div');
        promptDiv.className = 'message ai-message';
        promptDiv.innerHTML = `
            <div class="auto-connect-prompt">
                <p>Would you like me to automatically send connection requests to all these profiles?</p>
                <div class="auto-connect-buttons">
                    <button class="auto-connect-yes">Yes, connect with all</button>
                    <button class="auto-connect-no">No, thanks</button>
                </div>
            </div>
        `;
        chatMessages.appendChild(promptDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Add event listeners for auto-connect buttons
        promptDiv.querySelector('.auto-connect-yes').addEventListener('click', async function() {
            this.disabled = true;
            this.textContent = 'Sending requests...';
            const buttons = promptDiv.querySelectorAll('button');
            buttons.forEach(btn => btn.disabled = true);

            try {
                // Send connection requests to all users
                const connectionPromises = users.map(user => 
                    fetch('/ai/chat/process', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ command: `@connect me with ${user.name}` })
                    }).then(res => res.json())
                );

                await Promise.all(connectionPromises);

                // Update all connect buttons
                container.querySelectorAll('.connect-btn').forEach(btn => {
                    btn.disabled = true;
                    btn.textContent = 'Request Sent!';
                });

                // Add confirmation message
                addMessageToChat('ai', `✅ I've sent connection requests to all ${users.length} profiles.`);
                
                // Add intro message prompt after successful connections
                setTimeout(() => {
                    const introPromptHtml = `
                    <div class="intro-message-prompt">
                        <p>Would you like to send an intro message to all these profiles?</p>
                        <div class="intro-message-buttons">
                            <button class="intro-all-yes-btn">Yes, send intro to all</button>
                            <button class="intro-all-no-btn">No, thanks</button>
                        </div>
                    </div>`;
                    addMessageToChat('ai', introPromptHtml);
                    
                    // Add event listeners for the bulk intro message buttons
                    setupBulkIntroMessageButtons(users);
                }, 1000);
            } catch (err) {
                console.error('Error sending bulk connection requests:', err);
                addMessageToChat('ai', '❌ Sorry, there was an error sending the connection requests. Please try connecting individually.');
            }
        });

        promptDiv.querySelector('.auto-connect-no').addEventListener('click', function() {
            const buttons = promptDiv.querySelectorAll('button');
            buttons.forEach(btn => btn.disabled = true);
            addMessageToChat('ai', 'Okay! You can still connect with profiles individually using the connect buttons.');
        });
    }
    
    /**
     * Add a message to the chat interface
     * @param {string} sender - 'user' or 'ai'
     * @param {string} text - Message text
     * @param {Array} images - Optional array of image objects
     */
    function addMessageToChat(sender, text, images = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        // Create avatar
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        
        if (sender === 'user') {
            avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
        } else {
            avatarDiv.innerHTML = '<i class="fas fa-robot"></i>';
        }
        
        // Create message content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Create message text
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        
        // Format message text with markdown-like syntax
        const formattedText = formatMessageText(text);
        textDiv.innerHTML = formattedText;
        
        // Add images if any
        if (images && images.length > 0) {
            const imagesDiv = document.createElement('div');
            imagesDiv.className = 'message-images';
            
            images.forEach(image => {
                const img = document.createElement('img');
                img.src = image.path || image;
                img.className = 'message-image';
                img.alt = 'Attached image';
                img.addEventListener('click', () => openImageModal(img.src));
                imagesDiv.appendChild(img);
            });
            
            contentDiv.appendChild(imagesDiv);
        }
        
        // Create timestamp
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Assemble message
        contentDiv.appendChild(textDiv);
        contentDiv.appendChild(timeDiv);
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        // Add to chat
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Add to current chat data
        if (!chats[currentChatId]) {
            chats[currentChatId] = {
                id: currentChatId,
                title: currentChatTitle.textContent,
                messages: [],
                createdAt: new Date().toISOString()
            };
        }
        
        chats[currentChatId].messages.push({
            sender,
            text,
            images: images.map(img => img.path || img),
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Format message text with markdown-like syntax
     * @param {string} text - Raw message text
     * @returns {string} - Formatted HTML
     */
    function formatMessageText(text) {
        if (!text) return '';
        
        // Convert URLs to links
        text = text.replace(/https?:\/\/[^\s]+/g, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
        
        // Convert line breaks to <p> tags
        const paragraphs = text.split('\n\n');
        return paragraphs.map(p => {
            if (!p.trim()) return '';
            
            // Handle lists
            if (p.match(/^\d+\. /m)) {
                const items = p.split('\n').map(item => {
                    if (item.match(/^\d+\. /)) {
                        return `<li>${item.replace(/^\d+\. /, '')}</li>`;
                    }
                    return item;
                }).join('');
                return `<ol>${items}</ol>`;
            } else if (p.match(/^- /m)) {
                const items = p.split('\n').map(item => {
                    if (item.match(/^- /)) {
                        return `<li>${item.replace(/^- /, '')}</li>`;
                    }
                    return item;
                }).join('');
                return `<ul>${items}</ul>`;
            }
            
            // Handle code blocks
            if (p.includes('```')) {
                return p.replace(/```([\s\S]*?)```/g, (match, code) => {
                    return `<pre><code>${code.trim()}</code></pre>`;
                });
            }
            
            // Handle inline code
            p = p.replace(/`([^`]+)`/g, '<code>$1</code>');
            
            // Escape '=' signs in AI chat output
            p = p.replace(/=/g, '&#61;');
            
            // Handle bold text
            p = p.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            
            // Handle italic text
            p = p.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            
            // Handle single line breaks
            return p.split('\n').join('<br>');
        }).join('<p></p>');
    }
    
    /**
     * Handle image uploads
     * @param {Event} e - Change event
     */
    async function handleImageUpload(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        try {
            showLoading();
            
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append('images', files[i]);
            }
            
            const response = await fetch('/ai/chat/upload-image', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Add images to attachments
                data.files.forEach(file => {
                    attachedImages.push(file);
                    addAttachmentPreview(file);
                });
            } else {
                console.error('Error uploading images:', data.message);
                alert('Error uploading images: ' + data.message);
            }
        } catch (error) {
            console.error('Error uploading images:', error);
            alert('Error uploading images. Please try again.');
        } finally {
            hideLoading();
            // Reset file input
            e.target.value = '';
        }
    }
    
    /**
     * Add attachment preview to input area
     * @param {Object} file - File object with path and filename
     */
    function addAttachmentPreview(file) {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'attachment-preview';
        previewDiv.dataset.path = file.path;
        
        const img = document.createElement('img');
        img.src = file.path;
        img.alt = file.originalname || 'Attached image';
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-attachment';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => removeAttachment(file.path));
        
        previewDiv.appendChild(img);
        previewDiv.appendChild(removeBtn);
        inputAttachments.appendChild(previewDiv);
    }
    
    /**
     * Remove an attachment
     * @param {string} path - File path to remove
     */
    function removeAttachment(path) {
        // Remove from attachedImages array
        attachedImages = attachedImages.filter(img => img.path !== path);
        
        // Remove preview element
        const preview = inputAttachments.querySelector(`[data-path="${path}"]`);
        if (preview) {
            preview.remove();
        }
    }
    
    /**
     * Toggle voice input
     */
    function toggleVoiceInput() {
        // Check if browser supports speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            
            recognition.onstart = () => {
                voiceInputBtn.classList.add('recording');
                voiceInputBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            };
            
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                chatInput.value += transcript;
            };
            
            recognition.onend = () => {
                voiceInputBtn.classList.remove('recording');
                voiceInputBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            };
            
            recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                voiceInputBtn.classList.remove('recording');
                voiceInputBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            };
            
            recognition.start();
        } else {
            alert('Your browser does not support speech recognition.');
        }
    }
    
    /**
     * Create a new chat
     */
    function createNewChat() {
        // Save current chat if it exists
        if (chats[currentChatId] && chats[currentChatId].messages.length > 0) {
            saveCurrentChat();
        }
        
        // Generate new chat ID
        currentChatId = generateChatId();
        
        // Clear chat messages
        chatMessages.innerHTML = '';
        
        // Add welcome message
        addMessageToChat('ai', 'Hello! I\'m your AI assistant. How can I help you today?\n\nYou can ask me questions, request content generation, or use special commands:\n- @generate bio about [theme]\n- @create post about [topic]\n- @find [expertise/industry]');
        
        // Update chat title
        currentChatTitle.textContent = 'New Chat';
        
        // Create new chat object
        chats[currentChatId] = {
            id: currentChatId,
            title: 'New Chat',
            messages: [
                {
                    sender: 'ai',
                    text: 'Hello! I\'m your AI assistant. How can I help you today?\n\nYou can ask me questions, request content generation, or use special commands:\n- @generate bio about [theme]\n- @create post about [topic]\n- @find [expertise/industry]',
                    timestamp: new Date().toISOString()
                }
            ],
            createdAt: new Date().toISOString()
        };
        
        // Save chats
        saveChats();
        
        // Update chat history
        renderChatHistory();
        
        // Focus on input
        chatInput.focus();
    }
    
    /**
     * Clear the current chat
     */
    function clearCurrentChat() {
        if (confirm('Are you sure you want to clear this chat?')) {
            // Remove chat from storage
            delete chats[currentChatId];
            saveChats();
            
            // Create new chat
            createNewChat();
        }
    }
    
    /**
     * Clear all chats
     */
    function clearAllChats() {
        if (confirm('Are you sure you want to clear all chats? This cannot be undone.')) {
            // Clear all chats
            chats = {};
            saveChats();
            
            // Create new chat
            createNewChat();
        }
    }
    
    /**
     * Export the current chat as a text file
     */
    function exportChat() {
        const chat = chats[currentChatId];
        if (!chat || chat.messages.length === 0) {
            alert('No chat to export.');
            return;
        }
        
        // Format chat as text
        let chatText = `# ${chat.title}\n`;
        chatText += `Exported on ${new Date().toLocaleString()}\n\n`;
        
        chat.messages.forEach(msg => {
            const sender = msg.sender === 'user' ? 'You' : 'AI';
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            chatText += `[${time}] ${sender}: ${msg.text}\n\n`;
        });
        
        // Create download link
        const blob = new Blob([chatText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Load a specific chat
     * @param {string} chatId - Chat ID to load
     */
    function loadChat(chatId) {
        const chat = chats[chatId];
        if (!chat) return;
        
        // Update current chat ID
        currentChatId = chatId;
        
        // Clear chat messages
        chatMessages.innerHTML = '';
        
        // Add messages to chat
        chat.messages.forEach(msg => {
            addMessageToChat(msg.sender, msg.text, msg.images);
        });
        
        // Update chat title
        currentChatTitle.textContent = chat.title;
        
        // Update active chat in history
        updateActiveChatInHistory();
    }
    
    /**
     * Update the chat title based on the first user message
     * @param {string} message - First user message
     */
    function updateChatTitle(message) {
        // Create a title from the first few words of the message
        let title = message.split(' ').slice(0, 4).join(' ');
        if (message.length > title.length) {
            title += '...';
        }
        
        // Update title
        currentChatTitle.textContent = title;
        
        // Update chat object
        if (chats[currentChatId]) {
            chats[currentChatId].title = title;
            saveChats();
        }
        
        // Update chat history
        renderChatHistory();
    }
    
    /**
     * Save the current chat
     */
    function saveCurrentChat() {
        if (!chats[currentChatId]) return;
        
        // Save to local storage
        saveChats();
        
        // Update chat history
        renderChatHistory();
    }
    
    /**
     * Render the chat history in the sidebar
     */
    function renderChatHistory() {
        // Clear history list
        chatHistoryList.innerHTML = '';
        
        // Get chat IDs sorted by creation date (newest first)
        const chatIds = Object.keys(chats).sort((a, b) => {
            return new Date(chats[b].createdAt) - new Date(chats[a].createdAt);
        });
        
        // Add chats to history
        chatIds.forEach(chatId => {
            const chat = chats[chatId];
            if (!chat || !chat.messages || chat.messages.length === 0) return;
            
            const li = document.createElement('li');
            li.className = 'chat-history-item';
            if (chatId === currentChatId) {
                li.classList.add('active');
            }
            
            const chatInfo = document.createElement('div');
            chatInfo.className = 'chat-info';
            
            const title = document.createElement('div');
            title.className = 'chat-title';
            title.textContent = chat.title || 'Untitled Chat';
            
            const date = document.createElement('div');
            date.className = 'chat-date';
            date.textContent = formatDate(chat.createdAt);
            
            chatInfo.appendChild(title);
            chatInfo.appendChild(date);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-chat';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteChat(chatId);
            });
            
            li.appendChild(chatInfo);
            li.appendChild(deleteBtn);
            
            li.addEventListener('click', () => loadChat(chatId));
            
            chatHistoryList.appendChild(li);
        });
    }
    
    /**
     * Update the active chat in the history list
     */
    function updateActiveChatInHistory() {
        // Remove active class from all items
        document.querySelectorAll('.chat-history-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to current chat
        const currentChatItem = document.querySelector(`.chat-history-item[data-id="${currentChatId}"]`);
        if (currentChatItem) {
            currentChatItem.classList.add('active');
        }
    }
    
    /**
     * Delete a chat
     * @param {string} chatId - Chat ID to delete
     */
    function deleteChat(chatId) {
        if (confirm('Are you sure you want to delete this chat?')) {
            // Delete chat
            delete chats[chatId];
            saveChats();
            
            // If current chat was deleted, create a new one
            if (chatId === currentChatId) {
                createNewChat();
            } else {
                // Just update the history
                renderChatHistory();
            }
        }
    }
    
    /**
     * Show command suggestions
     */
    function showCommandSuggestions() {
        commandSuggestions.style.display = 'block';
    }
    
    /**
     * Hide command suggestions
     */
    function hideCommandSuggestions() {
        commandSuggestions.style.display = 'none';
    }
    
    /**
     * Open image modal
     * @param {string} src - Image source URL
     */
    function openImageModal(src) {
        modalImage.src = src;
        imageModal.style.display = 'block';
    }
    
    /**
     * Close image modal
     */
    function closeImageModal() {
        imageModal.style.display = 'none';
    }
    
    /**
     * Show loading indicator
     */
    function showLoading() {
        loadingIndicator.style.display = 'block';
    }
    
    /**
     * Hide loading indicator
     */
    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }
    
    /**
     * Generate a unique chat ID
     * @returns {string} - Unique ID
     */
    function generateChatId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Show intro email form
     * @param {Array} emails - List of email objects
     */
    function showIntroEmailForm(emails) {
        // Create a modal for the intro email form
        const modal = document.createElement('div');
        modal.className = 'intro-email-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;';
        
        // Extract just the email addresses
        const emailAddresses = emails.map(item => item.email).filter(email => email);
        
        // Create the form content
        modal.innerHTML = `
            <div class="intro-email-form" style="background-color: white; padding: 20px; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                <h3 style="margin-top: 0; color: #4a6cf7;">Send Introduction Email</h3>
                <form id="intro-email-form">
                    <div style="margin-bottom: 15px;">
                        <label for="from-name" style="display: block; margin-bottom: 5px; font-weight: bold;">Your Name:</label>
                        <input type="text" id="from-name" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label for="from-email" style="display: block; margin-bottom: 5px; font-weight: bold;">Your Email:</label>
                        <input type="email" id="from-email" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label for="to-emails" style="display: block; margin-bottom: 5px; font-weight: bold;">Recipients:</label>
                        <select id="to-emails" multiple style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; height: 100px;">
                            ${emailAddresses.map(email => `<option value="${email}" selected>${email}</option>`).join('')}
                        </select>
                        <small style="display: block; margin-top: 5px; color: #666;">Hold Ctrl/Cmd to select multiple emails</small>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label for="business-context" style="display: block; margin-bottom: 5px; font-weight: bold;">Business Context (Optional):</label>
                        <textarea id="business-context" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; height: 100px;" placeholder="Add some context about your business or why you're reaching out..."></textarea>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                        <button type="button" id="cancel-intro-email" style="background-color: #f0f0f0; color: #333; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Cancel</button>
                        <button type="submit" style="background-color: #4a6cf7; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Send Email</button>
                    </div>
                </form>
            </div>
        `;
        
        // Add the modal to the document
        document.body.appendChild(modal);
        
        // Handle form submission
        document.getElementById('intro-email-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const fromName = document.getElementById('from-name').value;
            const fromEmail = document.getElementById('from-email').value;
            const businessContext = document.getElementById('business-context').value;
            
            // Get selected emails
            const selectElement = document.getElementById('to-emails');
            const selectedEmails = Array.from(selectElement.selectedOptions).map(option => option.value);
            
            if (selectedEmails.length === 0) {
                alert('Please select at least one recipient');
                return;
            }
            
            // Show loading state
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Sending...';
            submitButton.disabled = true;
            
            // Send the intro email
            fetch('/api/web-search/send-intro-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    toEmails: selectedEmails,
                    fromName,
                    fromEmail,
                    businessContext
                })
            })
            .then(response => response.json())
            .then(data => {
                // Close the modal
                document.body.removeChild(modal);
                
                // Show success message
                if (data.success) {
                    addMessageToChat('ai', `✅ Introduction email${selectedEmails.length > 1 ? 's' : ''} sent successfully to ${selectedEmails.length} recipient${selectedEmails.length > 1 ? 's' : ''}!`);
                } else {
                    addMessageToChat('ai', `❌ Error sending introduction email: ${data.error || 'Unknown error'}`);
                }
            })
            .catch(error => {
                console.error('Error sending intro email:', error);
                addMessageToChat('ai', '❌ Error sending introduction email. Please try again later.');
                
                // Reset button
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            });
        });
        
        // Handle cancel button
        document.getElementById('cancel-intro-email').addEventListener('click', function() {
            document.body.removeChild(modal);
        });
    }
    
    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string} - Formatted date
     */
    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        
        // If today, show time
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // If this year, show month and day
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
        
        // Otherwise show full date
        return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    }
    
    /**
     * Load chats from local storage
     * @returns {Object} - Chats object
     */
    function loadChats() {
        try {
            const storedChats = localStorage.getItem('ai_chats');
            return storedChats ? JSON.parse(storedChats) : {};
        } catch (error) {
            console.error('Error loading chats:', error);
            return {};
        }
    }
    
    /**
     * Save chats to local storage
     */
    function saveChats() {
        try {
            localStorage.setItem('ai_chats', JSON.stringify(chats));
        } catch (error) {
            console.error('Error saving chats:', error);
        }
    }
});

// Store displayed profiles for auto-connect feature
let displayedProfiles = [];

/**
 * Set up event listeners for intro message buttons
 */
function setupIntroMessageButtons() {
    // Find the most recently added intro message buttons
    const yesButton = document.querySelector('.intro-message-buttons .intro-yes-btn:not([data-initialized])');
    const noButton = document.querySelector('.intro-message-buttons .intro-no-btn:not([data-initialized])');
    
    if (yesButton && noButton) {
        // Mark buttons as initialized to avoid duplicate event listeners
        yesButton.setAttribute('data-initialized', 'true');
        noButton.setAttribute('data-initialized', 'true');
        
        // Add event listener for "Yes" button
        yesButton.addEventListener('click', function() {
            const profileId = this.getAttribute('data-profile-id');
            const profileName = this.getAttribute('data-profile-name');
            
            // Create and send the intro message
            const command = `@send a message to ${profileName} saying Hi ${profileName}, I saw your profile and wanted to connect. I'd love to learn more about your work and explore potential collaboration opportunities.`;
            
            // Send the command to the server
            fetch('/api/ai-chat/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ command })
            })
            .then(response => response.json())
            .then(data => {
                // Remove the intro message prompt
                const promptDiv = this.closest('.intro-message-prompt');
                if (promptDiv) {
                    promptDiv.innerHTML = '<p>Intro message sent successfully! 🎉</p>';
                    setTimeout(() => {
                        promptDiv.style.opacity = '0';
                        setTimeout(() => {
                            promptDiv.remove();
                        }, 500);
                    }, 2000);
                }
            })
            .catch(error => {
                console.error('Error sending intro message:', error);
                addMessageToChat('ai', 'Sorry, there was an error sending your intro message. Please try again.');
            });
        });
        
        // Add event listener for "No" button
        noButton.addEventListener('click', function() {
            // Remove the intro message prompt with a fade-out effect
            const promptDiv = this.closest('.intro-message-prompt');
            if (promptDiv) {
                promptDiv.style.opacity = '0';
                setTimeout(() => {
                    promptDiv.remove();
                }, 500);
            }
        });
    }
}

function displaySearchResults(results) {
    const searchResultsDiv = document.createElement('div');
    searchResultsDiv.className = 'search-results';
    
    const resultsHeader = document.createElement('h3');
    resultsHeader.textContent = `Found ${results.length} matching profiles`;
    searchResultsDiv.appendChild(resultsHeader);
    
    const userCards = document.createElement('div');
    userCards.className = 'user-cards';
    
    // Clear previously stored profiles
    displayedProfiles = [];
    
    results.forEach(profile => {
        // Store profile for auto-connect
        displayedProfiles.push(profile);
        
        const card = createProfileCard(profile);
        userCards.appendChild(card);
    });
    
    searchResultsDiv.appendChild(userCards);
    
    // Add auto-connect prompt
    const autoConnectPrompt = document.createElement('div');
    autoConnectPrompt.className = 'auto-connect-prompt';
    autoConnectPrompt.innerHTML = `
        <p>Would you like to send connection requests to all displayed profiles?</p>
        <div class="auto-connect-buttons">
            <button class="auto-connect-yes">Yes, Connect with All</button>
            <button class="auto-connect-no">No, Thanks</button>
        </div>
    `;
    
    // Handle auto-connect actions
    const yesButton = autoConnectPrompt.querySelector('.auto-connect-yes');
    const noButton = autoConnectPrompt.querySelector('.auto-connect-no');
    
    yesButton.addEventListener('click', async () => {
        yesButton.disabled = true;
        noButton.disabled = true;
        yesButton.textContent = 'Sending Requests...';
        
        try {
            for (const profile of displayedProfiles) {
                await sendConnectionRequest(profile.userId);
                await new Promise(resolve => setTimeout(resolve, 500)); // Add delay between requests
            }
            yesButton.textContent = 'Requests Sent!';
            yesButton.style.backgroundColor = '#45a049';
        } catch (error) {
            console.error('Error sending connection requests:', error);
            yesButton.textContent = 'Error Sending Requests';
            yesButton.style.backgroundColor = '#dc3545';
        }
    });
    
    noButton.addEventListener('click', () => {
        autoConnectPrompt.remove();
    });
    
    searchResultsDiv.appendChild(autoConnectPrompt);
    return searchResultsDiv;
}

async function sendConnectionRequest(userId) {
    try {
        const response = await fetch('/api/connections/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send connection request');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error sending connection request:', error);
        throw error;
    }
}

/**
 * Setup event handlers for intro message prompt buttons
 */
function setupIntroMessageButtons() {
    // Add event listeners to the yes/no buttons
    document.querySelectorAll('.intro-yes-btn').forEach(btn => {
        if (!btn.hasAttribute('data-listener-added')) {
            btn.setAttribute('data-listener-added', 'true');
            btn.addEventListener('click', async function() {
                const profileId = this.getAttribute('data-profile-id');
                const profileName = this.getAttribute('data-profile-name');
                
                if (!profileId || !profileName) {
                    console.error('Missing profile information for intro message');
                    return;
                }
                
                // Disable buttons
                this.disabled = true;
                const noBtn = this.closest('.intro-message-prompt').querySelector('.intro-no-btn');
                if (noBtn) noBtn.disabled = true;
                
                this.textContent = 'Sending...';
                
                try {
                    // Send intro message using AI command
                    const response = await fetch('/ai/chat/process', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            command: `@send a message to ${profileName} saying Hi ${profileName}, thanks for connecting! I'd love to learn more about your work and explore potential collaboration opportunities.` 
                        })
                    });
                    
                    const result = await response.json();
                    
                    // Show success and remove prompt
                    this.textContent = 'Message Sent!';
                    this.style.backgroundColor = '#45a049';
                    
                    // Remove the prompt after a delay
                    setTimeout(() => {
                        const promptDiv = this.closest('.intro-message-prompt');
                        if (promptDiv) {
                            promptDiv.style.opacity = '0';
                            setTimeout(() => promptDiv.remove(), 300);
                        }
                    }, 1500);
                    
                } catch (error) {
                    console.error('Error sending intro message:', error);
                    this.textContent = 'Error';
                    this.style.backgroundColor = '#dc3545';
                    this.disabled = false;
                    if (noBtn) noBtn.disabled = false;
                }
            });
        }
    });
    
    document.querySelectorAll('.intro-no-btn').forEach(btn => {
        if (!btn.hasAttribute('data-listener-added')) {
            btn.setAttribute('data-listener-added', 'true');
            btn.addEventListener('click', function() {
                const promptDiv = this.closest('.intro-message-prompt');
                if (promptDiv) {
                    promptDiv.style.opacity = '0';
                    setTimeout(() => promptDiv.remove(), 300);
                }
            });
        }
    });
}

/**
 * Setup event handlers for bulk intro message buttons
 * @param {Array} users - Array of user objects to send intro messages to
 */
function setupBulkIntroMessageButtons(users) {
    // Find the most recently added bulk intro message buttons
    const yesButton = document.querySelector('.intro-message-buttons .intro-all-yes-btn:not([data-initialized])');
    const noButton = document.querySelector('.intro-message-buttons .intro-all-no-btn:not([data-initialized])');
    
    if (yesButton && noButton) {
        // Mark buttons as initialized to avoid duplicate event listeners
        yesButton.setAttribute('data-initialized', 'true');
        noButton.setAttribute('data-initialized', 'true');
        
        // Add event listener for "Yes, send to all" button
        yesButton.addEventListener('click', async function() {
            // Disable buttons
            this.disabled = true;
            noButton.disabled = true;
            this.textContent = 'Drafting message...';
            
            try {
                // First, create a draft message form
                const promptDiv = this.closest('.intro-message-prompt');
                if (promptDiv) {
                    // Replace the prompt with a draft message form
                    promptDiv.innerHTML = `
                        <div class="draft-intro-message">
                            <h4>Draft your intro message</h4>
                            <p>Personalize your message to all profiles:</p>
                            <textarea id="bulk-intro-message" rows="4" placeholder="Hi, I am [Your Name]. My field of interest is [Your Interest] and I would love to talk with you."></textarea>
                            <div class="draft-intro-buttons">
                                <button id="send-bulk-intro">Send to All Profiles</button>
                                <button id="cancel-bulk-intro">Cancel</button>
                            </div>
                        </div>
                    `;
                    
                    // Add event listeners to the new buttons
                    const sendButton = document.getElementById('send-bulk-intro');
                    const cancelButton = document.getElementById('cancel-bulk-intro');
                    const messageTextarea = document.getElementById('bulk-intro-message');
                    
                    // Pre-fill with template
                    fetch('/api/user/profile', {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    })
                    .then(res => res.json())
                    .then(userData => {
                        const userName = userData.name || 'your name';
                        const userInterest = userData.interests && userData.interests.length > 0 ? 
                            userData.interests[0] : 'your field';
                        
                        messageTextarea.value = `Hi, I am ${userName}. My field of interest is ${userInterest} and I would love to talk with you.`;
                    })
                    .catch(err => {
                        console.error('Error fetching user data:', err);
                        messageTextarea.value = 'Hi, I am [Your Name]. My field of interest is [Your Interest] and I would love to talk with you.';
                    });
                    
                    // Send button event listener
                    sendButton.addEventListener('click', async function() {
                        this.disabled = true;
                        cancelButton.disabled = true;
                        this.textContent = 'Sending messages...';
                        
                        const introMessage = messageTextarea.value.trim();
                        if (!introMessage) {
                            alert('Please enter a message before sending.');
                            this.disabled = false;
                            cancelButton.disabled = false;
                            return;
                        }
                        
                        try {
                            // Send intro messages to all users
                            const messagePromises = users.map(user => 
                                fetch('/ai/chat/process', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                        command: `@send a message to ${user.name} saying ${introMessage}` 
                                    })
                                }).then(res => res.json())
                            );
                            
                            await Promise.all(messagePromises);
                            
                            // Show success and remove prompt
                            this.textContent = 'All Messages Sent!';
                            this.style.backgroundColor = '#45a049';
                            
                            // Add confirmation message
                            addMessageToChat('ai', `✅ I've sent your intro message to all ${users.length} profiles.`);
                            
                            // Remove the prompt after a delay
                            setTimeout(() => {
                                const draftDiv = this.closest('.draft-intro-message');
                                if (draftDiv) {
                                    const parentDiv = draftDiv.parentElement;
                                    if (parentDiv) {
                                        parentDiv.style.opacity = '0';
                                        setTimeout(() => parentDiv.remove(), 300);
                                    }
                                }
                            }, 1500);
                            
                        } catch (error) {
                            console.error('Error sending bulk intro messages:', error);
                            this.textContent = 'Error';
                            this.style.backgroundColor = '#dc3545';
                            addMessageToChat('ai', '❌ Sorry, there was an error sending the intro messages. Please try sending messages individually.');
                            this.disabled = false;
                            cancelButton.disabled = false;
                        }
                    });
                    
                    // Cancel button event listener
                    cancelButton.addEventListener('click', function() {
                        const draftDiv = this.closest('.draft-intro-message');
                        if (draftDiv) {
                            const parentDiv = draftDiv.parentElement;
                            if (parentDiv) {
                                parentDiv.style.opacity = '0';
                                setTimeout(() => parentDiv.remove(), 300);
                            }
                        }
                    });
                }
            } catch (error) {
                console.error('Error setting up draft message:', error);
                this.textContent = 'Error';
                this.style.backgroundColor = '#dc3545';
                this.disabled = false;
                noButton.disabled = false;
            }
        });
        
        // Add event listener for "No" button
        noButton.addEventListener('click', function() {
            // Remove the intro message prompt with a fade-out effect
            const promptDiv = this.closest('.intro-message-prompt');
            if (promptDiv) {
                promptDiv.style.opacity = '0';
                setTimeout(() => promptDiv.remove(), 300);
            }
        });
    }
}

// Handle AI response based on action type
function handleAIResponse(response) {
    console.log('Handling AI response:', response);
    
    switch (response.action) {
        case 'message':
            displayAIMessage(response.message);
            break;
            
        case 'bio_updated':
            displayAIMessage(response.message);
            // Could add additional UI feedback here
            break;
            
        case 'post_generated':
            displayAIMessage(response.message);
            displaySchedulingOptions(response);
            break;
            
        case 'post_scheduled':
            displayAIMessage(response.message);
            // Could add a link to view the scheduled post
            break;
            
        case 'posts_scheduled':
            displayAIMessage(response.message);
            displayScheduledPosts(response.scheduledPosts);
            break;
            
        case 'post_created':
            displayAIMessage(response.message);
            // Could add a link to view the post
            break;
            
        case 'error':
            displayAIMessage(`❌ ${response.message}`);
            break;
            
        default:
            displayAIMessage(response.message || 'I processed your request.');
    }
}

// Display scheduling options UI
function displaySchedulingOptions(response) {
    const { post, topic, optimalTime, schedulingOptions } = response;
    const postContent = post.caption || post;  // Handle both object and string formats
    
    // Format optimal time for display
    const formattedOptimalTime = optimalTime ? 
        `${optimalTime.hour}:${optimalTime.minute.toString().padStart(2, '0')} on ${optimalTime.dayOfWeek}` : 
        'Not available';
    
    const schedulingUI = document.createElement('div');
    schedulingUI.className = 'scheduling-options card mt-3 mb-3';
    schedulingUI.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">Would you like to schedule this post?</h5>
            <div class="post-preview mb-3">
                <h6>Generated Post:</h6>
                <p class="border p-2 rounded bg-light">${postContent}</p>
            </div>
            <p class="card-text">Optimal posting time: ${formattedOptimalTime}</p>
            
            <div class="form-check mb-3">
                <input class="form-check-input" type="radio" name="schedulingOption" id="postNow" value="now" checked>
                <label class="form-check-label" for="postNow">
                    Post now
                </label>
            </div>
            
            <div class="form-check mb-3">
                <input class="form-check-input" type="radio" name="schedulingOption" id="scheduleOptimal" value="optimal">
                <label class="form-check-label" for="scheduleOptimal">
                    Schedule at optimal time (${formattedOptimalTime})
                </label>
            </div>
            
            <div class="form-check mb-3">
                <input class="form-check-input" type="radio" name="schedulingOption" id="scheduleCustom" value="custom">
                <label class="form-check-label" for="scheduleCustom">
                    Schedule at custom time
                </label>
                <input type="datetime-local" id="customDateTime" class="form-control mt-2" style="display: none;">
            </div>
            
            <div class="form-check mb-3">
                <input class="form-check-input" type="radio" name="schedulingOption" id="generateMultiple" value="multiple">
                <label class="form-check-label" for="generateMultiple">
                    Generate multiple posts and schedule them
                </label>
                <div id="multipleOptions" class="mt-2" style="display: none;">
                    <div class="form-group">
                        <label for="posts-count">Number of posts:</label>
                        <select id="postCount" class="form-control">
                            <option value="3">3</option>
                            <option value="5">5</option>
                            <option value="7">7</option>
                        </select>
                    </div>
                    <div class="form-group mt-2">
                        <label for="postInterval">Days between posts:</label>
                        <select id="postInterval" class="form-control">
                            <option value="1">1 day</option>
                            <option value="2">2 days</option>
                            <option value="3">3 days</option>
                            <option value="7">1 week</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="d-flex justify-content-end mt-3">
                <button id="confirmScheduling" class="btn btn-primary">Confirm</button>
            </div>
        </div>
    `;
    
    document.querySelector('#chat-messages').appendChild(schedulingUI);
    
    // Add event listeners
    document.getElementById('scheduleCustom').addEventListener('change', function() {
        document.getElementById('customDateTime').style.display = this.checked ? 'block' : 'none';
    });
    
    document.getElementById('generateMultiple').addEventListener('change', function() {
        document.getElementById('multipleOptions').style.display = this.checked ? 'block' : 'none';
    });
    
    document.getElementById('confirmScheduling').addEventListener('click', function() {
        const selectedOption = document.querySelector('input[name="schedulingOption"]:checked').value;
        let schedulingData = {
            postContent: post,
            topic: topic
        };
        
        if (selectedOption === 'now') {
            // Post immediately
            submitPostNow(post);
        } else if (selectedOption === 'optimal') {
            // Schedule at optimal time
            schedulingData.schedulingOptions = {
                useOptimalTime: true
            };
            schedulePost(schedulingData);
        } else if (selectedOption === 'custom') {
            // Schedule at custom time
            const customDate = document.getElementById('customDateTime').value;
            if (!customDate) {
                alert('Please select a date and time');
                return;
            }
            schedulingData.schedulingOptions = {
                customDate: customDate
            };
            schedulePost(schedulingData);
        } else if (selectedOption === 'multiple') {
            // Generate multiple posts
            const count = document.getElementById('postCount').value;
            const intervalDays = document.getElementById('postInterval').value;
            schedulingData.schedulingOptions = {
                generateMultiple: true,
                count: parseInt(count),
                intervalDays: parseInt(intervalDays)
            };
            schedulePost(schedulingData);
        }
        
        // Remove scheduling UI
        schedulingUI.remove();
    });
}

// Submit post immediately
function submitPostNow(postContent) {
    // Extract caption from post object or use string directly
    const caption = typeof postContent === 'object' ? postContent.caption : postContent;
    
    fetch('/api/posts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ caption: caption })
    })
    .then(response => response.json())
    .then(data => {
        displayAIMessage(`✅ Post published successfully!`);
    })
    .catch(error => {
        displayAIMessage(`❌ Error publishing post: ${error.message}`);
    });
}

// Schedule post
function schedulePost(schedulingData) {
    // Ensure postContent is properly formatted
    if (schedulingData.postContent) {
        // If it's an object, extract the content or caption
        if (typeof schedulingData.postContent === 'object') {
            schedulingData.postContent = schedulingData.postContent.caption || 
                                        schedulingData.postContent.content || 
                                        JSON.stringify(schedulingData.postContent);
        }
        
        // Ensure it's not empty
        if (!schedulingData.postContent || schedulingData.postContent.trim() === '') {
            displayAIMessage(`❌ Error: Post content cannot be empty`);
            return;
        }
    } else {
        displayAIMessage(`❌ Error: Missing post content`);
        return;
    }
    
    console.log('Scheduling data:', schedulingData);
    
    fetch('/api/posts/schedule', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(schedulingData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        handleAIResponse(data);
    })
    .catch(error => {
        console.error('Scheduling error:', error);
        displayAIMessage(`❌ Error scheduling post: ${error.message}`);
    });
}

// Display scheduled posts
function displayScheduledPosts(scheduledPosts) {
    if (!scheduledPosts || !Array.isArray(scheduledPosts)) {
        console.error('Invalid scheduled posts data:', scheduledPosts);
        displayAIMessage('❌ Error displaying scheduled posts. Please try again.');
        return;
    }
    
    const scheduledPostsUI = document.createElement('div');
    scheduledPostsUI.className = 'scheduled-posts card mt-3 mb-3';
    
    let postsHTML = '';
    scheduledPosts.forEach((post, index) => {
        // Handle different post content formats
        const content = post.content || post.caption || (typeof post === 'string' ? post : 'Post content');
        const date = new Date(post.scheduledDate);
        
        postsHTML += `
            <div class="scheduled-post mb-2 p-2 border-bottom">
                <p class="mb-1"><strong>Post #${index + 1}:</strong> ${content}</p>
                <small class="text-muted">Scheduled for: ${date.toLocaleString()}</small>
            </div>
        `;
    });
    
    scheduledPostsUI.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">Your Scheduled Posts</h5>
            <div class="scheduled-posts-list">
                ${postsHTML}
            </div>
        </div>
    `;
    
    document.querySelector('#chat-messages').appendChild(scheduledPostsUI);
}

    // Draft Message button behavior is controlled at the top via initializeWebSearch() to open the Business Research Assistant modal.
    // Duplicate listener removed to avoid conflicts.