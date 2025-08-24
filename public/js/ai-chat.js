/**
 * AI Chat Feature
 * Provides intelligent chat capabilities when user types '@'
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the AI Chat feature
    initAIChat();
});

function initAIChat() {
    // Find all message input fields across the site
    const messageInputs = document.querySelectorAll('.message-input, #message-input, textarea[name="message"]');
    
    if (messageInputs.length === 0) {
        console.log('No message inputs found on this page');
        return;
    }
    
    console.log('Initializing AI Chat for', messageInputs.length, 'input fields');
    
    // Create AI chat container if it doesn't exist
    let aiChatContainer = document.getElementById('ai-chat-container');
    if (!aiChatContainer) {
        aiChatContainer = createAIChatContainer();
        document.body.appendChild(aiChatContainer);
    }
    
    // Add event listeners to all message inputs
    messageInputs.forEach(input => {
        // Store original placeholder
        const originalPlaceholder = input.placeholder || 'Type a message...';
        
        // Add event listeners
        input.addEventListener('input', function(e) {
            handleInputChange(e, this, aiChatContainer, originalPlaceholder);
        });
        
        input.addEventListener('keydown', function(e) {
            handleKeyDown(e, this, aiChatContainer);
        });
        
        input.addEventListener('blur', function() {
            // Small delay to allow for clicks on the AI chat container
            setTimeout(() => {
                if (!aiChatContainer.contains(document.activeElement)) {
                    hideAIChat(aiChatContainer);
                    this.placeholder = originalPlaceholder;
                }
            }, 200);
        });
    });
    
    // Close AI chat when clicking outside
    document.addEventListener('click', function(e) {
        if (!aiChatContainer.contains(e.target) && 
            !Array.from(messageInputs).some(input => input.contains(e.target))) {
            hideAIChat(aiChatContainer);
        }
    });
}

/**
 * Create the AI chat container element
 * @returns {HTMLElement} The AI chat container
 */
function createAIChatContainer() {
    const container = document.createElement('div');
    container.id = 'ai-chat-container';
    container.className = 'ai-chat-container';
    container.style.display = 'none';
    
    // Add AI chat header
    const header = document.createElement('div');
    header.className = 'ai-chat-header';
    header.innerHTML = `
        <div class="ai-chat-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="ai-chat-title">AI Assistant</div>
    `;
    container.appendChild(header);
    
    // Add AI chat content
    const content = document.createElement('div');
    content.className = 'ai-chat-content';
    content.innerHTML = `
        <div class="ai-chat-intro">
            <p>Type <strong>@</strong> followed by your command:</p>
            <ul>
                <li><strong>@send a message to [name]</strong> saying "[message]"</li>
                <li><strong>@show me profiles of [role]</strong> (e.g., investor, founder)</li>
                <li><strong>@connect me with [name/role]</strong></li>
                <li><strong>@[name]</strong> to view a founder's profile</li>
            </ul>
        </div>
    `;
    container.appendChild(content);
    
    // Add AI chat results area
    const results = document.createElement('div');
    results.className = 'ai-chat-results';
    results.style.display = 'none';
    container.appendChild(results);
    
    // Add styles
    addAIChatStyles();
    
    return container;
}

/**
 * Add CSS styles for AI chat
 */
