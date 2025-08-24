/**
 * connection.js
 * Handles connection functionality between users on profile pages
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a profile page
    const connectButton = document.getElementById('connect-button');
    const profileUserId = document.getElementById('profile-user-id')?.value;
    
    // Get current user ID from various possible sources
    // 1. From global variable set in the template
    // 2. From hidden input field with id 'user-id'
    // 3. From hidden input field with id 'current-user-id'
    const currentUserId = window.currentUserId || 
                         document.getElementById('user-id')?.value || 
                         document.getElementById('current-user-id')?.value;
    
    // Initialize Socket.IO for real-time connection updates
    if (currentUserId) {
        console.log('Initializing Socket.IO with currentUserId:', currentUserId);
        initializeSocketForConnections(currentUserId, profileUserId);
    } else {
        console.warn('No currentUserId found for Socket.IO initialization');
    }
    
    // If connect button exists and we're viewing someone else's profile
    if (connectButton && profileUserId) {
        // Add click event listener to connect button
        connectButton.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            const status = this.getAttribute('data-status');
            
            // Handle different actions based on current status
            if (action === 'connect') {
                handleConnectionAction(profileUserId, 'connect');
            } else if (action === 'disconnect') {
                // Confirm before disconnecting
                if (confirm('Are you sure you want to remove this connection?')) {
                    handleConnectionAction(profileUserId, 'disconnect');
                }
            } else if (action === 'cancel') {
                // Confirm before canceling request
                if (confirm('Are you sure you want to cancel your connection request?')) {
                    handleConnectionAction(profileUserId, 'cancel');
                }
            } else if (action === 'respond') {
                // Show accept/reject options
                showConnectionResponseOptions(profileUserId);
            }
        });
        
        // Load connection status on page load
        loadConnectionStatus(profileUserId);
    }
    
    // Load connections in the connections tab if it exists
    loadConnections();
});

/**
 * Initialize Socket.IO for real-time connection updates
 */
function initializeSocketForConnections(currentUserId) {
    if (!currentUserId) {
        console.log('Current user ID not available for socket registration.');
        return;
    }

    // Connect to Socket.IO server if not already connected
    if (!window.socket || !window.socket.connected) {
        window.socket = io(); // Assumes Socket.IO client is loaded globally

        window.socket.on('connect', () => {
            console.log('Connected to Socket.IO server for connections.');
            // Register user with their userId
            window.socket.emit('registerUser', currentUserId);
            console.log('Sent registerUser event with userId:', currentUserId);
        });

        // Listen for connection updates
        window.socket.on('connection_update', (data) => {
            console.log('Received connection update:', data);
            
            // Update connection count in the UI
            if (data.connectionCount !== undefined) {
                updateConnectionCount(data.connectionCount);
            }
            
            // If we're on a profile page and the update is from the profile user
            const profileUserId = document.getElementById('profile-user-id')?.value;
            if (profileUserId && data.fromUserId === profileUserId) {
                // Reload connection status to update the UI
                loadConnectionStatus(profileUserId);
            }
            
            // Show notification based on update type
            if (data.type === 'accepted') {
                showNotification('Connection Accepted', 'Your connection request has been accepted!', 'success');
            } else if (data.type === 'removed') {
                showNotification('Connection Removed', 'A connection has been removed.', 'info');
            }
        });
    }
}

/**
 * Shows connection response options (accept/reject) when a user has a pending request
 */
function showConnectionResponseOptions(targetUserId) {
    // Create a dropdown menu for response options
    const connectButton = document.getElementById('connect-button');
    const responseMenu = document.createElement('div');
    responseMenu.className = 'connection-response-menu';
    responseMenu.innerHTML = `
        <div class="response-option accept" data-action="accept">
            <i class="fas fa-check"></i> Accept
        </div>
        <div class="response-option reject" data-action="reject">
            <i class="fas fa-times"></i> Reject
        </div>
    `;
    
    // Position the menu below the connect button
    const buttonRect = connectButton.getBoundingClientRect();
    responseMenu.style.position = 'absolute';
    responseMenu.style.top = `${buttonRect.bottom + window.scrollY}px`;
    responseMenu.style.left = `${buttonRect.left + window.scrollX}px`;
    
    // Add the menu to the document body
    document.body.appendChild(responseMenu);
    
    // Add event listeners to the response options
    responseMenu.querySelector('.accept').addEventListener('click', function() {
        handleConnectionAction(targetUserId, 'accept');
        responseMenu.remove();
    });
    
    responseMenu.querySelector('.reject').addEventListener('click', function() {
        handleConnectionAction(targetUserId, 'reject');
        responseMenu.remove();
    });
    
    // Close the menu when clicking outside
    document.addEventListener('click', function closeMenu(e) {
        if (!responseMenu.contains(e.target) && e.target !== connectButton) {
            responseMenu.remove();
            document.removeEventListener('click', closeMenu);
        }
    });
}

