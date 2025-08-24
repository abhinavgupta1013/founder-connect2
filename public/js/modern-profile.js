document.addEventListener('DOMContentLoaded', function() {
    // Hide loading animation when page is loaded
    document.getElementById('loading').style.display = 'none';
    
    // Tab Switching
    const tabs = document.querySelectorAll('.tab');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs and panes
            tabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding pane
            this.classList.add('active');
            const tabId = `${this.dataset.tab}-tab`;
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Post View Tab Switching (User Posts / All Posts)
    const postViewTabs = document.querySelectorAll('.profile-tab');
    
    postViewTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all post view tabs
            postViewTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Reload posts based on selected tab
            loadPosts();
        });
    });
    
    // Message Button Handler
    const messageButton = document.getElementById('message-button');
    if (messageButton) {
        messageButton.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            if (userId) {
                // Redirect to messages page with user ID parameter
                window.location.href = `/messages?userId=${userId}`;
            }
        });
    }
    
    // Get user ID (profile owner ID) from URL or hidden input
    let userId = '';
    const profilePathMatch = window.location.pathname.match(/\/profile\/([^\/?#]+)/);
    if (profilePathMatch && profilePathMatch[1]) {
        userId = profilePathMatch[1];
    } else {
        const userIdElement = document.getElementById('user-id');
        if (userIdElement) {
            userId = userIdElement.value;
        }
    }

    // Profile Edit Modal
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const profileEditModal = document.getElementById('profile-edit-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const cancelProfileEdit = document.getElementById('cancel-profile-edit');
    const saveProfileEdit = document.getElementById('save-profile-edit');

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            profileEditModal.classList.add('active');
        });
    }

    // Close modal functions
    function closeModal(modal) {
        modal.classList.remove('active');
    }

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(btn.closest('.modal'));
        });
    });

    if (cancelProfileEdit) {
        cancelProfileEdit.addEventListener('click', () => {
            closeModal(profileEditModal);
        });
    }

    // Save profile changes
    if (saveProfileEdit) {
        saveProfileEdit.addEventListener('click', () => {
            const name = document.getElementById('edit-name').value;
            const title = document.getElementById('edit-title').value;
            const location = document.getElementById('edit-location').value;
            const website = document.getElementById('edit-website').value;
            const bio = document.getElementById('edit-bio').value;
            const skills = document.getElementById('edit-skills').value.split(',').map(s => s.trim());

            document.getElementById('loading').style.display = 'flex';

            fetch('/api/users/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    title,
                    location,
                    website,
                    bio,
                    skills
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.reload();
                } else {
                    alert('Failed to update profile: ' + data.message);
                    document.getElementById('loading').style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error updating profile:', error);
                alert('Error updating profile. Please try again.');
                document.getElementById('loading').style.display = 'none';
            });
        });
    }

    // Bio Section Edit
    const bioEditBtn = document.querySelector('[data-section="bio"]');
    const bioContent = document.getElementById('bio-content');
    const bioEdit = document.getElementById('bio-edit');
    const bioInput = document.getElementById('bio-input');
    const saveBioBtn = document.querySelector('[data-section="bio"][data-field="bio"].save-edit');
    const cancelBioBtn = document.querySelector('[data-section="bio"].cancel-edit');

    if (bioEditBtn) {
        bioEditBtn.addEventListener('click', function() {
            bioContent.style.display = 'none';
            bioEdit.style.display = 'block';
        });
    }

    if (cancelBioBtn) {
        cancelBioBtn.addEventListener('click', function() {
            bioContent.style.display = 'block';
            bioEdit.style.display = 'none';
        });
    }

    if (saveBioBtn) {
        saveBioBtn.addEventListener('click', function() {
            const bio = bioInput.value;
            document.getElementById('loading').style.display = 'flex';

            fetch('/api/users/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ bio })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.reload();
                } else {
                    alert('Failed to update bio: ' + data.message);
                    document.getElementById('loading').style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error updating bio:', error);
                alert('Error updating bio. Please try again.');
                document.getElementById('loading').style.display = 'none';
            });
        });
    }

    // Avatar Upload and Options
    const avatarInput = document.getElementById('avatar-input');
    const uploadPhotoOption = document.querySelector('.avatar-option.upload-photo');
    const removePhotoOption = document.querySelector('.avatar-option.remove-photo');
    const avatarEdit = document.querySelector('.avatar-edit');
    const avatar = document.querySelector('.avatar');
    
    // Handle click on upload photo option
    if (uploadPhotoOption) {
        uploadPhotoOption.addEventListener('click', function() {
            // Trigger the file input click
            if (avatarInput) {
                avatarInput.click();
            }
        });
    }
    
    // Handle click on avatar edit button
    if (avatarEdit) {
        avatarEdit.addEventListener('click', function() {
            // Trigger the file input click
            if (avatarInput) {
                avatarInput.click();
            }
        });
    }
    
    // Handle click on avatar itself
    if (avatar) {
        avatar.addEventListener('click', function(e) {
            // Only trigger if the user is the profile owner
            const currentUserId = document.getElementById('current-user-id')?.value;
            const userId = document.getElementById('user-id')?.value;
            
            if (currentUserId && userId && currentUserId === userId) {
                // Don't trigger if clicking on the avatar options
                if (!e.target.closest('.avatar-options') && !e.target.closest('.avatar-edit')) {
                    // Trigger the file input click
                    if (avatarInput) {
                        avatarInput.click();
                    }
                }
            }
        });
    }
    
    // Handle click on remove photo option
    if (removePhotoOption) {
        removePhotoOption.addEventListener('click', function() {
            if (confirm('Are you sure you want to remove your profile picture?')) {
                document.getElementById('loading').style.display = 'flex';
                
                fetch('/api/users/remove-avatar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        window.location.reload();
                    } else {
                        alert('Failed to remove avatar: ' + data.message);
                        document.getElementById('loading').style.display = 'none';
                    }
                })
                .catch(error => {
                    console.error('Error removing avatar:', error);
                    alert('Error removing avatar. Please try again.');
                    document.getElementById('loading').style.display = 'none';
                });
            }
        });
    }
    
    // Handle file input change for avatar upload
    if (avatarInput) {
        avatarInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (!validImageTypes.includes(file.type)) {
                    alert('Please select a valid image file (JPEG, PNG, GIF, or WEBP).');
                    return;
                }
                
                // Validate file size (max 5MB)
                const maxSize = 5 * 1024 * 1024; // 5MB in bytes
                if (file.size > maxSize) {
                    alert('Image size should not exceed 5MB.');
                    return;
                }
                
                const formData = new FormData();
                formData.append('avatar', file);

                document.getElementById('loading').style.display = 'flex';

                                fetch('/user/upload-avatar', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        window.location.reload();
                    } else {
                        alert('Failed to upload avatar: ' + data.message);
                        document.getElementById('loading').style.display = 'none';
                    }
                })
                .catch(error => {
                    console.error('Error uploading avatar:', error);
                    alert('Error uploading avatar. Please try again.');
                    document.getElementById('loading').style.display = 'none';
                });
            }
        });
    }

    // Get current user ID
    let currentUserId = null;
    const currentUserElement = document.getElementById('current-user-id');
    if (currentUserElement) {
        currentUserId = currentUserElement.value;
    }

    // Load Posts with unified content approach
    function loadPosts() {
        const postsContainer = document.getElementById('posts-container');
        const postsEmptyState = document.getElementById('posts-empty-state');
        
        if (!postsContainer) return;
    
        document.getElementById('loading').style.display = 'flex';
        postsContainer.innerHTML = '';
        postsContainer.appendChild(postsEmptyState);
    
        // Get the profile owner's user ID
        const profileUserId = userId;
        
        // Use the user-specific endpoint to show all posts for this user
        const endpoint = `/api/v2/posts/user/${profileUserId}`;
    
        fetch(endpoint)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                document.getElementById('loading').style.display = 'none';
                
                if (data.posts && data.posts.length > 0) {
                    postsContainer.innerHTML = '';
                    data.posts.forEach(post => {
                        // Show all posts returned by the API
                        const postElement = createPostElement(post);
                        postsContainer.appendChild(postElement);
                    });
                    
                    // Add event listeners for post actions
                    setupPostActionListeners();
                } else {
                    // Show empty state if no posts
                    postsContainer.innerHTML = '';
                    postsContainer.appendChild(postsEmptyState);
                }
            })
            .catch(error => {
                console.error('Error loading posts:', error);
                document.getElementById('loading').style.display = 'none';
                // Show empty state on error
                postsContainer.innerHTML = '';
                postsContainer.appendChild(postsEmptyState);
            });
    }
    
    // Create Post Element - Modified to remove bio from post content
    function createPostElement(post) {
        const postDiv = document.createElement('div');
        postDiv.className = 'post-card';
        
        // Generate media HTML based on the media array
        let mediaHTML = '';
        if (post.media && post.media.length > 0) {
            mediaHTML = '<div class="post-media-container">';
            post.media.forEach(media => {
                if (media.type === 'image') {
                    mediaHTML += `<img src="${media.url}" alt="Post image" class="post-media">`;
                } else if (media.type === 'video') {
                    mediaHTML += `
                        <video class="post-media" controls>
                            <source src="${media.url}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                    `;
                }
            });
            mediaHTML += '</div>';
        }
        
        // Make sure we have valid data before trying to access properties
        const userName = post.user && post.user.name ? post.user.name : 'Unknown User';
        const userAvatar = post.user && post.user.avatar ? post.user.avatar : '';
        const userId = post.user && post.user._id ? post.user._id : '';
        const postDate = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown date';
        const postCaption = post.caption || '';
        const postId = post._id || '';
        const likesCount = post.likes ? post.likes.length : 0;
        const commentsCount = post.comments ? post.comments.length : 0;
        const isLiked = post.likes && currentUserId ? post.likes.some(like => like._id === currentUserId) : false;
        
        postDiv.innerHTML = `
            <div class="post-header">
                <div class="post-avatar">
                    ${userAvatar ? 
                        `<img src="${userAvatar}" alt="${userName}">` :
                        `<div class="avatar-placeholder">${userName.charAt(0)}</div>`
                    }
                </div>
                <div class="post-info">
                    <div class="post-user">${userName}</div>
                    <div class="post-date">${postDate}</div>
                </div>
            </div>
            <div class="post-content">
                <p>${postCaption}</p>
                ${mediaHTML}
            </div>
            <div class="post-actions">
                <div class="post-action like-action" data-post-id="${postId}">
                    <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                    <span>${likesCount}</span>
                </div>
                <div class="post-action comment-action" data-post-id="${postId}">
                    <i class="far fa-comment"></i>
                    <span>${commentsCount}</span>
                </div>
                <div class="post-action share-action" data-post-id="${postId}">
                    <i class="far fa-share-square"></i>
                </div>
                ${userId === currentUserId ? `
                <div class="post-action delete-action" data-post-id="${postId}">
                    <i class="far fa-trash-alt"></i>
                </div>` : ''}
            </div>
        `;
        return postDiv;
    }

    // Initialize Create Media Button
    const createMediaBtn = document.getElementById('create-media-btn');
    if (createMediaBtn) {
        createMediaBtn.addEventListener('click', function() {
            // Create media form
            const mediaForm = document.createElement('div');
            mediaForm.className = 'create-media-form';
            mediaForm.innerHTML = `
                <div class="form-group">
                    <label for="media-title">Title</label>
                    <input type="text" id="media-title" placeholder="Enter a title for your media">
                </div>
                <div class="form-group">
                    <label for="media-description">Description</label>
                    <textarea id="media-description" placeholder="Describe your media"></textarea>
                </div>
                <div class="form-group">
                    <label for="media-company">Company (Optional)</label>
                    <input type="text" id="media-company" placeholder="Company name">
                </div>
                <div class="form-group">
                    <label for="media-funding">Funding (Optional)</label>
                    <input type="text" id="media-funding" placeholder="Funding details">
                </div>
                <div class="form-group">
                    <label for="media-members">Team Members (Optional)</label>
                    <input type="text" id="media-members" placeholder="Team members, comma separated">
                </div>
                <div class="form-actions">
                    <button class="btn btn-secondary" id="cancel-media">Cancel</button>
                    <button class="btn btn-primary" id="save-media">Create Media</button>
                </div>
            `;
            
            // Insert form at the top of the media grid
            const mediaGrid = document.getElementById('media-grid');
            if (mediaGrid) {
                mediaGrid.innerHTML = '';
                mediaGrid.appendChild(mediaForm);
                
                // Setup cancel button
                document.getElementById('cancel-media').addEventListener('click', function() {
                    mediaForm.remove();
                    loadMedia(); // This would be implemented to load media items
                });
                
                // Setup save button
                document.getElementById('save-media').addEventListener('click', function() {
                    const title = document.getElementById('media-title').value;
                    const description = document.getElementById('media-description').value;
                    const company = document.getElementById('media-company').value;
                    const funding = document.getElementById('media-funding').value;
                    const members = document.getElementById('media-members').value;
                    
                    if (!title || !description) {
                        alert('Please fill in all required fields');
                        return;
                    }
                    
                    // Create data object to send with explicit string conversion
                    const mediaData = {
                        title: String(title),
                        description: String(description),
                        company: company ? String(company) : '',
                        funding: funding ? String(funding) : '',
                        members: members ? String(members) : ''
                    };
                    
                    // Log data for debugging
                    console.log('Data being sent:', mediaData);
                    
                    // Show loading animation
                    document.getElementById('loading').style.display = 'flex';
                    
                    // Send the data to the server
                    fetch('/api/media/create-media', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(mediaData)
                    })
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('loading').style.display = 'none';
                        if (data.success) {
                            alert('Media created successfully!');
                            mediaForm.remove();
                            loadMedia(); // Reload media items
                        } else {
                            alert('Failed to create media: ' + data.message);
                        }
                    })
                    .catch(error => {
                        document.getElementById('loading').style.display = 'none';
                        console.error('Error creating media:', error);
                        alert('Error creating media. Please try again.');
                    });
                });
            }
        });
    }

    // Load media items function
    function loadMedia() {
        const mediaGrid = document.getElementById('media-grid');
        const mediaEmptyState = document.getElementById('media-empty-state');
        
        if (!mediaGrid) return;
        
        // Show loading animation
        document.getElementById('loading').style.display = 'flex';
        
        // Get the user ID from the page
        const userId = document.getElementById('user-id').value;
        
        // Fetch media items from the server
        fetch('/api/media/user-media')
            .then(response => response.json())
            .then(data => {
                document.getElementById('loading').style.display = 'none';
                
                // Clear the media grid
                mediaGrid.innerHTML = '';
                
                if (data.success && data.media && data.media.length > 0) {
                    // Create and append media items
                    data.media.forEach(mediaItem => {
                        const mediaElement = createMediaElement(mediaItem);
                        mediaGrid.appendChild(mediaElement);
                    });
                } else {
                    // Show empty state if no media
                    mediaGrid.appendChild(mediaEmptyState);
                }
            })
            .catch(error => {
                document.getElementById('loading').style.display = 'none';
                console.error('Error loading media:', error);
                mediaGrid.innerHTML = '';
                mediaGrid.appendChild(mediaEmptyState);
            });
    }
    
    // Create media element function
    function createMediaElement(mediaItem) {
        const mediaElement = document.createElement('div');
        mediaElement.className = 'media-item';
        mediaElement.dataset.mediaId = mediaItem._id;
        
        // Create media content based on type
        let mediaContent;
        if (mediaItem.type === 'image') {
            mediaContent = document.createElement('img');
            mediaContent.src = mediaItem.url;
            mediaContent.alt = mediaItem.title || 'Media';
            mediaContent.className = 'media-image';
            
            // Add click event to open lightbox
            mediaContent.addEventListener('click', function() {
                openMediaLightbox(mediaItem);
            });
        } else if (mediaItem.type === 'video') {
            mediaContent = document.createElement('video');
            mediaContent.src = mediaItem.url;
            mediaContent.className = 'media-video';
            mediaContent.controls = true;
        }
        
        mediaElement.appendChild(mediaContent);
        
        // Add media info overlay
        if (mediaItem.title) {
            const mediaInfo = document.createElement('div');
            mediaInfo.className = 'media-info';
            
            const mediaTitle = document.createElement('h4');
            mediaTitle.className = 'media-title';
            mediaTitle.textContent = mediaItem.title;
            mediaInfo.appendChild(mediaTitle);
            
            mediaElement.appendChild(mediaInfo);
        }
        
        return mediaElement;
    }
    
    // Open media lightbox function
    function openMediaLightbox(mediaItem) {
        const lightbox = document.createElement('div');
        lightbox.className = 'media-lightbox';
        
        const lightboxContent = document.createElement('div');
        lightboxContent.className = 'lightbox-content';
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.className = 'lightbox-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', function() {
            document.body.removeChild(lightbox);
        });
        
        // Create media element
        let mediaElement;
        if (mediaItem.type === 'image') {
            mediaElement = document.createElement('img');
            mediaElement.src = mediaItem.url;
            mediaElement.alt = mediaItem.title || 'Media';
            mediaElement.className = 'lightbox-image';
        } else if (mediaItem.type === 'video') {
            mediaElement = document.createElement('video');
            mediaElement.src = mediaItem.url;
            mediaElement.className = 'lightbox-video';
            mediaElement.controls = true;
            mediaElement.autoplay = true;
        }
        
        // Create media details
        const mediaDetails = document.createElement('div');
        mediaDetails.className = 'lightbox-details';
        
        if (mediaItem.title) {
            const mediaTitle = document.createElement('h3');
            mediaTitle.textContent = mediaItem.title;
            mediaDetails.appendChild(mediaTitle);
        }
        
        if (mediaItem.description) {
            const mediaDescription = document.createElement('p');
            mediaDescription.textContent = mediaItem.description;
            mediaDetails.appendChild(mediaDescription);
        }
        
        if (mediaItem.company || mediaItem.funding || mediaItem.members) {
            const mediaMetadata = document.createElement('div');
            mediaMetadata.className = 'lightbox-metadata';
            
            if (mediaItem.company) {
                const companyInfo = document.createElement('p');
                companyInfo.innerHTML = '<strong>Company:</strong> ' + mediaItem.company;
                mediaMetadata.appendChild(companyInfo);
            }
            
            if (mediaItem.funding) {
                const fundingInfo = document.createElement('p');
                fundingInfo.innerHTML = '<strong>Funding:</strong> ' + mediaItem.funding;
                mediaMetadata.appendChild(fundingInfo);
            }
            
            if (mediaItem.members) {
                const membersInfo = document.createElement('p');
                membersInfo.innerHTML = '<strong>Team Members:</strong> ' + mediaItem.members;
                mediaMetadata.appendChild(membersInfo);
            }
            
            mediaDetails.appendChild(mediaMetadata);
        }
        
        lightboxContent.appendChild(closeButton);
        lightboxContent.appendChild(mediaElement);
        lightboxContent.appendChild(mediaDetails);
        lightbox.appendChild(lightboxContent);
        
        // Add lightbox to body
        document.body.appendChild(lightbox);
        
        // Close lightbox when clicking outside content
        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox) {
                document.body.removeChild(lightbox);
            }
        });
    }

    // Setup post action listeners
    function setupPostActionListeners() {
        // Like action
        document.querySelectorAll('.like-action').forEach(btn => {
            btn.addEventListener('click', function() {
                const postId = this.dataset.postId;
                // Toggle like UI immediately for better UX
                const icon = this.querySelector('i');
                const countSpan = this.querySelector('span');
                const count = parseInt(countSpan.textContent);
                
                if (icon.classList.contains('far')) {
                    icon.classList.replace('far', 'fas');
                    countSpan.textContent = count + 1;
                } else {
                    icon.classList.replace('fas', 'far');
                    countSpan.textContent = Math.max(0, count - 1);
                }
                
                // Send like/unlike request to server
                fetch(`/api/posts/${postId}/like`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .catch(error => {
                    console.error('Error toggling like:', error);
                    // Revert UI change on error
                    if (icon.classList.contains('fas')) {
                        icon.classList.replace('fas', 'far');
                        countSpan.textContent = count;
                    } else {
                        icon.classList.replace('far', 'fas');
                        countSpan.textContent = count;
                    }
                });
            });
        });
        
        // Delete action
        document.querySelectorAll('.delete-action').forEach(btn => {
            btn.addEventListener('click', function() {
                if (confirm('Are you sure you want to delete this post?')) {
                    const postId = this.dataset.postId;
                    const postCard = this.closest('.post-card');
                    
                    fetch(`/api/posts/${postId}`, {
                        method: 'DELETE'
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            postCard.remove();
                            // Check if there are no more posts
                            const postsContainer = document.getElementById('posts-container');
                            if (postsContainer.children.length === 0) {
                                const postsEmptyState = document.getElementById('posts-empty-state');
                                postsContainer.appendChild(postsEmptyState);
                            }
                        } else {
                            alert('Failed to delete post: ' + data.message);
                        }
                    })
                    .catch(error => {
                        console.error('Error deleting post:', error);
                        alert('Error deleting post. Please try again.');
                    });
                }
            });
        });
    }

    // Load all content on page load
    loadPosts();
    loadMedia();

    // Media Lightbox
    const mediaLightbox = document.getElementById('media-lightbox-modal');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxVideo = document.getElementById('lightbox-video');

    function openLightbox(mediaUrl, mediaType) {
        if (mediaType === 'image') {
            lightboxImage.src = mediaUrl;
            lightboxImage.style.display = 'block';
            lightboxVideo.style.display = 'none';
        } else if (mediaType === 'video') {
            lightboxVideo.src = mediaUrl;
            lightboxVideo.style.display = 'block';
            lightboxImage.style.display = 'none';
        }
        mediaLightbox.classList.add('active');
    }

    // Close lightbox when clicking outside
    mediaLightbox.addEventListener('click', function(e) {
        if (e.target === mediaLightbox) {
            closeModal(mediaLightbox);
        }
    });

    // Initialize connection button if it exists
    const connectButton = document.getElementById('connect-button');
    if (connectButton) {
        connectButton.addEventListener('click', function() {
            const action = this.dataset.action;
            const targetUserId = document.getElementById('profile-user-id').value;
            
            document.getElementById('loading').style.display = 'flex';

            fetch('/api/users/connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action,
                    targetUserId
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.reload();
                } else {
                    alert('Failed to process connection: ' + data.message);
                    document.getElementById('loading').style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error processing connection:', error);
                alert('Error processing connection. Please try again.');
                document.getElementById('loading').style.display = 'none';
            });
        });
    }
});