function addAIChatStyles() {
    if (document.getElementById('ai-chat-styles')) return;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'ai-chat-styles';
    styleSheet.textContent = `
        .ai-chat-container {
            position: absolute;
            width: 320px;
            max-height: 400px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        
        .ai-chat-header {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            background-color: #4a6cf7;
            color: white;
        }
        
        .ai-chat-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
        }
        
        .ai-chat-title {
            font-weight: 600;
            font-size: 16px;
        }
        
        .ai-chat-content {
            padding: 16px;
            overflow-y: auto;
            flex: 1;
        }
        
        .ai-chat-intro p {
            margin-bottom: 12px;
            color: #333;
        }
        
        .ai-chat-intro ul {
            padding-left: 20px;
            margin-bottom: 0;
        }
        
        .ai-chat-intro li {
            margin-bottom: 8px;
            color: #555;
            font-size: 14px;
        }
        
        .ai-chat-results {
            padding: 16px;
            border-top: 1px solid #eee;
            max-height: 250px;
            overflow-y: auto;
        }
        
        .ai-chat-message {
            padding: 12px;
            background-color: #f5f8ff;
            border-radius: 8px;
            margin-bottom: 16px;
        }
        
        .ai-chat-message-header {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .ai-chat-message-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background-color: #4a6cf7;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            margin-right: 8px;
        }
        
        .ai-chat-message-name {
            font-weight: 600;
            font-size: 14px;
        }
        
        .ai-chat-message-content {
            font-size: 14px;
            color: #333;
        }
        
        .ai-chat-user-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 12px;
            margin-top: 12px;
        }
        
        .ai-chat-user-card {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .ai-chat-user-card:hover {
            background-color: #f0f0f0;
        }
        
        .ai-chat-user-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background-color: #ddd;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 8px;
            overflow: hidden;
        }
        
        .ai-chat-user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .ai-chat-user-name {
            font-weight: 600;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .ai-chat-user-title {
            font-size: 12px;
            color: #666;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .ai-chat-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .ai-chat-spinner {
            width: 24px;
            height: 24px;
            border: 3px solid rgba(74, 108, 247, 0.2);
            border-radius: 50%;
            border-top-color: #4a6cf7;
            animation: ai-chat-spin 1s linear infinite;
        }
        
        @keyframes ai-chat-spin {
            to { transform: rotate(360deg); }
        }
        
        /* Command list styles */
        .command-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }
        
        .command-item {
            background-color: white;
            border: 1px solid #dee2e6;
            border-radius: 15px;
            padding: 8px 12px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s ease;
            color: #4a6cf7;
            font-weight: 500;
        }
        
        .command-item:hover {
            background-color: #4a6cf7;
            color: white;
            border-color: #4a6cf7;
            transform: translateY(-2px);
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
    `;
    
    document.head.appendChild(styleSheet);
}

/**
 * Handle input change event
 * @param {Event} e - The input event
 * @param {HTMLElement} input - The input element
 * @param {HTMLElement} container - The AI chat container
 * @param {string} originalPlaceholder - The original input placeholder
 */
function handleInputChange(e, input, container, originalPlaceholder) {
    const value = input.value;
    const lastAtIndex = value.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && (lastAtIndex === 0 || value[lastAtIndex - 1] === ' ')) {
        // Position the container below the input
        positionContainer(container, input);
        
        // Show the container
        showAIChat(container);
        
        // Update placeholder
        input.placeholder = 'Type @ followed by your command...';
        
        // Show command suggestions immediately when @ is typed
        const command = value.substring(lastAtIndex + 1).trim();
        showSuggestions(container, command);
        
        // Check for @ mentions of founders
        const mentionMatch = value.match(/@([\w\s]+)/g);
        if (mentionMatch) {
            // Process each mention
            mentionMatch.forEach(mention => {
                const founderName = mention.substring(1).trim();
                if (founderName.length > 0) {
                    // Process the founder profile request
                    processFounderProfileRequest(founderName, container);
                }
            });
        }
    } else {
        // Hide the container if there's no @ symbol
        hideAIChat(container);
        input.placeholder = originalPlaceholder;
    }
}

/**
 * Handle keydown event
 * @param {Event} e - The keydown event
 * @param {HTMLElement} input - The input element
 * @param {HTMLElement} container - The AI chat container
 */
function handleKeyDown(e, input, container) {
    // If Enter is pressed and the AI chat is visible, process the command
    if (e.key === 'Enter' && !e.shiftKey && container.style.display !== 'none') {
        e.preventDefault();
        
        const value = input.value;
        const atIndex = value.indexOf('@');
        
        if (atIndex !== -1) {
            const command = value.substring(atIndex);
            processAICommand(command, input, container);
        }
    }
    
    // If Escape is pressed, hide the AI chat
    if (e.key === 'Escape') {
        hideAIChat(container);
    }
}

