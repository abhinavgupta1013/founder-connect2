/**
 * notification.js
 * Handles displaying notifications for user actions
 */

/**
 * Shows a notification to the user
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 * @param {string} type - The notification type (success, error, info, warning)
 */

// Ensure Socket.IO client library is loaded. Typically via a <script> tag in your HTML.
// <script src="/socket.io/socket.io.js"></script>

let socket = null; // Initialize socket variable

function initializeSocketForNotifications(currentUserId) {
    if (!currentUserId) {
        console.log('Current user ID not available for socket registration.');
        return;
    }

    // Connect to Socket.IO server if not already connected
    if (!socket || !socket.connected) {
        socket = io(); // Assumes Socket.IO client is loaded globally

        socket.on('connect', () => {
            console.log('Connected to Socket.IO server for notifications.');
            // Register user with their userId
            socket.emit('registerUser', currentUserId);
            console.log('Sent registerUser event with userId:', currentUserId);
        });

        socket.on('new_notification', (notificationData) => {
            console.log('Received new_notification:', notificationData);
            // The notificationData.sender should ideally be an object with name, avatar etc.
            // If it's just an ID, you might need to fetch sender details or adjust server payload.
            let title = 'New Notification';
            let message = notificationData.message;
            let type = 'info'; // Default type
            let fromUserIdForAction = null;

            if (notificationData.type === 'connection_request') {
                title = 'Connection Request';
                // Assuming notificationData.sender is an object with name
                message = notificationData.sender && notificationData.sender.name ? 
                          `${notificationData.sender.name} sent you a connection request.` : 
                          'Someone sent you a connection request.';
                type = 'info'; // Or a custom type like 'connection'
                // actionDetails should be part of notificationData from server
                fromUserIdForAction = notificationData.actionDetails ? notificationData.actionDetails.fromUserId : null;
            } else if (notificationData.type === 'connection_accepted') {
                title = 'Connection Accepted';
                message = notificationData.sender && notificationData.sender.name ? 
                          `${notificationData.sender.name} accepted your connection request.` : 
                          'Your connection request was accepted.';
                type = 'success';
            } else if (notificationData.type === 'connection_rejected') { // Handle rejected
                title = 'Connection Declined';
                message = notificationData.sender && notificationData.sender.name ? 
                          `${notificationData.sender.name} declined your connection request.` : 
                          'A connection request was declined.';
                type = 'warning'; // Or 'error' or 'info'
            }
            // Message notification handling removed

            showNotification(title, message, type, notificationData.actionDetails);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from Socket.IO server.');
        });

        socket.on('connect_error', (err) => {
            console.error('Socket.IO connection error:', err);
        });
    } else {
        // If socket is already connected, ensure user is registered (e.g., on page navigation)
        socket.emit('registerUser', currentUserId);
    }
}


// Make showNotification globally accessible
window.showNotification = function(title, message, type = 'info', actionDetails = null) {
    // Create notification element if it doesn't exist
    let notificationContainer = document.getElementById('toast-notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'toast-notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `toast-notification toast-notification-${type}`;
    
    // Add notification content
    notification.innerHTML = `
        <div class="toast-notification-header">
            <span class="toast-notification-title">${title}</span>
            <button class="toast-notification-close">&times;</button>
        </div>
        <div class="toast-notification-body">
            <p>${message}</p>
        </div>
        <div class="toast-notification-actions"></div>
    `;
    
    // Add notification to container
    notificationContainer.appendChild(notification);

    // Add action buttons if provided
    if (actionDetails && actionDetails.type === 'connection_request' && actionDetails.fromUserId && window.handleConnectionAction) {
        const actionsContainer = notification.querySelector('.toast-notification-actions');
        
        const acceptButton = document.createElement('button');
        acceptButton.className = 'btn-toast-accept';
        acceptButton.innerHTML = '<i class="fas fa-check"></i> Accept';
        acceptButton.onclick = () => {
            window.handleConnectionAction(actionDetails.fromUserId, 'accept');
            notification.remove(); // Or update notification status
        };
        actionsContainer.appendChild(acceptButton);

        const rejectButton = document.createElement('button');
        rejectButton.className = 'btn-toast-reject';
        rejectButton.innerHTML = '<i class="fas fa-times"></i> Reject';
        rejectButton.onclick = () => {
            window.handleConnectionAction(actionDetails.fromUserId, 'reject');
            notification.remove(); // Or update notification status
        };
        actionsContainer.appendChild(rejectButton);
    }
    
    // Add event listener to close button
    const closeButton = notification.querySelector('.toast-notification-close');
    closeButton.addEventListener('click', function() {
        notification.classList.add('toast-notification-hiding');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('toast-notification-hiding');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
    
    // Show notification with animation
    setTimeout(() => {
        notification.classList.add('toast-notification-show');
    }, 10);
}