// Listen for connections_updated event from other tabs and refresh connections count
window.addEventListener('storage', function(event) {
    if (event.key === 'connections_updated') {
        // Fetch and update connections count
        fetch('/api/users/stats')
            .then(response => response.json())
            .then(statsData => {
                if (statsData.success) {
                    const connectionsStatValue = document.querySelector('.stat:nth-child(1) .stat-value');
                    if (connectionsStatValue) {
                        connectionsStatValue.textContent = statsData.stats.connections;
                    }
                }
            })
            .catch(error => console.error('Error updating stats:', error));
    }
});

// Initialize socket connection
const socket = io();

// Listen for new messages
socket.on('new_message', (data) => {
    // Update notification count or display new message indicator
    updateNotificationCount();
});

// Listen for bio updates
socket.on('profile:bio_updated', (data) => {
    const currentUserId = document.getElementById('currentUserId').value;
    const profileUserId = document.getElementById('profileUserId').value;
    
    // Only update if this is the profile being viewed
    if (data.userId === profileUserId) {
        const bioElement = document.querySelector('.bio-content');
        if (bioElement) {
            bioElement.textContent = data.bio;
            
            // If there was a 'no bio' message, hide it
            const noBioElement = document.querySelector('.no-bio-message');
            if (noBioElement) {
                noBioElement.style.display = 'none';
            }
        }
    }
});