/**
 * Position the AI chat container below the input
 * @param {HTMLElement} container - The AI chat container
 * @param {HTMLElement} input - The input element
 */
function positionContainer(container, input) {
    const rect = input.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    container.style.top = (rect.bottom + scrollTop) + 'px';
    container.style.left = (rect.left + scrollLeft) + 'px';
    
    // Ensure the container doesn't go off-screen
    const containerRect = container.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    
    if (containerRect.right > viewportWidth) {
        container.style.left = (viewportWidth - containerRect.width - 10 + scrollLeft) + 'px';
    }
}

/**
 * Show the AI chat container
 * @param {HTMLElement} container - The AI chat container
 */
function showAIChat(container) {
    container.style.display = 'flex';
    
    // Show intro content, hide results
    const content = container.querySelector('.ai-chat-content');
    const results = container.querySelector('.ai-chat-results');
    
    if (content && results) {
        content.style.display = 'block';
        results.style.display = 'none';
    }
}

/**
 * Hide the AI chat container
 * @param {HTMLElement} container - The AI chat container
 */
function hideAIChat(container) {
    container.style.display = 'none';
}

/**
 * Process a founder profile request when a user mentions a founder with @
 * @param {string} founderName - The name of the founder
 * @param {HTMLElement} container - The AI chat container
 */
function processFounderProfileRequest(founderName, container) {
    // Show loading indicator
    const results = container.querySelector('.ai-chat-results');
    results.innerHTML = `
        <div class="ai-chat-loading">
            <div class="ai-chat-spinner"></div>
            <p>Looking up profile...</p>
        </div>
    `;
    
    // Format the command for the server
    const command = `@profile of ${founderName}`;
    
    // Send request to server
    fetch('/api/ai-chat/process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Clear loading indicator
        results.innerHTML = '';
        
        // Display the profile information
        if (data.action === 'profile' && data.data && data.data.user) {
            const user = data.data.user;
            
            // Create profile card
            const profileCard = document.createElement('div');
            profileCard.className = 'ai-chat-message';
            profileCard.innerHTML = `
                <div class="ai-chat-message-content">
                    <p>${data.message}</p>
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
                </div>
            `;
            
            results.appendChild(profileCard);
        } else {
            // Display error or not found message
            const messageElement = document.createElement('div');
            messageElement.className = 'ai-chat-message';
            messageElement.innerHTML = `
                <div class="ai-chat-message-content">
                    <p>${data.message || "Couldn't find that profile. Please try again."}</p>
                </div>
            `;
            
            results.appendChild(messageElement);
        }
        
        // Show the container
        showAIChat(container);
    })
    .catch(error => {
        console.error('Error processing founder profile request:', error);
        
        // Display error message
        results.innerHTML = `
            <div class="ai-chat-message" style="background-color: #fff2f2;">
                <div class="ai-chat-message-content">
                    <p>Sorry, I couldn't retrieve that profile. Please try again later.</p>
                </div>
            </div>
        `;
    });
}

/**
 * Show loading indicator
 * @param {HTMLElement} container - The AI chat container
 */
function showLoading(container) {
    const results = container.querySelector('.ai-chat-results');
    if (!results) return;
    
    results.style.display = 'block';
    results.innerHTML = `
        <div class="ai-chat-loading">
            <div class="ai-chat-spinner"></div>
        </div>
    `;
    
    // Hide the intro content
    const content = container.querySelector('.ai-chat-content');
    if (content) {
        content.style.display = 'none';
    }
}

/**
 * Show suggestions based on the command
 * @param {HTMLElement} container - The AI chat container
 * @param {string} command - The command text
 */
