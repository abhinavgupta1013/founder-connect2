// Profile Redesign JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tabs
    initTabs();
    
    // Load user data
    loadUserData();
    
    // Load user posts
    loadUserPosts();
    
    // Load user experience
    loadUserExperience();
    
    // Load user media
    loadUserMedia();
    
    // Initialize profile edit functionality
    initProfileEdit();
    
    // Initialize avatar upload
    initAvatarUpload();
    
    // Initialize connection functionality
    initConnectionButtons();

    // Initialize create post functionality
    initCreatePostButtons();
    
    // Hide loading animation
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
});

// Tab functionality
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-pane');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show corresponding content
            const targetId = tab.getAttribute('data-tab') + '-tab';
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// Load user data
function loadUserData() {
    const userId = document.getElementById('user-id').value;
    if (!userId) return;
    
    // Show loading animation
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
    
    fetch(`/api/user/${userId}/profile`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load user data');
            }
            return response.json();
        })
        .then(data => {
            // Update connection count
            const connectionCount = document.querySelector('.stat-value');
            if (connectionCount && data.connectionCount !== undefined) {
                connectionCount.textContent = data.connectionCount;
            }
            
            // Update post count
            const postCount = document.querySelectorAll('.stat-value')[1];
            if (postCount && data.postCount !== undefined) {
                postCount.textContent = data.postCount;
            }
            
            // Update user bio if available
            if (data.bio) {
                const bioContent = document.querySelector('#bio-content p');
                if (bioContent) {
                    bioContent.textContent = data.bio;
                }
            }
            
            // Hide loading animation
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error loading user data:', error);
            // Hide loading animation on error
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        });
}