/**
 * Loads the current connection status between the current user and the profile user
 */
function loadConnectionStatus(profileUserId) {
    // The backend route /api/connections/status/:targetUserId is for getting status with a specific user.
    // The old /api/connections/status (plural) was for getting all statuses for the current user.
    // We need to ensure we are calling the correct one based on context.
    // For a profile page, we want the status with that specific profileUser.
    fetch(`/api/connections/status/${profileUserId}`) // This now correctly calls the new specific user status route.
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update the connect button based on the status
                updateConnectButtonState(data.status, profileUserId);
            }
        })
        .catch(error => {
            console.error('Error loading connection status:', error);
        });
}

/**
 * Updates the connect button state based on the connection status
 */
function updateConnectButtonState(status, targetUserId) { // targetUserId might be undefined if status is 'is_self'
    const connectBtn = document.getElementById('connect-button');
    if (!connectBtn) return;

    // If status is 'is_self', it means we are on our own profile, so hide connect button
    // This logic should ideally be handled by EJS templating, but as a fallback:
    if (status === 'is_self') {
        connectBtn.style.display = 'none';
        const messageBtn = document.getElementById('message-button');
        if (messageBtn) messageBtn.style.display = 'none'; // Also hide message button if it's self
        return;
    } else {
        connectBtn.style.display = 'inline-block'; // Ensure it's visible otherwise
    }
    
    // Reset button classes
    connectBtn.classList.remove('btn-primary', 'btn-outline');
    
    // Update button based on status
    switch (status) {
        case 'none':
            connectBtn.textContent = 'Connect';
            connectBtn.setAttribute('data-action', 'connect');
            connectBtn.setAttribute('data-status', 'none');
            connectBtn.classList.add('btn-primary');
            break;
            
        case 'pending_sent':
        case 'pending':
            connectBtn.textContent = 'Pending...';
            connectBtn.setAttribute('data-action', 'cancel');
            connectBtn.setAttribute('data-status', 'pending');
            connectBtn.classList.add('btn-outline');
            break;
            
        case 'pending_received':
        case 'request':
            connectBtn.textContent = 'Respond';
            connectBtn.setAttribute('data-action', 'respond');
            connectBtn.setAttribute('data-status', 'request');
            connectBtn.classList.add('btn-primary');
            break;
            
        case 'connected':
            connectBtn.textContent = 'Connected';
            connectBtn.setAttribute('data-action', 'disconnect');
            connectBtn.setAttribute('data-status', 'connected');
            connectBtn.classList.add('btn-outline');
            
            // Show message button if not already visible
            const messageBtn = document.getElementById('message-button');
            if (!messageBtn) {
                const profileActions = document.querySelector('.profile-actions');
                if (profileActions) {
                    // Message button removed
                }
            }
            break;
    }
}

/**
 * Handles connection actions (connect, disconnect, accept, reject, cancel)
 */
// Make handleConnectionAction globally available for notifications
window.handleConnectionAction = function(targetUserId, action) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
    
    let endpoint = '/api/connections/';
    let body = {};

    switch (action) {
        case 'connect':
            endpoint += 'request';
            body = { targetUserId };
            break;
        case 'disconnect':
            endpoint += 'disconnect';
            body = { targetUserId };
            break;
        case 'cancel':
            endpoint += 'cancel';
            body = { targetUserId };
            break;
        case 'accept':
            endpoint += 'respond';
            body = { requestFromUserId: targetUserId, action: 'accept' }; // targetUserId here is the user who sent the request
            break;
        case 'reject':
            endpoint += 'respond';
            body = { requestFromUserId: targetUserId, action: 'reject' }; // targetUserId here is the user who sent the request
            break;
        default:
            console.error('Unknown connection action:', action);
            if (loadingElement) loadingElement.style.display = 'none';
            return;
    }

    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Reload connection status to get the definitive state from the server
            // This is more reliable than trying to guess the newStatus on the client-side
            // especially since the server might have its own logic or encounter errors.
            loadConnectionStatus(targetUserId); 
            // Also, if on own profile page, this might need to refresh other parts of the UI
            // For now, just reloading the button status is fine.

            // Update connections count if needed
            if (action === 'accept' || action === 'connect' || action === 'disconnect') {
                // Refresh connections count
                fetch('/api/users/stats')
                    .then(response => response.json())
                    .then(statsData => {
                        if (statsData.success) {
                            updateConnectionCount(statsData.stats.connections);
                        }
                    })
                    .catch(error => console.error('Error updating stats:', error));
            }

            // Show a success notification
            if (window.showNotification && data.message) {
                window.showNotification('Connection Update', data.message, 'success');
            } else if (typeof showNotification === 'function' && data.message) {
                showNotification('Success', data.message, 'success');
            } else if (data.message) {
                alert(data.message);
            }
        } else {
            // Show error notification
            if (window.showNotification && data.message) {
                window.showNotification('Connection Error', data.message, 'error');
            } else if (typeof showNotification === 'function') {
                showNotification('Error', data.message || 'Failed to perform action', 'error');
            } else {
                alert(data.message || 'Failed to perform action');
            }
        }
    })
    .catch(error => {
        console.error('Error handling connection action:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error', 'An error occurred while processing your request', 'error');
        } else {
            alert('An error occurred while processing your request');
        }
    })
    .finally(() => {
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    });
}