function showSuggestions(container, command) {
    const results = container.querySelector('.ai-chat-results');
    if (!results) return;
    
    // Define all available commands
    const allCommands = [
        '@generate bio about [theme]',
        '@create post about [topic]',
        '@bio about [theme] and post on [topic]',
        '@update my bio with [text]',
        '@refresh my bio',
        '@send a message to [name] saying "[message]"',
        '@show me profiles of [role]',
        '@connect me with [name/role]',
        '@profile of [name]',
        '@show [name] profile'
    ];
    
    // Filter commands based on user input
    const filteredCommands = command.length > 0 ?
        allCommands.filter(cmd => cmd.toLowerCase().includes(command.toLowerCase())) :
        allCommands;
    
    // Create HTML for command suggestions
    const commandItems = filteredCommands.map(cmd => `<div class="command-item">${cmd}</div>`).join('');
    
    results.innerHTML = `
        <div class="ai-chat-message">
            <div class="ai-chat-message-content">
                <p>${command.length > 0 ? 'Matching commands:' : 'Available commands:'}</p>
                <div class="command-list">
                    ${commandItems}
                </div>
            </div>
        </div>
    `;
    
    // Add click event to command items
    const commandElements = results.querySelectorAll('.command-item');
    commandElements.forEach(element => {
        element.addEventListener('click', function() {
            // Get the input element
            const inputs = document.querySelectorAll('.message-input, #message-input, textarea[name="message"]');
            const input = Array.from(inputs).find(input => input === document.activeElement) || inputs[0];
            
            if (input) {
                // Replace the current command with the selected one
                const value = input.value;
                const lastAtIndex = value.lastIndexOf('@');
                input.value = value.substring(0, lastAtIndex) + this.textContent;
                input.focus();
            }
        });
    });
    
    results.style.display = 'block';
    
    // Hide the intro content
    const content = container.querySelector('.ai-chat-content');
    if (content) {
        content.style.display = 'none';
    }
}

/**
 * Process AI command
 * @param {string} command - The command text
 * @param {HTMLElement} input - The input element
 * @param {HTMLElement} container - The AI chat container
 */
function processAICommand(command, input, container) {
    // Show loading indicator
    showLoading(container);
    
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
        if (data.success) {
            // Display the result based on the action type
            displayAIResult(container, data);
            
            // Clear the input
            input.value = '';
            
            // Handle specific actions for bio and post generation
            if (data.action === 'bio_updated') {
                // Show success message for bio update
                showNotification('Bio updated successfully!', 'success');
            } else if (data.action === 'post_created') {
                // Show success message for post creation
                showNotification('Post created successfully!', 'success');
            } else if (data.action === 'bio_and_post_created') {
                // Show success message for both bio and post
                showNotification('Bio and post created successfully!', 'success');
            }
        } else {
            // Show error message
            showErrorMessage(container, data.message || 'An error occurred');
        }
    })
    .catch(error => {
        console.error('Error processing AI command:', error);
        showErrorMessage(container, 'An error occurred while processing your command');
    });
}

/**
 * Show notification
 * @param {string} message - The notification message
 * @param {string} type - The notification type (info, success, error)
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}

/**
 * Display AI result
 * @param {HTMLElement} container - The AI chat container
 * @param {Object} data - The result data
 */