// Load user posts
function loadUserPosts() {
    const postsContainer = document.getElementById('posts-container');
    const postsEmptyState = document.getElementById('posts-empty-state');
    const userId = document.getElementById('user-id').value;
    
    if (!postsContainer || !userId) return;
    
    // Show loading animation
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
    
    // Clear container and show empty state initially
    postsContainer.innerHTML = '';
    postsContainer.appendChild(postsEmptyState);
    
    // Fetch user posts using the API endpoint
    fetch(`/api/posts/user/${userId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Clear container
            postsContainer.innerHTML = '';
            
            if (data.posts && data.posts.length > 0) {
                // Display posts
                data.posts.forEach(post => {
                    const postElement = createPostElement(post);
                    postsContainer.appendChild(postElement);
                });
            } else {
                // Show empty state if no posts
                postsContainer.appendChild(postsEmptyState);
            }
            
            // Hide loading animation
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error fetching posts:', error);
            
            // Show empty state on error
            postsContainer.innerHTML = '';
            postsContainer.appendChild(postsEmptyState);
            
            // Hide loading animation even on error
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        });
}
// End of loadUserPosts function
// This closing brace belongs to loadUserPosts function


// Create post element
function createPostElement(post) {
    const postCard = document.createElement('div');
    postCard.className = 'post-card';
    
    // Format date
    const postDate = new Date(post.createdAt || new Date());
    const formattedDate = postDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Generate media HTML
    let mediaHTML = '';
    if (post.media && post.media.length > 0) {
        mediaHTML = '<div class="post-media-container">';
        post.media.forEach(media => {
            if (media.type === 'image' || !media.type) {
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
    
    // Create post HTML
    postCard.innerHTML = `
        <div class="post-header">
            <div class="post-avatar">
                <img src="${post.author?.avatar || '/images/default-avatar.png'}" alt="${post.author?.name || 'User'}">
            </div>
            <div class="post-user-info">
                <div class="post-user-name">${post.author?.name || 'User'}</div>
                <div class="post-user-title">${post.author?.title || 'FOUNDER CONNECT Member'}</div>
                <div class="post-date">${formattedDate}</div>
            </div>
        </div>
        <div class="post-content">${post.content || post.caption || ''}</div>
        ${mediaHTML}
        <div class="post-actions">
            <div class="post-action-btn ${post.liked ? 'liked' : ''}" data-post-id="${post._id}">
                <i class="${post.liked ? 'fas' : 'far'} fa-thumbs-up"></i> ${post.liked ? 'Liked' : 'Like'}
            </div>
            <div class="post-action-btn" data-post-id="${post._id}">
                <i class="far fa-comment"></i> Comment
            </div>
            <div class="post-action-btn" data-post-id="${post._id}">
                <i class="far fa-share-square"></i> Share
            </div>
        </div>
    `;
    
    // Add event listeners for post actions
    const likeBtn = postCard.querySelector('.post-action-btn');
    if (likeBtn) {
        likeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const postId = this.getAttribute('data-post-id');
            likePost(postId, this);
        });
    }
    
    // Add click event to view post details
    postCard.addEventListener('click', () => {
        window.location.href = `/posts/${post._id}`;
    });
    
    return postCard;
}

// Like a post
function likePost(postId, likeButton) {
    fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to like post');
        }
        return response.json();
    })
    .then(data => {
        // Update like button UI
        if (data.liked) {
            likeButton.innerHTML = '<i class="fas fa-thumbs-up"></i> Liked';
            likeButton.classList.add('liked');
        } else {
            likeButton.innerHTML = '<i class="far fa-thumbs-up"></i> Like';
            likeButton.classList.remove('liked');
        }
    })
    .catch(error => {
        console.error('Error liking post:', error);
        showNotification('Failed to like post', 'error');
    });
}

// Load user experience
function loadUserExperience() {
    const experienceList = document.getElementById('experience-list');
    const experienceEmptyState = document.getElementById('experience-empty-state');
    const userId = document.getElementById('user-id').value;
    
    if (!experienceList || !userId) return;
    
    // Show loading animation
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
    
    // Clear container and show empty state initially
    experienceList.innerHTML = '';
    experienceList.appendChild(experienceEmptyState);
    
    // Fetch user experience
    fetch(`/api/user/${userId}/experience`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load experience');
            }
            return response.json();
        })
        .then(data => {
            // Clear container
            experienceList.innerHTML = '';
            
            if (data && data.length > 0) {
                // Display experience items
                data.forEach(experience => {
                    const experienceElement = createExperienceElement(experience);
                    experienceList.appendChild(experienceElement);
                });
            } else {
                // Show empty state if no experience
                experienceList.appendChild(experienceEmptyState);
            }
            
            // Hide loading animation
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error loading experience:', error);
            
            // Show empty state on error
            experienceList.innerHTML = '';
            experienceList.appendChild(experienceEmptyState);
            
            // Hide loading animation on error
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        });
}

// Create experience element
function createExperienceElement(experience) {
    const experienceItem = document.createElement('div');
    experienceItem.className = 'experience-item';
    
    // Format dates
    const startDate = new Date(experience.startDate || new Date());
    const formattedStartDate = startDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short'
    });
    
    let formattedEndDate = 'Present';
    if (experience.endDate) {
        const endDate = new Date(experience.endDate);
        formattedEndDate = endDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short'
        });
    }
    
    // Create experience HTML
    experienceItem.innerHTML = `
        <div class="experience-header">
            <div class="experience-company-logo">
                ${experience.companyLogo ? `<img src="${experience.companyLogo}" alt="${experience.company}">` : experience.company?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div class="experience-details">
                <div class="experience-title">${experience.title || 'Position'}</div>
                <div class="experience-company">${experience.company || 'Company'}</div>
                <div class="experience-date">${formattedStartDate} - ${formattedEndDate}</div>
                ${experience.location ? `<div class="experience-location"><i class="fas fa-map-marker-alt"></i> ${experience.location}</div>` : ''}
                ${experience.description ? `<div class="experience-description">${experience.description}</div>` : ''}
            </div>
        </div>
    `;
    
    // Add edit/delete buttons if it's the user's own profile
    const currentUserId = document.getElementById('current-user-id').value;
    const profileUserId = document.getElementById('user-id').value;
    
    if (currentUserId === profileUserId) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'experience-actions';
        actionsDiv.innerHTML = `
            <button class="btn btn-secondary edit-experience-btn" data-id="${experience._id}">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-secondary delete-experience-btn" data-id="${experience._id}">
                <i class="fas fa-trash"></i> Delete
            </button>
        `;
        
        experienceItem.appendChild(actionsDiv);
        
        // Add event listeners for edit and delete buttons
        const deleteBtn = experienceItem.querySelector('.delete-experience-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const experienceId = this.getAttribute('data-id');
                deleteExperience(experienceId, experienceItem);
            });
        }
    }
    
    return experienceItem;
}

// Delete experience
function deleteExperience(experienceId, experienceElement) {
    if (confirm('Are you sure you want to delete this experience?')) {
        // Show loading animation
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
        
        fetch(`/api/user/experience/${experienceId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete experience');
            }
            return response.json();
        })
        .then(data => {
            // Remove experience element from DOM
            experienceElement.remove();
            
            // Check if there are any experience items left
            const experienceList = document.getElementById('experience-list');
            if (experienceList.children.length === 0) {
                // Show empty state
                const experienceEmptyState = document.getElementById('experience-empty-state');
                experienceList.appendChild(experienceEmptyState);
            }
            
            // Show success notification
            showNotification('Experience deleted successfully', 'success');
            
            // Hide loading animation
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error deleting experience:', error);
            showNotification('Failed to delete experience', 'error');
            
            // Hide loading animation on error
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        });
    }
}

