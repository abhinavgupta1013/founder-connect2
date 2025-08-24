document.addEventListener('DOMContentLoaded', function() {
    // Initialize Socket.IO connection with authentication
    const socket = io({
        auth: {
            sessionID: document.cookie // Pass cookies for authentication
        }
    });
    
    // Log socket connection status
    socket.on('connect', () => {
        console.log('Socket connected with ID:', socket.id);
    });
    
    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
    });
    
    // Function to check URL parameters for auto-opening chats
    function checkUrlForChatParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user');
        
        if (userId) {
            console.log('URL contains user parameter:', userId);
            // Check if we already have a conversation with this user
            loadConversations(userId);
        }
    }

    // DOM Elements
    const conversationsList = document.getElementById('conversations-list');
    const chatArea = document.getElementById('chat-area');
    const newMessageModal = document.getElementById('new-message-modal');
    const newMessageBtn = document.querySelector('.new-message-btn');
    const closeModalBtn = document.querySelector('.close-modal');
    const searchMessagesInput = document.getElementById('search-messages');
    const searchUsersInput = document.getElementById('search-users');
    const usersList = document.getElementById('users-list');
    const sendMessageBtn = document.querySelector('.send-message-btn');

    // State
    let currentConversation = null;
    let conversations = [];
    let users = [];

    // Event Listeners
    newMessageBtn.addEventListener('click', () => {
        newMessageModal.classList.add('active');
        loadUsers();
    });

    closeModalBtn.addEventListener('click', () => {
        newMessageModal.classList.remove('active');
    });

    searchMessagesInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        filterConversations(query);
    });

    searchUsersInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length > 0) {
            searchUsersFromDatabase(query);
        } else {
            loadUsers(); // Load all users when search is empty
        }
    });
    
    // Add event listener for the send message button in the no-chat view
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', () => {
            newMessageModal.classList.add('active');
            loadUsers();
        });
    }
    
    // Initial load - check URL params after conversations are loaded
    loadConversations();
    
    // Check URL parameters for direct chat opening
    checkUrlForChatParams();

    // Load conversations
    function loadConversations(targetUserId = null) {
        fetch('/api/conversations')
            .then(response => response.json())
            .then(data => {
                conversations = data.conversations;
                renderConversations();
                
                // If targetUserId is provided, try to find and open that conversation
                if (targetUserId) {
                    const existingConversation = conversations.find(c =>
                        c.participants.some(p => p._id === targetUserId)
                    );
                    
                    if (existingConversation) {
                        // Open existing conversation
                        openConversation(existingConversation);
                    } else {
                        // Create new conversation with this user
                        startConversation(targetUserId);
                    }
                }
            })
            .catch(error => {
                console.error('Error loading conversations:', error);
            });
    }

    // Render conversations
    function renderConversations() {
        conversationsList.innerHTML = '';
        conversations.forEach(conversation => {
            const conversationElement = createConversationElement(conversation);
            conversationsList.appendChild(conversationElement);
        });
    }

    // Create conversation element
    function createConversationElement(conversation) {
        const div = document.createElement('div');
        div.className = 'conversation-item';
        div.dataset.id = conversation._id;

        const lastMessage = conversation.messages[conversation.messages.length - 1];
        const otherUser = conversation.participants.find(p => p._id !== currentUserId);

        div.innerHTML = `
            <div class="conversation-avatar">
                ${otherUser.avatar ? 
                    `<img src="${otherUser.avatar}" alt="${otherUser.name}">` :
                    otherUser.name.charAt(0).toUpperCase()
                }
            </div>
            <div class="conversation-info">
                <div class="conversation-name">${otherUser.name}</div>
                <div class="conversation-preview">${lastMessage ? lastMessage.content : 'No messages yet'}</div>
            </div>
        `;

        div.addEventListener('click', () => {
            openConversation(conversation);
        });

        return div;
    }

    // Open conversation
    function openConversation(conversation) {
        console.log('Opening conversation:', conversation);
        currentConversation = conversation;
        
        // Update active state
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const conversationItem = document.querySelector(`.conversation-item[data-id="${conversation._id}"]`);
        if (conversationItem) {
            conversationItem.classList.add('active');
        }

        // Render chat area
        renderChatArea(conversation);
    }

    // Render chat area
    function renderChatArea(conversation) {
        console.log('Rendering chat area for conversation:', conversation);
        
        // Find the other user in the conversation
        let otherUser = { name: 'User', _id: '' };
        if (conversation.participants && conversation.participants.length) {
            otherUser = conversation.participants.find(p => p._id !== currentUserId) || otherUser;
        }
        // Get current user info (from global user object if available)
        let currentUser = { name: 'You', avatar: '', _id: currentUserId };
        if (typeof user !== 'undefined' && user) {
            currentUser.name = user.name || 'You';
            currentUser.avatar = user.avatar || '';
        }
        chatArea.innerHTML = `
            <div class="chat-header">
                <div class="conversation-avatars" style="display: flex; align-items: center; gap: 8px;">
                    <div class="conversation-avatar">
                        ${otherUser.avatar ? 
                            `<img src="${otherUser.avatar}" alt="${otherUser.name}">` :
                            otherUser.name.charAt(0).toUpperCase()
                        }
                    </div>
                    <div class="conversation-avatar">
                        ${currentUser.avatar ? 
                            `<img src="${currentUser.avatar}" alt="${currentUser.name}">` :
                            currentUser.name.charAt(0).toUpperCase()
                        }
                    </div>
                </div>
                <div class="chat-header-info">
                    <div class="chat-header-name">${otherUser.name}</div>
                    <div class="chat-header-status">Active now</div>
                </div>
            </div>
            <div class="messages-area" id="messages-area">
                ${conversation.messages && conversation.messages.length ? 
                    conversation.messages.map(message => {
                        // Determine if the message is sent or received
                        const isSent = message.sender === currentUserId || 
                                      (message.sender && message.sender._id === currentUserId);
                        
                        return `
                            <div class="message ${isSent ? 'sent' : 'received'}">
                                ${!isSent && message.sender && message.sender.name ? 
                                    `<div class="message-sender-info">
                                        <div class="sender-avatar">
                                            ${message.sender.avatar ? 
                                                `<img src="${message.sender.avatar}" alt="${message.sender.name}">` :
                                                message.sender.name.charAt(0).toUpperCase()
                                            }
                                        </div>
                                    </div>` : ''
                                }
                                <div class="message-content">${message.content}</div>
                            </div>
                        `;
                    }).join('') : 
                    '<div class="no-messages">No messages yet. Start the conversation!</div>'
                }
            </div>
            <div class="message-input-container">
                <textarea class="message-input" placeholder="Message..." id="message-input"></textarea>
                <button class="send-button" id="send-button">Send</button>
            </div>
        `;
    
        // Scroll to bottom
        const messagesArea = document.getElementById('messages-area');
        if (messagesArea) {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    
        // Add event listeners for new messages
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');
    
        if (messageInput && sendButton) {
            // Initial state of send button
            sendButton.disabled = !messageInput.value.trim();
            
            messageInput.addEventListener('input', () => {
                sendButton.disabled = !messageInput.value.trim();
            });
    
            sendButton.addEventListener('click', () => {
                sendMessage(messageInput.value.trim());
            });
    
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(messageInput.value.trim());
                }
            });
        }
    }

    // Send message
    function sendMessage(content) {
        if (!content || !currentConversation) return;

        // Create a temporary message object
        const tempMessage = {
            conversationId: currentConversation._id,
            content: content,
            sender: { _id: currentUserId },
            _id: 'temp-' + Date.now(), // Temporary ID until server responds
            isTempMessage: true // Flag to identify this as a temporary message
        };

        // Add to current conversation messages array for tracking
        if (!currentConversation.messages) {
            currentConversation.messages = [];
        }
        currentConversation.messages.push(tempMessage);

        // Add message to UI immediately
        const messagesArea = document.getElementById('messages-area');
        if (messagesArea) {
            // Remove "No messages yet" message if it exists
            const noMessagesElement = messagesArea.querySelector('.no-messages');
            if (noMessagesElement) {
                messagesArea.innerHTML = '';
            }
            
            const messageElement = document.createElement('div');
            messageElement.className = 'message sent';
            messageElement.dataset.tempId = tempMessage._id; // Add temp ID for potential future reference
            
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            messageContent.textContent = content;
            messageElement.appendChild(messageContent);
            
            messagesArea.appendChild(messageElement);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }

        // Send to server
        socket.emit('send_message', {
            conversationId: currentConversation._id,
            content: content
        });

        // Clear input
        document.getElementById('message-input').value = '';
        document.getElementById('send-button').disabled = true;
    }

    // Load users for new message
    function loadUsers() {
        fetch('/api/users')
            .then(response => response.json())
            .then(data => {
                users = data.users;
                renderUsers();
            })
            .catch(error => {
                console.error('Error loading users:', error);
            });
    }

    // Render users
    function renderUsers() {
        usersList.innerHTML = '';
        users.forEach(user => {
            const userElement = createUserElement(user);
            usersList.appendChild(userElement);
        });
    }

    // Create user element
    function createUserElement(user) {
        const userElement = document.createElement('div');
        userElement.classList.add('user-item');
        userElement.dataset.id = user._id;
        userElement.innerHTML = `
            <div class="user-avatar">
                ${user.avatar ?
                    `<img src="${user.avatar}" alt="${user.name}">` :
                    user.name.charAt(0).toUpperCase()
                }
            </div>
            <div class="user-info">
                <div class="user-name">${user.name}</div>
                <div class="user-status">Active now</div>
            </div>
        `;
        userElement.addEventListener('click', () => {
            // Start conversation directly with this user
            console.log('User clicked, starting conversation with:', user);
            startConversation(user._id); // Corrected this line
            
            // Close the new message modal and overlay
            newMessageModal.classList.remove('active');
            if (typeof overlay !== 'undefined') {
                overlay.classList.remove('active');
            }
         });
        return userElement;
    }

    function startConversation(userId) {
        // Check if a conversation with this user already exists
        const existingConversation = conversations.find(c =>
            c.participants.some(p => p._id === userId)
        );

        if (existingConversation) {
            openConversation(existingConversation);
            return;
        }

        // If no existing conversation, create a new one
        fetch('/api/conversations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                participantId: userId
            })
        })
        .then(response => response.json())
        .then(convData => {
            if (convData.success) {
                conversations.unshift(convData.conversation);
                renderConversations();
                openConversation(convData.conversation);
                newMessageModal.classList.remove('active');
            } else {
                alert('Failed to start conversation. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error starting conversation:', error);
            alert('Failed to start conversation. Please try again.');
        });
    }

    // Filter conversations
    function filterConversations(query) {
        const filtered = conversations.filter(conversation => {
            const otherUser = conversation.participants.find(p => p._id !== currentUserId);
            return otherUser.name.toLowerCase().includes(query);
        });
        
        conversationsList.innerHTML = '';
        filtered.forEach(conversation => {
            const conversationElement = createConversationElement(conversation);
            conversationsList.appendChild(conversationElement);
        });
    }

    // Search users from database
    function searchUsersFromDatabase(query) {
        fetch(`/api/search-users-for-message?query=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                if (data.users) {
                    usersList.innerHTML = '';
                    if (data.users.length === 0) {
                        usersList.innerHTML = '<div class="no-results">No users found</div>';
                    } else {
                        data.users.forEach(user => {
                            const userElement = createUserElement(user);
                            usersList.appendChild(userElement);
                        });
                    }
                }
            })
            .catch(error => {
                console.error('Error searching users:', error);
                usersList.innerHTML = '<div class="no-results">Error searching users</div>';
            });
    }
    
    // Filter users (for local filtering)
    function filterUsers(query) {
        const filtered = users.filter(user => 
            user.name.toLowerCase().includes(query)
        );
        
        usersList.innerHTML = '';
        filtered.forEach(user => {
            const userElement = createUserElement(user);
            usersList.appendChild(userElement);
        });
    }

    // Socket.IO event handlers
    socket.on('new_message', (message) => {
        console.log('New message received:', message);
        
        if (currentConversation && message.conversationId === currentConversation._id) {
            // Check if this is a message we sent (to avoid duplication)
            const isOurMessage = message.sender._id === currentUserId;
            
            // Check if we already have a temporary version of this message
            const tempMessageIndex = currentConversation.messages.findIndex(m => 
                m.isTempMessage && m.content === message.content && m.sender._id === currentUserId
            );
            
            if (tempMessageIndex !== -1) {
                // Replace the temporary message with the real one
                currentConversation.messages[tempMessageIndex] = message;
            } else {
                // This is a new message, add it to the conversation
                currentConversation.messages.push(message);
            }
            
            // Update messages area
            const messagesArea = document.getElementById('messages-area');
            if (messagesArea) {
                // If we have a temporary message, we don't need to add a new element
                if (tempMessageIndex !== -1 && isOurMessage) {
                    // The message is already displayed, no need to add it again
                    return;
                }
                
                const messageElement = document.createElement('div');
                messageElement.className = `message ${isOurMessage ? 'sent' : 'received'}`;
                
                // Create message content with sender info for received messages
                if (!isOurMessage) {
                    const senderInfo = document.createElement('div');
                    senderInfo.className = 'message-sender-info';
                    senderInfo.innerHTML = `
                        <div class="sender-avatar">
                            ${message.sender.avatar ? 
                                `<img src="${message.sender.avatar}" alt="${message.sender.name}">` :
                                message.sender.name.charAt(0).toUpperCase()
                            }
                        </div>
                    `;
                    messageElement.appendChild(senderInfo);
                }
                
                const messageContent = document.createElement('div');
                messageContent.className = 'message-content';
                messageContent.textContent = message.content;
                messageElement.appendChild(messageContent);
                
                messagesArea.appendChild(messageElement);
                messagesArea.scrollTop = messagesArea.scrollHeight;
            }
        }

        // Update conversation in list or add new conversation
        let conversation = conversations.find(c => c._id === message.conversationId);
        if (conversation) {
            conversation.messages.push(message);
        } else {
            // If this is a new conversation, reload all conversations
            loadConversations();
            return;
        }
        
        // Re-render conversations to update the preview
        renderConversations();
    });
    
    // Handle message errors
    socket.on('message_error', (error) => {
        console.error('Message error:', error);
        alert('Failed to send message. Please try again.');
    });

    // Check URL for user parameter to start conversation
    function checkUrlForUserParam() {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        
        // Always load all conversations first
        fetch('/api/conversations')
            .then(response => response.json())
            .then(data => {
                conversations = data.conversations;
                renderConversations();
                
                // If we have a user ID in the URL, start/open that conversation
                if (userId) {
                    console.log('User ID found in URL:', userId);
                    startConversation(userId);
                }
            })
            .catch(error => {
                console.error('Error loading conversations:', error);
            });
    }
    
    // Load initial conversations or start specific conversation
    checkUrlForUserParam();
});