/**
 * Standalone AI Chat
 * Provides a dedicated AI chat interface with @text command functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatMessages = document.getElementById('ai-chat-messages');
    const chatInput = document.getElementById('ai-chat-input');
    const sendButton = document.getElementById('ai-chat-send-btn');
    const clearChatButton = document.getElementById('clear-chat-btn');
    const commandSuggestions = document.getElementById('command-suggestions');
    const suggestionsContent = document.getElementById('suggestions-content');
    const closeSuggestions = document.getElementById('close-suggestions');
    const imageUpload = document.getElementById('image-upload');
    const inputAttachments = document.getElementById('input-attachments');
    const searchResultsContainer = document.getElementById('search-results-container');
    const closeSearchResults = document.getElementById('close-search-results');
    const searchResultsContent = document.getElementById('search-results-content');
    
    // State
    let chatHistory = [];
    let isProcessing = false;
    let attachedImages = [];
    
    // Load chat history from localStorage if available
    loadChatHistory();
    
    // Event Listeners
    chatInput.addEventListener('input', handleInputChange);
    chatInput.addEventListener('keydown', handleKeyDown);
    sendButton.addEventListener('click', sendMessage);
    clearChatButton.addEventListener('click', clearChat);
    closeSuggestions.addEventListener('click', hideCommandSuggestions);
    closeSearchResults.addEventListener('click', hideSearchResults);
    imageUpload.addEventListener('change', handleImageUpload);
    
    // Create image modal for fullscreen view
    createImageModal();
    
    // Auto-resize textarea as user types
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Reset height if empty
        if (this.value === '') {
            this.style.height = '50px';
        }
    });
    
    /**
     * Handle input changes to detect @ commands
     */
    function handleInputChange() {
        const value = chatInput.value;
        const lastAtIndex = value.lastIndexOf('@');
        
        if (lastAtIndex !== -1 && (lastAtIndex === 0 || value[lastAtIndex - 1] === ' ')) {
            // Show command suggestions immediately when @ is typed
            const command = value.substring(lastAtIndex + 1).trim();
            showCommandSuggestions(command);
            
            // Check for @ mentions of founders
            const mentionMatch = value.match(/@(\w+)/g);
            if (mentionMatch && command.length > 0 && !command.includes(' ')) {
                // If it's a simple @name mention without spaces, treat it as a profile request
                const founderName = command;
                if (founderName.length > 0) {
                    // Process the founder profile request on Enter key press
                    // We don't process it immediately to avoid multiple requests while typing
                }
            }
        } else {
            // Hide suggestions if no @ symbol
            hideCommandSuggestions();
        }
    }
    
    /**
     * Handle keydown events
     * @param {KeyboardEvent} e - The keydown event
     */
    function handleKeyDown(e) {
        // If Enter is pressed without Shift, send message
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            
            // Check if it's a simple @name mention
            const value = chatInput.value;
            const lastAtIndex = value.lastIndexOf('@');
            
            if (lastAtIndex !== -1 && (lastAtIndex === 0 || value[lastAtIndex - 1] === ' ')) {
                const command = value.substring(lastAtIndex + 1).trim();
                
                // If it's a simple @name mention without spaces, treat it as a profile request
                if (command.length > 0 && !command.includes(' ')) {
                    // Format as a profile request
                    chatInput.value = `@profile of ${command}`;
                }
            }
            
            sendMessage();
        }
        
        // If Escape is pressed, hide suggestions
        if (e.key === 'Escape') {
            hideCommandSuggestions();
            hideSearchResults();
        }
    }
    
    /**
     * Handle image upload
     * @param {Event} e - The change event
     */
    function handleImageUpload(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        // Process each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Validate file type
            if (!file.type.match('image.*')) {
                alert('Only image files are allowed');
                continue;
            }
            
            // Create a preview
            const reader = new FileReader();
            reader.onload = function(e) {
                const imageData = {
                    file: file,
                    dataUrl: e.target.result
                };
                
                attachedImages.push(imageData);
                displayAttachedImage(imageData);
            };
            reader.readAsDataURL(file);
        }
        
        // Reset the file input
        e.target.value = '';
    }
    
    /**
     * Display attached image in the input area
     * @param {Object} imageData - The image data object
     */
    function displayAttachedImage(imageData) {
        const container = document.createElement('div');
        container.className = 'attached-image-container';
        
        const img = document.createElement('img');
        img.className = 'attached-image';
        img.src = imageData.dataUrl;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-attachment';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', function() {
            // Remove from attachedImages array
            const index = attachedImages.findIndex(img => img.dataUrl === imageData.dataUrl);
            if (index !== -1) {
                attachedImages.splice(index, 1);
            }
            
            // Remove from DOM
            container.remove();
        });
        
        container.appendChild(img);
        container.appendChild(removeBtn);
        inputAttachments.appendChild(container);
    }
    
    /**
     * Send message to AI
     */
    function sendMessage() {
        const message = chatInput.value.trim();
        
        if ((message === '' && attachedImages.length === 0) || isProcessing) return;
        
        // Create message content
        let messageContent = message;
        
        // Add user message to chat
        addMessageToChat('user', messageContent, false, attachedImages.map(img => img.dataUrl));
        
        // Clear input
        chatInput.value = '';
        chatInput.style.height = '50px';
        
        // Hide suggestions
        hideCommandSuggestions();
        
        // Process message
        processMessage(message);
        
        // Clear attachments
        clearAttachments();
    }
    
    /**
     * Clear all attached images
     */
    function clearAttachments() {
        attachedImages = [];
        inputAttachments.innerHTML = '';
    }
    
    /**
     * Process the user message
     * @param {string} message - The user message
     */
    function processMessage(message) {
        isProcessing = true;
        
        // Show loading indicator
        showLoadingIndicator();
        
        // Check if message contains @ command
        if (message.includes('@')) {
            processCommand(message);
        } else if (message.toLowerCase().includes('search') || message.toLowerCase().includes('find')) {
            // Handle search queries
            processSearchQuery(message);
        } else {
            // Regular AI chat
            processAIChat(message);
        }
    }
    
    /**
     * Process search query
     * @param {string} message - The search query
     */
    function processSearchQuery(message) {
        // Extract search term - handle various formats
        let searchTerm = message;
        if (message.toLowerCase().startsWith('search')) {
            searchTerm = message.substring(6).trim();
        } else if (message.toLowerCase().startsWith('find')) {
            searchTerm = message.substring(4).trim();
        } else if (message.toLowerCase().includes('profiles of')) {
            const match = message.match(/profiles of\s+(.+)/i);
            if (match) searchTerm = match[1].trim();
        }
        
        // Don't proceed if search term is empty
        if (!searchTerm) {
            addMessageToChat('ai', 'Please specify what you want to search for.');
            return;
        }
        
        // Add user message to chat
        addMessageToChat('user', message);
        
        // Show loading indicator
        showLoadingIndicator();
        
        // Convert to command format for backend
        const command = `@search ${searchTerm}`;
        
        // Send command to server
        fetch('/api/ai-chat/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command })
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    // Handle unauthorized error
                    window.location.href = '/login';
                    throw new Error('Unauthorized. Please login to continue.');
                }
                return response.json().then(data => {
                    throw new Error(data.message || `Server responded with status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            removeLoadingIndicator();
            
            // Display the search results
            displaySearchResults(data, searchTerm);
            
            isProcessing = false;
            saveChatHistory();
        })
        .catch(error => {
            console.error('Error processing search query:', error);
            if (!error.message.includes('Unauthorized')) {
                addMessageToChat('ai', `An error occurred while processing your search: ${error.message}. Please try again.`);
                removeLoadingIndicator();
                isProcessing = false;
            }
        });
    }
    
    /**
     * Display search results in the search results container
     * @param {Object} data - The search result data
     * @param {string} searchTerm - The search term
     */
    function displaySearchResults(data, searchTerm) {
        // Add AI response to chat with more detailed information
        let responseMessage = `I searched for "${searchTerm}" and `;
        
        if (!data.data || !data.data.users || data.data.users.length === 0) {
            responseMessage += `didn't find any matching profiles.`;
            addMessageToChat('ai', responseMessage);
            return;
        }
        
        responseMessage += `found ${data.data.users.length} matching profile${data.data.users.length > 1 ? 's' : ''}.`;
        addMessageToChat('ai', responseMessage);
        
        // Clear previous results
        searchResultsContent.innerHTML = '';
        
        // Create profiles section
        const profilesSection = document.createElement('div');
        profilesSection.className = 'search-category';
        profilesSection.innerHTML = `<h3 class="search-category-title">Profiles matching "${searchTerm}"</h3>`;
        
        // Add user results
        data.data.users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'search-result-item';
            userItem.innerHTML = `
                <div class="search-result-avatar">
                    ${user.avatar ? 
                        `<img src="${user.avatar}" alt="${user.name}">` :
                        `<div class="avatar-placeholder">${user.name.charAt(0).toUpperCase()}</div>`
                    }
                </div>
                <div class="search-result-info">
                    <div class="search-result-name">${user.name}</div>
                    <div class="search-result-details">${user.title || user.role || ''}</div>
                </div>
            `;
            
            // Add click event to navigate to profile
            userItem.addEventListener('click', () => {
                window.location.href = `/profile/${user.slug}`;
            });
            
            profilesSection.appendChild(userItem);
        });
        
        searchResultsContent.appendChild(profilesSection);
        
        // Show the search results container
        searchResultsContainer.style.display = 'block';
    }
    
    /**
     * Hide search results container
     */
    function hideSearchResults() {
        searchResultsContainer.style.display = 'none';
    }
    
    /**
     * Process @ command
     * @param {string} message - The message containing a command
     */
    function processCommand(message) {
        // Extract command
        const commandMatch = message.match(/@([^\s].+)/);
        if (!commandMatch) {
            addMessageToChat('ai', 'Please provide a valid command after the @ symbol.');
            isProcessing = false;
            removeLoadingIndicator();
            return;
        }
        
        const command = '@' + commandMatch[1];
        
        // Send command to server
        fetch('/api/ai-chat/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command })
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    // Handle unauthorized error
                    window.location.href = '/login';
                    throw new Error('Unauthorized. Please login to continue.');
                }
                return response.json().then(data => {
                    throw new Error(data.message || `Server responded with status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            removeLoadingIndicator();
            
            // The server response from /process endpoint doesn't include a success property
            // Instead, it always includes an action and message property
            // Display the result based on the action type
            displayCommandResult(data);
            
            isProcessing = false;
            saveChatHistory();
        })
        .catch(error => {
            console.error('Error processing command:', error);
            if (!error.message.includes('Unauthorized')) {
                addMessageToChat('ai', `An error occurred while processing your command: ${error.message}. Please try again.`);
                removeLoadingIndicator();
                isProcessing = false;
            }
        });
    }
    
    /**
     * Process regular AI chat message
     * @param {string} message - The user message
     */
    function processAIChat(message) {
        // Get image data URLs if any
        const imageDataUrls = attachedImages.map(img => img.dataUrl);
        
        // Use Novita API for AI responses
        fetch('/api/ai-chat/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message,
                images: imageDataUrls
            })
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    // Handle unauthorized error
                    window.location.href = '/login';
                    throw new Error('Unauthorized. Please login to continue.');
                }
                return response.json().then(data => {
                    throw new Error(data.message || `Server responded with status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            removeLoadingIndicator();
            
            if (data.success) {
                addMessageToChat('ai', data.response);
            } else {
                // Show a more detailed error message
                const errorMsg = data.message || 'Sorry, I encountered an error. Please try again.';
                addMessageToChat('ai', `<p class="error-message">${errorMsg}</p><p>The AI service might be temporarily unavailable. Please try again later or contact support if the issue persists.</p>`, true);
            }
            
            isProcessing = false;
            saveChatHistory();
        })
        .catch(error => {
            console.error('Error processing AI chat:', error);
            if (!error.message.includes('Unauthorized')) {
                addMessageToChat('ai', `<p class="error-message">An error occurred while processing your message: ${error.message}</p><p>The AI service might be temporarily unavailable. Please try again later or contact support if the issue persists.</p>`, true);
                removeLoadingIndicator();
                isProcessing = false;
            }
        });
    }
    
    /**
     * Display command result
     * @param {Object} data - The command result data
     */
    function displayCommandResult(data) {
        // Check if the message is an error message but the action was successful
        // This handles the case where the server returns a success message with the error text
        if (data.action === 'message' && data.message.includes("Please specify both the recipient and message") && data.data && data.data.recipient) {
            // Message was actually sent successfully, so display a success message instead
            let messageContent = `<p>Message sent to ${data.data.recipient.name}: "${data.data.messageContent}"</p>`;
            
            messageContent += `
                <div class="message-recipient">
                    <div class="recipient-avatar">
                        ${data.data.recipient.avatar ? 
                            `<img src="${data.data.recipient.avatar}" alt="${data.data.recipient.name}">` :
                            data.data.recipient.name.charAt(0).toUpperCase()
                        }
                    </div>
                    <div class="recipient-name">${data.data.recipient.name}</div>
                </div>
            `;
            
            addMessageToChat('ai', messageContent, true);
            return;
        }
        
        let messageContent = `<p>${data.message}</p>`;
        
        // Add additional content based on action type
        if (data.action === 'search' && data.data && data.data.users && data.data.users.length > 0) {
            messageContent += `
                <div class="user-cards">
                    ${data.data.users.map(user => `
                        <div class="user-card" onclick="window.location.href='/profile/${user.slug}'">
                            <div class="user-card-avatar">
                                ${user.avatar ? 
                                    `<img src="${user.avatar}" alt="${user.name}">` :
                                    user.name.charAt(0).toUpperCase()
                                }
                            </div>
                            <div class="user-card-name">${user.name}</div>
                            <div class="user-card-title">${user.title || ''}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (data.action === 'connect' && data.data && data.data.users && data.data.users.length > 0) {
            messageContent += `
                <div class="user-cards">
                    ${data.data.users.map(user => `
                        <div class="user-card">
                            <div class="user-card-avatar">
                                ${user.avatar ? 
                                    `<img src="${user.avatar}" alt="${user.name}">` :
                                    user.name.charAt(0).toUpperCase()
                                }
                            </div>
                            <div class="user-card-name">${user.name}</div>
                            <div class="user-card-title">${user.title || ''}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (data.action === 'message' && data.data && data.data.recipient) {
            messageContent += `
                <div class="message-recipient">
                    <div class="recipient-avatar">
                        ${data.data.recipient.avatar ? 
                            `<img src="${data.data.recipient.avatar}" alt="${data.data.recipient.name}">` :
                            data.data.recipient.name.charAt(0).toUpperCase()
                        }
                    </div>
                    <div class="recipient-name">${data.data.recipient.name}</div>
                </div>
            `;
        } else if (data.action === 'profile' && data.data && data.data.user) {
            const user = data.data.user;
            messageContent += `
                <div class="profile-card">
                    <div class="profile-header">
                        <div class="profile-avatar">
                            ${user.avatar ? 
                                `<img src="${user.avatar}" alt="${user.name}">` :
                                `<div class="avatar-placeholder">${user.name.charAt(0).toUpperCase()}</div>`
                            }
                        </div>
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
                    </div>
                </div>
            `;
        }
        
        addMessageToChat('ai', messageContent, true);
    }
    
    /**
     * Add message to chat
     * @param {string} sender - 'user' or 'ai'
     * @param {string} content - The message content
     * @param {boolean} isHTML - Whether the content is HTML
     * @param {Array} images - Array of image data URLs
     */
    function addMessageToChat(sender, content, isHTML = false, images = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = sender === 'user' ? 'user-message' : 'ai-message';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = sender === 'user' ? 'user-avatar' : 'ai-avatar';
        
        if (sender === 'user') {
            avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
        } else {
            avatarDiv.innerHTML = '<i class="fas fa-robot"></i>';
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (isHTML) {
            contentDiv.innerHTML = content;
        } else {
            // Convert plain text to HTML with line breaks
            contentDiv.innerHTML = content.replace(/\n/g, '<br>');
        }
        
        // Add images if any
        if (images && images.length > 0) {
            images.forEach(imageUrl => {
                const img = document.createElement('img');
                img.className = 'message-image';
                img.src = imageUrl;
                img.addEventListener('click', () => showImageModal(imageUrl));
                contentDiv.appendChild(img);
            });
        }
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Add to chat history
        chatHistory.push({
            sender,
            content,
            isHTML,
            images,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Create image modal for fullscreen view
     */
    function createImageModal() {
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.id = 'image-modal';
        
        const modalImg = document.createElement('img');
        modalImg.className = 'modal-image';
        modalImg.id = 'modal-image';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-modal';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', hideImageModal);
        
        modal.appendChild(modalImg);
        modal.appendChild(closeBtn);
        document.body.appendChild(modal);
        
        // Close modal when clicking outside the image
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideImageModal();
            }
        });
    }
    
    /**
     * Show image modal with the selected image
     * @param {string} imageUrl - The image URL
     */
    function showImageModal(imageUrl) {
        const modal = document.getElementById('image-modal');
        const modalImg = document.getElementById('modal-image');
        
        modalImg.src = imageUrl;
        modal.style.display = 'flex';
        
        // Prevent scrolling on body
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Hide image modal
     */
    function hideImageModal() {
        const modal = document.getElementById('image-modal');
        modal.style.display = 'none';
        
        // Restore scrolling on body
        document.body.style.overflow = 'auto';
    }
    
    /**
     * Show loading indicator
     */
    function showLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'ai-message loading-message';
        loadingDiv.innerHTML = `
            <div class="ai-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="loading-spinner">
                <div class="spinner"></div>
                <div class="loading-text">Processing your request...</div>
            </div>
        `;
        
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    /**
     * Remove loading indicator
     */
    function removeLoadingIndicator() {
        const loadingMessage = document.querySelector('.loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }
    
    /**
     * Show command suggestions
     * @param {string} command - The command text
     */
    function showCommandSuggestions(command) {
        // Filter suggestions based on command
        const suggestions = getFilteredSuggestions(command);
        
        if (suggestions.length === 0) {
            hideCommandSuggestions();
            return;
        }
        
        // Clear previous suggestions
        suggestionsContent.innerHTML = '';
        
        // Add header
        const header = document.createElement('h4');
        header.textContent = command.length > 0 ? 'Matching commands:' : 'Available commands:';
        suggestionsContent.appendChild(header);
        
        // Create command list container
        const commandList = document.createElement('div');
        commandList.className = 'command-list';
        
        // Add each suggestion as a clickable item
        suggestions.forEach(suggestion => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'command-item';
            suggestionItem.textContent = suggestion;
            
            // Add click event to insert the command
            suggestionItem.addEventListener('click', () => {
                // Replace the command in the input
                const inputValue = chatInput.value;
                const lastAtIndex = inputValue.lastIndexOf('@');
                chatInput.value = inputValue.substring(0, lastAtIndex) + '@' + suggestion;
                chatInput.focus();
                hideCommandSuggestions();
            });
            
            commandList.appendChild(suggestionItem);
        });
        
        suggestionsContent.appendChild(commandList);
        
        // Show suggestions container
        commandSuggestions.style.display = 'block';
    }
    
    /**
     * Hide command suggestions
     */
    function hideCommandSuggestions() {
        commandSuggestions.style.display = 'none';
    }
    
    /**
     * Get filtered command suggestions
     * @param {string} command - The command text
     * @returns {Array} - Filtered suggestions
     */
    function getFilteredSuggestions(command) {
        const allSuggestions = [
            'generate bio about [theme]',
            'create post about [topic]',
            'bio about [theme] and post on [topic]',
            'update my bio with [text]',
            'refresh my bio',
            'send a message to [name] saying "[message]"',
            'show me profiles of investor',
            'show me profiles of founder',
            'show me profiles of developer',
            'connect me with [name]',
            'connect me with investor',
            'connect me with founder',
            'send connection request to [name]',
            'search [query]',
            'profile of [name]',
            'show [name] profile',
            '[name]'
        ];
        
        // If command is empty, return all suggestions
        if (!command || command.trim() === '') {
            return allSuggestions;
        }
        
        // Filter suggestions based on command
        return allSuggestions.filter(suggestion => 
            suggestion.toLowerCase().includes(command.toLowerCase()));
    }
    
    /**
     * Clear chat history
     */
    function clearChat() {
        if (confirm('Are you sure you want to clear the chat history?')) {
            chatMessages.innerHTML = '';
            
            // Add welcome message
            addMessageToChat('ai', `
                <p>Hello! I'm your AI assistant. You can ask me questions or use @commands for specific actions.</p>
                <p>Try these commands:</p>
                <ul>
                    <li><strong>@send a message to [name]</strong> saying "[message]"</li>
                    <li><strong>@show me profiles of [role]</strong> (e.g., investor, founder)</li>
                    <li><strong>@connect me with [name/role]</strong></li>
                    <li><strong>@search [query]</strong> to search for profiles, posts, and content</li>
                    <li><strong>@[name]</strong> to view a founder's profile</li>
                </ul>
            `, true);
            
            // Clear chat history
            chatHistory = [];
            saveChatHistory();
        }
    }
    
    /**
     * Save chat history to localStorage
     */
    function saveChatHistory() {
        localStorage.setItem('aiChatHistory', JSON.stringify(chatHistory));
    }
    
    /**
     * Load chat history from localStorage
     */
    function loadChatHistory() {
        const savedHistory = localStorage.getItem('aiChatHistory');
        
        if (savedHistory) {
            try {
                chatHistory = JSON.parse(savedHistory);
                
                // Display chat history
                chatHistory.forEach(message => {
                    addMessageToChat(message.sender, message.content, message.isHTML, message.images || []);
                });
            } catch (error) {
                console.error('Error loading chat history:', error);
                localStorage.removeItem('aiChatHistory');
            }
        }
    }
});