// Load user media
function loadUserMedia() {
    const mediaGrid = document.getElementById('media-grid');
    const mediaEmptyState = document.getElementById('media-empty-state');
    const userId = document.getElementById('user-id').value;
    
    if (!mediaGrid || !userId) return;
    
    // Show loading animation
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
    
    // Clear container and show empty state initially
    mediaGrid.innerHTML = '';
    mediaGrid.appendChild(mediaEmptyState);
    
    // Fetch user media
    fetch(`/api/media/user/${userId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load media');
            }
            return response.json();
        })
        .then(data => {
            // Clear container
            mediaGrid.innerHTML = '';
            
            if (data && data.length > 0) {
                // Display media items
                data.forEach(media => {
                    const mediaElement = createMediaElement(media);
                    mediaGrid.appendChild(mediaElement);
                });
            } else {
                // Show empty state if no media
                mediaGrid.appendChild(mediaEmptyState);
            }
            
            // Hide loading animation
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error loading media:', error);
            
            // Show empty state on error
            mediaGrid.innerHTML = '';
            mediaGrid.appendChild(mediaEmptyState);
            
            // Hide loading animation on error
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        });
}

// Create media element
function createMediaElement(media) {
    const mediaItem = document.createElement('div');
    mediaItem.className = 'media-item';
    mediaItem.dataset.type = media.type || 'image';
    mediaItem.dataset.src = media.url;
    
    // Create media content based on type
    if (media.type === 'video') {
        const video = document.createElement('video');
        video.src = media.url;
        video.muted = true;
        video.loop = true;
        video.onmouseover = function() { this.play(); };
        video.onmouseout = function() { this.pause(); };
        mediaItem.appendChild(video);
    } else {
        // Default to image
        const img = document.createElement('img');
        img.src = media.url;
        img.alt = media.title || 'Media';
        mediaItem.appendChild(img);
    }
    
    return mediaItem;
}

// Initialize profile edit functionality
function initProfileEdit() {
    // Profile Edit Modal
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const profileEditModal = document.getElementById('profile-edit-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const cancelProfileEdit = document.getElementById('cancel-profile-edit');
    const saveProfileEdit = document.getElementById('save-profile-edit');

    if (editProfileBtn && profileEditModal) {
        editProfileBtn.addEventListener('click', () => {
            profileEditModal.classList.add('active');
        });
    }

    // Close modal function
    function closeModal(modal) {
        if (modal) modal.classList.remove('active');
    }

    // Close modal buttons
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
            const skills = document.getElementById('edit-skills').value.split(',').map(s => s.trim()).filter(s => s);
            
            // Show loading animation
            const loadingElement = document.getElementById('loading');
            if (loadingElement) {
                loadingElement.style.display = 'flex';
            }
            
            // Send updated profile data to server
            fetch('/api/user/profile', {
                method: 'PUT',
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
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update profile');
                }
                return response.json();
            })
            .then(data => {
                // Update profile UI with new data
                const userName = document.querySelector('.user-name');
                if (userName) userName.textContent = data.name || 'User';
                
                const userTitle = document.querySelector('.user-title');
                if (userTitle) userTitle.textContent = data.title || 'FOUNDER CONNECT Member';
                
                const userLocation = document.querySelector('.user-location');
                if (userLocation) {
                    if (data.location) {
                        userLocation.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${data.location}`;
                        userLocation.style.display = 'flex';
                    } else {
                        userLocation.style.display = 'none';
                    }
                }
                
                // Update bio in the bio section
                const bioContent = document.querySelector('#bio-content p');
                if (bioContent) bioContent.textContent = data.bio || 'No bio added yet.';
                
                // Update bio input field in the bio edit section
                const bioInputField = document.getElementById('bio-input');
                if (bioInputField) bioInputField.value = data.bio || '';
                
                // Update bio input field in the profile edit modal
                const editBioField = document.getElementById('edit-bio');
                if (editBioField) editBioField.value = data.bio || '';
                
                // Close the modal
                closeModal(profileEditModal);
                
                // Show success notification
                showNotification('Profile updated successfully', 'success');
            })
            .catch(error => {
                console.error('Error updating profile:', error);
                showNotification('Failed to update profile', 'error');
            })
            .finally(() => {
                // Hide loading animation
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
            });
        });
    }
    
    // Bio section edit toggle
    const bioEditBtn = document.querySelector('[data-section="bio"]');
    const bioContent = document.getElementById('bio-content');
    const bioEdit = document.getElementById('bio-edit');
    const bioInput = document.getElementById('bio-input');
    const cancelBioEdit = document.querySelector('.cancel-edit[data-section="bio"]');
    const saveBioEdit = document.querySelector('.save-edit[data-section="bio"]');
    
    if (bioEditBtn && bioContent && bioEdit) {
        bioEditBtn.addEventListener('click', () => {
            bioContent.style.display = 'none';
            bioEdit.style.display = 'block';
            if (bioInput) bioInput.focus();
        });
    }
    
    if (cancelBioEdit && bioContent && bioEdit) {
        cancelBioEdit.addEventListener('click', () => {
            bioContent.style.display = 'block';
            bioEdit.style.display = 'none';
        });
    }
    
    if (saveBioEdit && bioInput && bioContent && bioEdit) {
        saveBioEdit.addEventListener('click', () => {
            const bio = bioInput.value;
            
            // Show loading animation
            const loadingElement = document.getElementById('loading');
            if (loadingElement) {
                loadingElement.style.display = 'flex';
            }
            
            // Send updated bio to server
            fetch('/api/user/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ bio })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update bio');
                }
                return response.json();
            })
            .then(data => {
                // Update bio content
                const bioContentP = document.querySelector('#bio-content p');
                if (bioContentP) bioContentP.textContent = data.bio || 'No bio added yet.';
                
                // Update bio input field in the profile edit modal
                const editBioField = document.getElementById('edit-bio');
                if (editBioField) editBioField.value = data.bio || '';
                
                // Show bio content and hide edit form
                bioContent.style.display = 'block';
                bioEdit.style.display = 'none';
                
                // Fetch complete user profile to update title in header
                fetch('/api/user/profile')
                .then(response => response.json())
                .then(userData => {
                    // Update user title in profile header
                    const userTitle = document.querySelector('.user-title');
                    if (userTitle) userTitle.textContent = userData.title || 'FOUNDER CONNECT Member';
                })
                .catch(error => {
                    console.error('Error fetching user profile:', error);
                });
                
                // Show success notification
                showNotification('Bio updated successfully', 'success');
            })
            .catch(error => {
                console.error('Error updating bio:', error);
                showNotification('Failed to update bio', 'error');
            })
            .finally(() => {
                // Hide loading animation
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
            });
        });
    }
}