// Listen for new posts
socket.on('feed:post_created', (data) => {
    // Refresh the posts section to show the new post
    loadPosts();
});

/**
 * Function to load posts for the profile
 * This is already defined elsewhere in the file and used for initial loading
 * We're reusing it for real-time updates
 */
function loadPosts() {
    const postsContainer = document.getElementById('posts-container');
    const profileUserId = document.getElementById('profileUserId').value;
    const currentTab = document.querySelector('.profile-tab.active');
    const viewType = currentTab ? currentTab.dataset.view : 'user';
    
    if (!postsContainer) return;
    
    // Show loading indicator
    postsContainer.innerHTML = '<div class="loading-posts">Loading posts...</div>';
    
    // Determine which API endpoint to use based on the active tab
    let apiUrl = '';
    if (viewType === 'all') {
        apiUrl = '/api/v2/posts/feed';
    } else {
        apiUrl = `/api/v2/posts/user/${profileUserId}`;
    }
    
    // Fetch posts from API
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.posts && data.posts.length > 0) {
                postsContainer.innerHTML = '';
                
                // Sort posts by date (newest first)
                const sortedPosts = data.posts.sort((a, b) => {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
                
                // Render each post
                sortedPosts.forEach(post => {
                    const postElement = createPostElement(post);
                    postsContainer.appendChild(postElement);
                });
                
                // Add event listeners to post actions
                setupPostActionListeners();
            } else {
                postsContainer.innerHTML = '<div class="no-posts">No posts to display</div>';
            }
        })
        .catch(error => {
            console.error('Error loading posts:', error);
            postsContainer.innerHTML = '<div class="error-message">Failed to load posts. Please try again.</div>';
        });
}

// Listen for connections_updated event from other tabs and refresh connections count
window.addEventListener('storage', function(event) {
    if (event.key === 'connections_updated') {
        // Fetch and update connections count
        fetch('/api/users/stats')
            .then(response => response.json())
            .then(statsData => {
                if (statsData.success) {
                    const connectionsStatValue = document.querySelector('.stat:nth-child(1) .stat-value');
                    if (connectionsStatValue) {
                        connectionsStatValue.textContent = statsData.stats.connections;
                    }
                }
            })
            .catch(error => console.error('Error updating stats:', error));
    }
});