// Message modal function removed

/**
 * Updates the connection count in the UI
 */
function updateConnectionCount(count) {
    // Update connection count in profile stats if it exists
    const connectionsStatValue = document.querySelector('.stat:nth-child(1) .stat-value');
    if (connectionsStatValue) {
        connectionsStatValue.textContent = count;
    }
    
    // Update connection count in sidebar if it exists
    const sidebarConnectionCount = document.querySelector('.sidebar-connections-count');
    if (sidebarConnectionCount) {
        sidebarConnectionCount.textContent = count;
    }
    
    // Update connection count in header if it exists
    const headerConnectionCount = document.querySelector('.header-connections-count');
    if (headerConnectionCount) {
        headerConnectionCount.textContent = count;
    }
    
    // Dispatch a custom event for other components that might need to update
    document.dispatchEvent(new CustomEvent('connectionCountUpdated', { detail: { count } }));
}

/**
 * Initializes Socket.IO for real-time connection updates
 * @param {string} currentUserId - The ID of the current logged-in user
 * @param {string} profileUserId - The ID of the user whose profile is being viewed (optional)
 */
function initializeSocketForConnections(currentUserId, profileUserId) {
    // Check if Socket.IO is available
    if (typeof io === 'undefined') {
        console.error('Socket.IO not loaded. Make sure socket.io.js is included before this script.');
        return;
    }
    
    // Connect to the Socket.IO server
    const socket = io();
    
    // Register the current user with the socket server
    socket.emit('registerUser', { userId: currentUserId });
    
    // Listen for connection updates
    socket.on('connection_update', function(data) {
        console.log('Connection update received:', data);
        
        // Update the connection count if provided
        if (data.connectionCount !== undefined) {
            updateConnectionCount(data.connectionCount);
        }
        
        // If we're on a profile page and the update is relevant to this profile
        if (profileUserId && (data.userId === profileUserId || data.targetUserId === profileUserId)) {
            // Reload the connection status to update the UI
            loadConnectionStatus(profileUserId);
        }
        
        // Show notifications for connection updates
        if (data.type === 'accepted') {
            showConnectionNotification('Connection Accepted', 'Your connection request has been accepted!', 'success');
        } else if (data.type === 'removed') {
            showConnectionNotification('Connection Removed', 'A connection has been removed.', 'info');
        }
    });
}

/**
 * Shows a notification for connection updates
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 * @param {string} type - The notification type (success, error, info, warning)
 */
function showConnectionNotification(title, message, type = 'info') {
    // Check if the notification.js showNotification function exists
    if (typeof window.showNotification === 'function') {
        // Use the global showNotification function from notification.js
        window.showNotification(title, message, type);
    } else {
        // Fallback to a simple notification if the global function is not available
        console.log(`${type.toUpperCase()} - ${title}: ${message}`);
        
        // Create a simple notification element
        const notificationContainer = document.getElementById('connection-notification-container') || 
            (() => {
                const container = document.createElement('div');
                container.id = 'connection-notification-container';
                container.style.position = 'fixed';
                container.style.top = '20px';
                container.style.right = '20px';
                container.style.zIndex = '9999';
                document.body.appendChild(container);
                return container;
            })();
        
        const notification = document.createElement('div');
        notification.style.backgroundColor = type === 'success' ? '#4CAF50' : 
                                           type === 'error' ? '#F44336' : 
                                           type === 'warning' ? '#FF9800' : '#2196F3';
        notification.style.color = 'white';
        notification.style.padding = '15px';
        notification.style.marginBottom = '10px';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        notification.style.minWidth = '250px';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease-in-out';
        
        notification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
            <div>${message}</div>
        `;
        
        notificationContainer.appendChild(notification);
        
        // Show with animation
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
}