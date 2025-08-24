/**
 * Networking Automation Client-side Script
 * Handles UI interactions for AI-powered connection suggestions
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the connection suggestions component
    initializeConnectionSuggestions();
    
    // Add event listeners to connection buttons
    addConnectionButtonListeners();
});

/**
 * Initialize the connection suggestions component
 */
function initializeConnectionSuggestions() {
    // Get the AI suggestions container
    const aiSuggestionsContainer = document.getElementById('ai-connection-suggestions');
    
    if (!aiSuggestionsContainer) return;
    
    // Fetch AI-powered connection suggestions
    fetchAISuggestions();
}

/**
 * Fetch AI-powered connection suggestions from the server
 */
function fetchAISuggestions() {
    fetch('/api/networking/suggestions')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.suggestions.length > 0) {
                renderAISuggestions(data.suggestions);
            }
        })
        .catch(error => {
            console.error('Error fetching AI suggestions:', error);
        });
}

/**
 * Render AI-powered connection suggestions
 * @param {Array} suggestions - Array of suggested connections
 */
function renderAISuggestions(suggestions) {
    const container = document.getElementById('ai-suggestions-list');
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Render each suggestion
    suggestions.forEach(suggestion => {
        const suggestionElement = createSuggestionElement(suggestion);
        container.appendChild(suggestionElement);
    });
}

/**
 * Create a suggestion element
 * @param {Object} suggestion - Suggestion data
 * @returns {HTMLElement} - The suggestion element
 */
function createSuggestionElement(suggestion) {
    const item = document.createElement('div');
    item.className = 'connection-item';
    item.dataset.userId = suggestion.userId;
    item.dataset.relevanceScore = suggestion.relevanceScore;
    
    // Create avatar
    const avatar = document.createElement('div');
    avatar.className = 'connection-avatar';
    
    if (suggestion.avatar) {
        const img = document.createElement('img');
        img.src = suggestion.avatar;
        img.alt = suggestion.name;
        img.style = 'width:32px;height:32px;border-radius:50%;object-fit:cover;';
        avatar.appendChild(img);
    } else {
        avatar.textContent = suggestion.name ? suggestion.name.charAt(0) : '?';
    }
    
    // Create info container
    const info = document.createElement('div');
    info.className = 'connection-info';
    
    // Create name
    const name = document.createElement('div');
    name.className = 'connection-name';
    name.textContent = suggestion.name;
    
    // Create role
    const role = document.createElement('div');
    role.className = 'connection-role';
    role.textContent = suggestion.title || suggestion.role;
    
    // Create reason
    const reason = document.createElement('div');
    reason.className = 'connection-reason';
    reason.textContent = suggestion.reason;
    reason.style = 'font-size: 0.7rem; color: #666; margin-top: 2px;';
    
    // Add name and role to info
    info.appendChild(name);
    info.appendChild(role);
    info.appendChild(reason);
    
    // Create connect button
    const connectBtn = document.createElement('button');
    connectBtn.className = 'connection-button ai-connect-btn';
    connectBtn.textContent = 'Connect';
    connectBtn.dataset.userId = suggestion.userId;
    connectBtn.dataset.messageTemplate = suggestion.messageTemplate;
    
    // Add all elements to item
    item.appendChild(avatar);
    item.appendChild(info);
    item.appendChild(connectBtn);
    
    return item;
}

/**
 * Add event listeners to connection buttons
 */
function addConnectionButtonListeners() {
    // Use event delegation for dynamically added buttons
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('ai-connect-btn')) {
            const userId = event.target.dataset.userId;
            const messageTemplate = event.target.dataset.messageTemplate;
            
            // Show connection confirmation modal with AI-generated message
            showConnectionModal(userId, messageTemplate);
        }
    });
}

/**
 * Show connection confirmation modal with AI-generated message
 * @param {string} userId - The user ID to connect with
 * @param {string} messageTemplate - The AI-generated message template
 */
function showConnectionModal(userId, messageTemplate) {
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'connection-modal';
    modal.style = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'connection-modal-content';
    modalContent.style = 'background-color: white; padding: 20px; border-radius: 8px; width: 90%; max-width: 500px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);';
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'connection-modal-header';
    modalHeader.style = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;';
    
    const modalTitle = document.createElement('h3');
    modalTitle.textContent = 'Send Connection Request';
    modalTitle.style = 'margin: 0; font-size: 1.2rem;';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style = 'background: none; border: none; font-size: 1.5rem; cursor: pointer;';
    closeBtn.onclick = function() {
        document.body.removeChild(modal);
    };
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeBtn);
    
    // Create message textarea
    const messageLabel = document.createElement('label');
    messageLabel.textContent = 'Personalized Message:';
    messageLabel.style = 'display: block; margin-bottom: 5px; font-weight: 500;';
    
    const messageTextarea = document.createElement('textarea');
    messageTextarea.value = messageTemplate;
    messageTextarea.style = 'width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; min-height: 100px; margin-bottom: 15px; font-size: 0.9rem;';
    
    // Create action buttons
    const actionBtns = document.createElement('div');
    actionBtns.style = 'display: flex; justify-content: flex-end; gap: 10px;';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style = 'padding: 8px 15px; border: 1px solid #ddd; background-color: white; border-radius: 4px; cursor: pointer;';
    cancelBtn.onclick = function() {
        document.body.removeChild(modal);
    };
    
    const sendBtn = document.createElement('button');
    sendBtn.textContent = 'Send Request';
    sendBtn.style = 'padding: 8px 15px; background-color: #1E88E5; color: white; border: none; border-radius: 4px; cursor: pointer;';
    sendBtn.onclick = function() {
        sendConnectionRequest(userId, messageTextarea.value);
        document.body.removeChild(modal);
    };
    
    actionBtns.appendChild(cancelBtn);
    actionBtns.appendChild(sendBtn);
    
    // Assemble modal content
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(messageLabel);
    modalContent.appendChild(messageTextarea);
    modalContent.appendChild(actionBtns);
    
    // Add modal content to modal
    modal.appendChild(modalContent);
    
    // Add modal to body
    document.body.appendChild(modal);
}

/**
 * Send connection request with personalized message
 * @param {string} userId - The user ID to connect with
 * @param {string} message - The personalized message
 */
function sendConnectionRequest(userId, message) {
    fetch('/api/networking/connect', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: userId,
            message: message
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success notification
            showNotification('Connection request sent successfully!', 'success');
            
            // Remove the suggestion from the list
            const suggestionElement = document.querySelector(`.connection-item[data-user-id="${userId}"]`);
            if (suggestionElement) {
                suggestionElement.remove();
            }
        } else {
            showNotification('Failed to send connection request. Please try again.', 'error');
        }
    })
    .catch(error => {
        console.error('Error sending connection request:', error);
        showNotification('An error occurred. Please try again.', 'error');
    });
}

/**
 * Show notification
 * @param {string} message - The notification message
 * @param {string} type - The notification type (success, error, info)
 */
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 4px;
        color: white;
        font-size: 0.9rem;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
        ${type === 'success' ? 'background-color: #4CAF50;' : ''}
        ${type === 'error' ? 'background-color: #F44336;' : ''}
        ${type === 'info' ? 'background-color: #2196F3;' : ''}
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    
    // Hide and remove notification after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}