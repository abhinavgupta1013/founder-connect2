/**
 * useConnection.js
 * Custom hook for managing connection functionality between users
 */

const { useContext, useCallback } = require('react');
const { ConnectionContext } = require('../context/ConnectionContext');

const useConnection = (userId) => {
  const { connections, updateConnection, currentUserId } = useContext(ConnectionContext);
  
  const connectionStatus = connections[userId] || 'none';

  // Send connection request
  const sendRequest = useCallback(() => {
    console.log(`Sending connection request to user ${userId}`);
    
    // Call the API endpoint
    fetch('/api/connections/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ targetUserId: userId, action: 'connect' })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        updateConnection(userId, 'pending_sent');
      } else {
        console.error('Failed to send connection request:', data.message);
      }
    })
    .catch(error => {
      console.error('Error sending connection request:', error);
    });
  }, [userId, updateConnection]);

  // Cancel connection request
  const cancelRequest = useCallback(() => {
    console.log(`Cancelling connection request to user ${userId}`);
    
    // Call the API endpoint
    fetch('/api/connections/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ targetUserId: userId, action: 'cancel' })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        updateConnection(userId, 'none');
      } else {
        console.error('Failed to cancel connection request:', data.message);
      }
    })
    .catch(error => {
      console.error('Error cancelling connection request:', error);
    });
  }, [userId, updateConnection]);

  // Accept connection request
  const acceptRequest = useCallback(() => {
    console.log(`Accepting connection request from user ${userId}`);
    
    // Call the API endpoint
    fetch('/api/connections/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ targetUserId: userId, action: 'accept' })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        updateConnection(userId, 'connected');
      } else {
        console.error('Failed to accept connection request:', data.message);
      }
    })
    .catch(error => {
      console.error('Error accepting connection request:', error);
    });
  }, [userId, updateConnection]);

  // Reject connection request
  const rejectRequest = useCallback(() => {
    console.log(`Rejecting connection request from user ${userId}`);
    
    // Call the API endpoint
    fetch('/api/connections/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ targetUserId: userId, action: 'reject' })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        updateConnection(userId, 'none');
      } else {
        console.error('Failed to reject connection request:', data.message);
      }
    })
    .catch(error => {
      console.error('Error rejecting connection request:', error);
    });
  }, [userId, updateConnection]);

  // Remove connection
  const removeConnection = useCallback(() => {
    console.log(`Removing connection with user ${userId}`);
    
    // Call the API endpoint
    fetch('/api/connections/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ targetUserId: userId, action: 'disconnect' })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        updateConnection(userId, 'none');
      } else {
        console.error('Failed to remove connection:', data.message);
      }
    })
    .catch(error => {
      console.error('Error removing connection:', error);
    });
  }, [userId, updateConnection]);

  return {
    connectionStatus,
    sendRequest,
    cancelRequest,
    acceptRequest,
    rejectRequest,
    removeConnection
  };
};

module.exports = useConnection;