// Initialize avatar upload
function initAvatarUpload() {
    const avatarInput = document.getElementById('avatar-input');
    const currentUserId = document.getElementById('current-user-id').value;
    const profileUserId = document.getElementById('user-id').value;
    const isOwnProfile = currentUserId === profileUserId;
    
    if (avatarInput && isOwnProfile) {
        avatarInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                
                // Check file type
                if (!file.type.match('image.*')) {
                    showNotification('Please select an image file', 'error');
                    return;
                }
                
                // Check file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showNotification('Image size should be less than 5MB', 'error');
                    return;
                }
                
                // Show loading animation
                const loadingElement = document.getElementById('loading');
                if (loadingElement) {
                    loadingElement.style.display = 'flex';
                }
                
                // Create form data
                const formData = new FormData();
                formData.append('avatar', file);
                
                // Upload avatar
                fetch('/api/user/avatar', {
                    method: 'POST',
                    body: formData
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to upload avatar');
                    }
                    return response.json();
                })
                .then(data => {
                    // Update avatar in UI
                    const avatarImg = document.querySelector('.avatar img');
                    const avatarPlaceholder = document.querySelector('.avatar-placeholder');
                    
                    if (data.avatar) {
                        if (avatarImg) {
                            avatarImg.src = data.avatar + '?t=' + new Date().getTime(); // Add timestamp to prevent caching
                        } else if (avatarPlaceholder) {
                            // Replace placeholder with image
                            const newImg = document.createElement('img');
                            newImg.src = data.avatar + '?t=' + new Date().getTime();
                            newImg.alt = data.name || 'User';
                            avatarPlaceholder.parentNode.replaceChild(newImg, avatarPlaceholder);
                        }
                    }
                    
                    // Show success notification
                    showNotification('Avatar updated successfully', 'success');
                })
                .catch(error => {
                    console.error('Error uploading avatar:', error);
                    showNotification('Failed to upload avatar', 'error');
                })
                .finally(() => {
                    // Hide loading animation
                    if (loadingElement) {
                        loadingElement.style.display = 'none';
                    }
                });
            }
        });
    }
}