function displayAIResult(container, data) {
    const results = container.querySelector('.ai-chat-results');
    if (!results) return;
    
    let html = `
        <div class="ai-chat-message">
            <div class="ai-chat-message-content">
                <p>${data.message}</p>
            </div>
        </div>
    `;
    
    // Add additional content based on action type
    if (data.action === 'search' && data.data && data.data.users && data.data.users.length > 0) {
        html += `
            <div class="ai-chat-user-list">
                ${data.data.users.map(user => `
                    <div class="ai-chat-user-card" onclick="window.location.href='/profile/${user.slug}'">
                        <div class="ai-chat-user-avatar">
                            ${user.avatar ? 
                                `<img src="${user.avatar}" alt="${user.name}">` :
                                user.name.charAt(0).toUpperCase()
                            }
                        </div>
                        <div class="ai-chat-user-name">${user.name}</div>
                        <div class="ai-chat-user-title">${user.title || ''}</div>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (data.action === 'connect' && data.data && data.data.users && data.data.users.length > 0) {
        html += `
            <div class="ai-chat-user-list">
                ${data.data.users.map(user => `
                    <div class="ai-chat-user-card">
                        <div class="ai-chat-user-avatar">
                            ${user.avatar ? 
                                `<img src="${user.avatar}" alt="${user.name}">` :
                                user.name.charAt(0).toUpperCase()
                            }
                        </div>
                        <div class="ai-chat-user-name">${user.name}</div>
                        <div class="ai-chat-user-title">${user.title || ''}</div>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (data.action === 'message' && data.data && data.data.recipient) {
        html += `
            <div class="ai-chat-message-header">
                <div class="ai-chat-message-avatar">
                    ${data.data.recipient.avatar ? 
                        `<img src="${data.data.recipient.avatar}" alt="${data.data.recipient.name}">` :
                        data.data.recipient.name.charAt(0).toUpperCase()
                    }
                </div>
                <div class="ai-chat-message-name">${data.data.recipient.name}</div>
            </div>
        `;
    }
    
    results.innerHTML = html;
    results.style.display = 'block';
    
    // Hide the intro content
    const content = container.querySelector('.ai-chat-content');
    if (content) {
        content.style.display = 'none';
    }
}

/**
 * Show error message
 * @param {HTMLElement} container - The AI chat container
 * @param {string} message - The error message
 */
function showErrorMessage(container, message) {
    const results = container.querySelector('.ai-chat-results');
    if (!results) return;
    
    results.innerHTML = `
        <div class="ai-chat-message" style="background-color: #fff2f2;">
            <div class="ai-chat-message-content">
                <p>${message}</p>
            </div>
        </div>
    `;
    
    results.style.display = 'block';
    
    // Hide the intro content
    const content = container.querySelector('.ai-chat-content');
    if (content) {
        content.style.display = 'none';
    }
}

/**
 * Call the backend market research API and display results in the AI chat modal
 */
async function fetchMarketResearchResults(query) {
    try {
        const response = await fetch('/api/market-research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const result = await response.json();
        if (result.success && result.data) {
            displayMarketResearchResults(result.data);
        } else {
            displayMarketResearchResults({ error: result.message || 'No results found.' });
        }
    } catch (err) {
        displayMarketResearchResults({ error: 'Error fetching market research results.' });
    }
}

function displayMarketResearchResults(data) {
    const resultsContainer = document.querySelector('.ai-chat-results');
    if (!resultsContainer) return;
    resultsContainer.style.display = 'block';
    let html = '';
    
    if (data.error) {
        html = `<div class="ai-chat-message">${data.error}</div>`;
    } else if (data.title && data.emails && Array.isArray(data.emails)) {
        // Format for fintech investor emails
        html = `<div class="ai-chat-message">
            <h3 style="margin-top: 0; color: #4a6cf7;">${data.title}</h3>
            <ul style="padding-left: 20px; margin-bottom: 0;">
                ${data.emails.map(item => 
                    `<li style="margin-bottom: 8px;">
                        <strong>${item.email}</strong> 
                        <span style="color: #666; font-size: 13px;">(Source: <a href="${item.source}" target="_blank">${item.source}</a>)</span>
                    </li>`
                ).join('')}
            </ul>
        </div>`;
    } else if (Array.isArray(data)) {
        // Default format for other market research results
        html = data.map(item => `<div class="ai-chat-message"><strong>Email:</strong> ${item.email}<br><strong>Source:</strong> ${item.source_title}<br><a href="${item.source_link}" target="_blank">Link</a><br><em>${item.context}</em></div>`).join('');
    } else {
        html = `<div class="ai-chat-message">${JSON.stringify(data)}</div>`;
    }
    
    resultsContainer.innerHTML = html;
    
    // Hide the intro content
    const content = document.querySelector('.ai-chat-content');
    if (content) {
        content.style.display = 'none';
    }
}

// Example: Hook up to a button or input event
window.triggerMarketResearch = function(query) {
    fetchMarketResearchResults(query);
};
then(res => res.json())
.then(data => {
  // Render results in your chat or research assistant UI
});