// Initialize create post buttons
function initCreatePostButtons() {
    const createPostBtn = document.getElementById('create-post-btn');
    const createFirstPostBtn = document.getElementById('create-first-post-btn');

    const redirectToCreatePost = () => {
        window.location.href = '/create-post';
    };

    if (createPostBtn) {
        createPostBtn.addEventListener('click', redirectToCreatePost);
    }

    if (createFirstPostBtn) {
        createFirstPostBtn.addEventListener('click', redirectToCreatePost);
    }
}

// Initialize connection buttons
function initConnectionButtons() {
    const connectButton = document.getElementById('connect-button');
    const currentUserId = document.getElementById('current-user-id').value;
    const profileUserId = document.getElementById('user-id').value;
    const isOwnProfile = currentUserId === profileUserId;
    
    if (connectButton && !isOwnProfile) {
        connectButton.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            
            // Show loading animation
            const loadingElement = document.getElementById('loading');
            if (loadingElement) {
                loadingElement.style.display = 'flex';
            }
            
            let endpoint = '';
            let method = 'POST';
            
            switch (action) {
                case 'connect':
                    endpoint = '/api/connections/request';
                    break;
                case 'disconnect':
                    endpoint = '/api/connections/remove';
                    break;
                case 'cancel':
                    endpoint = '/api/connections/cancel';
                    break;
                default:
                    if (loadingElement) {
                        loadingElement.style.display = 'none';
                    }
                    return;
            }
            
            fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: profileUserId })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to ${action} connection`);
                }
                return response.json();
            })
            .then(data => {
                // Update button state based on new connection status
                updateConnectionButton(data.status || 'none');
                
                // Show success notification
                let message = '';
                switch (action) {
                    case 'connect':
                        message = 'Connection request sent';
                        break;
                    case 'disconnect':
                        message = 'Connection removed';
                        break;
                    case 'cancel':
                        message = 'Connection request cancelled';
                        break;
                }
                showNotification(message, 'success');
            })
            .catch(error => {
                console.error(`Error ${action} connection:`, error);
                showNotification(`Failed to ${action} connection`, 'error');
            })
            .finally(() => {
                // Hide loading animation
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
            });
        });
    }
    
    // Message button functionality
    const messageButton = document.getElementById('message-button');
    if (messageButton && !isOwnProfile) {
        messageButton.addEventListener('click', function() {
            window.location.href = `/messages?user=${profileUserId}`;
        });
    }
}

// Update connection button based on connection status
function updateConnectionButton(status) {
    const connectButton = document.getElementById('connect-button');
    if (!connectButton) return;
    
    let btnText = 'Connect';
    let btnAction = 'connect';
    let btnClass = 'btn-primary';
    
    switch (status) {
        case 'connected':
            btnText = 'Connected';
            btnAction = 'disconnect';
            btnClass = 'btn-outline';
            break;
        case 'pending':
            btnText = 'Pending...';
            btnAction = 'cancel';
            btnClass = 'btn-outline';
            break;
        case 'request':
            btnText = 'Respond';
            btnAction = 'respond';
            btnClass = 'btn-primary';
            break;
    }
    
    connectButton.textContent = btnText;
    connectButton.setAttribute('data-action', btnAction);
    connectButton.setAttribute('data-status', status);
    
    // Update button class
    connectButton.className = 'btn';
    connectButton.classList.add(btnClass);
}

// Show notification
function showNotification(message, type = 'info') {
    // Check if notification container exists, create if not
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Debounce function to limit API calls
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}