document.addEventListener('DOMContentLoaded', function() {
    // Hide loading animation when page is loaded
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }

    // Get user ID from hidden input
    const userId = document.getElementById('user-id').value;
    const currentProfileId = document.getElementById('profile-user-id') ? 
        document.getElementById('profile-user-id').value : userId;
    
    // Track profile view if viewing someone else's profile
    if (userId !== currentProfileId) {
        trackProfileView(currentProfileId);
    }
    
    // Load analytics data if on own profile
    if (userId === currentProfileId) {
        loadAnalytics();
    }

    // Tab Navigation
    const tabs = document.querySelectorAll('.tab');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs and panes
            tabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show corresponding tab pane
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            
            // Load content for the tab if needed
            if (tabId === 'posts-tab') {
                loadPosts();
            } else if (tabId === 'media-tab') {
                loadMedia();
            }
        });
    });

    // Load posts when page loads (since Posts tab is active by default)
    loadPosts();
    
    // Load connections if on connections tab
    const connectionsTab = document.getElementById('connections-tab');
    if (connectionsTab && connectionsTab.classList.contains('active')) {
        loadConnections();
    }

    // Edit Profile Modal
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const editProfileModal = document.getElementById('profile-edit-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');

    if (editProfileBtn && editProfileModal) {
        editProfileBtn.addEventListener('click', function() {
            editProfileModal.style.display = 'block';
        });

        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Close modal when clicking outside of it
        window.addEventListener('click', function(event) {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        });
    }

    // Save Profile Changes
    const saveProfileBtn = document.getElementById('save-profile');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', function() {
            const name = document.getElementById('edit-name').value;
            const title = document.getElementById('edit-title').value;
            const location = document.getElementById('edit-location').value;
            const website = document.getElementById('edit-website').value;
            const bio = document.getElementById('edit-bio').value;
            const skillsInput = document.getElementById('edit-skills').value;
            const skills = skillsInput.split(',').map(skill => skill.trim()).filter(skill => skill);
            
            // Show loading animation
            if (loadingElement) {
                loadingElement.style.display = 'flex';
            }
            
            // Send AJAX request to update profile
            fetch('/api/users/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, title, location, website, bio, skills })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update UI with new data
                    document.querySelector('.user-name').textContent = name;
                    document.querySelector('.user-title').textContent = title;
                    
                    // Update bio and skills sections if they're visible
                    if (bio) {
                        document.getElementById('bio-content').innerHTML = `<p>${bio}</p>`;
                    }
                    
                    if (skills.length > 0) {
                        const skillsHtml = skills.map(skill => `<div class="skill-tag">${skill}</div>`).join('');
                        document.getElementById('skills-content').innerHTML = `<div class="skills-list">${skillsHtml}</div>`;
                        
                        // Update skills count in user stats
                        const skillsStatValue = document.querySelector('.stat:nth-child(3) .stat-value');
                        if (skillsStatValue) {
                            skillsStatValue.textContent = skills.length;
                        }
                    }
                    
                    // Close modal
                    editProfileModal.style.display = 'none';
                } else {
                    alert('Failed to update profile: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error updating profile:', error);
                alert('An error occurred while updating your profile');
            })
            .finally(() => {
                // Hide loading animation
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
            });
        });
    }

    // Bio Tab Functionality
    const editBioBtn = document.getElementById('edit-bio-btn');
    const bioContent = document.getElementById('bio-content');
    const bioEdit = document.getElementById('bio-edit');
    const saveBioBtn = document.getElementById('save-bio');
    const cancelBioBtn = document.getElementById('cancel-bio-edit');

    if (editBioBtn && bioContent && bioEdit) {
        editBioBtn.addEventListener('click', function() {
            bioContent.style.display = 'none';
            bioEdit.style.display = 'block';
        });

        if (cancelBioBtn) {
            cancelBioBtn.addEventListener('click', function() {
                bioContent.style.display = 'block';
                bioEdit.style.display = 'none';
            });
        }

        if (saveBioBtn) {
            saveBioBtn.addEventListener('click', function() {
                const bio = document.getElementById('bio-input').value;
                
                // Show loading animation
                if (loadingElement) {
                    loadingElement.style.display = 'flex';
                }
                
                // Send AJAX request to update bio
                fetch('/api/users/update-bio', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ bio })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update UI with new bio
                        if (bio) {
                            bioContent.innerHTML = `<p>${bio}</p>`;
                        } else {
                            bioContent.innerHTML = `
                                <div class="empty-state">
                                    <i class="fas fa-user empty-icon"></i>
                                    <p>No bio added yet</p>
                                    <p class="empty-subtext">Tell others about yourself and what you're passionate about</p>
                                </div>
                            `;
                        }
                        
                        // Show bio content, hide edit form
                        bioContent.style.display = 'block';
                        bioEdit.style.display = 'none';
                    } else {
                        alert('Failed to update bio: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error updating bio:', error);
                    alert('An error occurred while updating your bio');
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

    // Skills Functionality
    const editSkillsBtn = document.getElementById('edit-skills-btn');
    const skillsContent = document.getElementById('skills-content');
    const skillsEdit = document.getElementById('skills-edit');
    const saveSkillsBtn = document.getElementById('save-skills');
    const cancelSkillsBtn = document.getElementById('cancel-skills-edit');

    if (editSkillsBtn && skillsContent && skillsEdit) {
        editSkillsBtn.addEventListener('click', function() {
            skillsContent.style.display = 'none';
            skillsEdit.style.display = 'block';
        });

        if (cancelSkillsBtn) {
            cancelSkillsBtn.addEventListener('click', function() {
                skillsContent.style.display = 'block';
                skillsEdit.style.display = 'none';
            });
        }

        if (saveSkillsBtn) {
            saveSkillsBtn.addEventListener('click', function() {
                const skillsInput = document.getElementById('skills-input').value;
                const skills = skillsInput.split(',').map(skill => skill.trim()).filter(skill => skill);
                
                // Show loading animation
                if (loadingElement) {
                    loadingElement.style.display = 'flex';
                }
                
                // Send AJAX request to update skills
                fetch('/api/users/update-skills', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ skills })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update UI with new skills
                        if (skills.length > 0) {
                            const skillsHtml = skills.map(skill => `<div class="skill-tag">${skill}</div>`).join('');
                            skillsContent.innerHTML = `<div class="skills-list">${skillsHtml}</div>`;
                            
                            // Update skills count in user stats
                            const skillsStatValue = document.querySelector('.stat:nth-child(3) .stat-value');
                            if (skillsStatValue) {
                                skillsStatValue.textContent = skills.length;
                            }
                        } else {
                            skillsContent.innerHTML = `
                                <div class="empty-state">
                                    <i class="fas fa-tools empty-icon"></i>
                                    <p>No skills added yet</p>
                                    <p class="empty-subtext">Add your skills to showcase your expertise</p>
                                </div>
                            `;
                        }
                        
                        // Show skills content, hide edit form
                        skillsContent.style.display = 'block';
                        skillsEdit.style.display = 'none';
                    } else {
                        alert('Failed to update skills: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error updating skills:', error);
                    alert('An error occurred while updating your skills');
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

    // Experience Tab Functionality
    const addExperienceBtn = document.getElementById('add-experience-btn');
    const experienceModal = document.getElementById('experience-edit-modal');
    const saveExperienceBtn = document.getElementById('save-experience');
    const cancelExperienceBtn = document.getElementById('cancel-experience-edit');

    if (addExperienceBtn && experienceModal) {
        addExperienceBtn.addEventListener('click', function() {
            // Clear form fields for new experience
            document.getElementById('experience-title').value = '';
            document.getElementById('experience-company').value = '';
            document.getElementById('experience-start-date').value = '';
            document.getElementById('experience-end-date').value = '';
            document.getElementById('experience-description').value = '';
            document.getElementById('experience-index').value = ''; // Clear index for new entry
            
            // Show modal
            experienceModal.style.display = 'block';
        });
    }

    // Edit Experience
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('edit-experience') || 
            event.target.closest('.edit-experience')) {
            const button = event.target.classList.contains('edit-experience') ? 
                          event.target : event.target.closest('.edit-experience');
            const index = button.getAttribute('data-index');
            const experienceItem = document.querySelector(`.experience-item[data-index="${index}"]`);
            
            if (experienceItem && experienceModal) {
                // Fill form with existing data
                document.getElementById('experience-title').value = 
                    experienceItem.querySelector('h4').textContent;
                document.getElementById('experience-company').value = 
                    experienceItem.querySelector('.experience-company').textContent;
                
                const dateText = experienceItem.querySelector('.experience-date').textContent;
                const dates = dateText.split(' - ');
                document.getElementById('experience-start-date').value = dates[0];
                document.getElementById('experience-end-date').value = 
                    dates[1] === 'Present' ? '' : dates[1];
                
                document.getElementById('experience-description').value = 
                    experienceItem.querySelector('.experience-description').textContent;
                document.getElementById('experience-index').value = index; // Store index for update
                
                // Show modal
                experienceModal.style.display = 'block';
            }
        }
    });

    // Delete Experience
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('delete-experience') || 
            event.target.closest('.delete-experience')) {
            if (confirm('Are you sure you want to delete this experience?')) {
                const button = event.target.classList.contains('delete-experience') ? 
                              event.target : event.target.closest('.delete-experience');
                const index = button.getAttribute('data-index');
                
                // Show loading animation
                if (loadingElement) {
                    loadingElement.style.display = 'flex';
                }
                
                // Send AJAX request to delete experience
                fetch('/api/users/delete-experience', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ index })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Remove experience item from UI
                        const experienceItem = document.querySelector(`.experience-item[data-index="${index}"]`);
                        if (experienceItem) {
                            experienceItem.remove();
                        }
                        
                        // If no more experiences, show empty state
                        const experienceItems = document.querySelectorAll('.experience-item');
                        if (experienceItems.length === 0) {
                            document.getElementById('experience-timeline').innerHTML = `
                                <div class="empty-state">
                                    <i class="fas fa-briefcase empty-icon"></i>
                                    <p>No experience added yet</p>
                                    <p class="empty-subtext">Add your work experience to showcase your professional journey</p>
                                </div>
                            `;
                        }
                    } else {
                        alert('Failed to delete experience: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error deleting experience:', error);
                    alert('An error occurred while deleting your experience');
                })
                .finally(() => {
                    // Hide loading animation
                    if (loadingElement) {
                        loadingElement.style.display = 'none';
                    }
                });
            }
        }
    });

    // Save Experience
    if (saveExperienceBtn) {
        saveExperienceBtn.addEventListener('click', function() {
            const title = document.getElementById('experience-title').value;
            const company = document.getElementById('experience-company').value;
            const startDate = document.getElementById('experience-start-date').value;
            const endDate = document.getElementById('experience-end-date').value;
            const description = document.getElementById('experience-description').value;
            const index = document.getElementById('experience-index').value;
            
            if (!title || !company || !startDate) {
                alert('Please fill in all required fields');
                return;
            }
            
            // Show loading animation
            if (loadingElement) {
                loadingElement.style.display = 'flex';
            }
            
            // Prepare data for API call
            const experienceData = {
                title,
                company,
                startDate,
                endDate: endDate || 'Present',
                description
            };
            
            // If index exists, it's an update; otherwise, it's a new entry
            const apiEndpoint = index ? '/api/users/update-experience' : '/api/users/add-experience';
            if (index) {
                experienceData.index = index;
            }
            
            // Send AJAX request
            fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(experienceData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Close modal
                    experienceModal.style.display = 'none';
                    
                    // Refresh experience section
                    location.reload(); // Simple solution - reload page to show updated data
                } else {
                    alert('Failed to save experience: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error saving experience:', error);
                alert('An error occurred while saving your experience');
            })
            .finally(() => {
                // Hide loading animation
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
            });
        });
    }

    // Avatar Upload
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', function(event) {
            if (event.target.files && event.target.files[0]) {
                const file = event.target.files[0];
                
                // Show loading animation
                if (loadingElement) {
                    loadingElement.style.display = 'flex';
                }
                
                // Create form data for file upload
                const formData = new FormData();
                formData.append('avatar', file);
                
                // Send AJAX request to upload avatar
                fetch('/api/users/upload-avatar', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update avatar in UI
                        const avatarUrl = data.avatarUrl;
                        const profilePic = document.querySelector('.profile-pic');
                        
                        if (profilePic) {
                            // Replace placeholder with actual image
                            profilePic.innerHTML = `
                                <img src="${avatarUrl}" alt="Profile Picture">
                                <div class="avatar-upload">
                                    <label for="avatar-input">
                                        <i class="fas fa-camera"></i>
                                    </label>
                                    <input type="file" id="avatar-input" accept="image/*" style="display: none;">
                                </div>
                            `;
                            
                            // Update header avatar as well
                            const headerAvatar = document.querySelector('.avatar-dropdown');
                            if (headerAvatar) {
                                headerAvatar.innerHTML = `
                                    <img src="${avatarUrl}" alt="Profile Picture" class="avatar-small">
                                    <div class="dropdown-content">
                                        <a href="/settings">Settings</a>
                                        <a href="/logout">Logout</a>
                                    </div>
                                `;
                            }
                            
                            // Reattach event listener to new input element
                            const newAvatarInput = document.getElementById('avatar-input');
                            if (newAvatarInput) {
                                newAvatarInput.addEventListener('change', this);
                            }
                        }
                    } else {
                        alert('Failed to upload avatar: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error uploading avatar:', error);
                    alert('An error occurred while uploading your avatar');
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

    // Load Posts Function
    function loadPosts() {
        const postsContainer = document.getElementById('posts-container');
        if (!postsContainer) return;
        postsContainer.innerHTML = '<div class="loading-posts">Loading posts...</div>';
        fetch(`/api/v2/posts/user/${userId}`)  // Updated to use V2 API endpoint
            .then(response => response.json())
            .then(data => {
                if (data.success && data.posts) {
                    if (data.posts.length > 0) {
                        const postsStatValue = document.querySelector('.stat:nth-child(2) .stat-value');
                        if (postsStatValue) {
                            postsStatValue.textContent = data.posts.length;
                        }
                        
                        postsContainer.innerHTML = '';
                        data.posts.forEach(post => {
                            const postDate = new Date(post.createdAt);
                            const formattedDate = postDate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            });
                            let mediaHtml = '';
                            if (post.media && Array.isArray(post.media) && post.media.length > 0) {
                                mediaHtml = `<div class="post-media-grid">` + post.media.map(media => {
                                    if (media.type && media.type.startsWith('video')) {
                                        return `<video src="${media.url}" controls class="post-media-item"></video>`;
                                    } else {
                                        return `<img src="${media.url}" alt="Post Media" class="post-media-item">`;
                                    }
                                }).join('') + `</div>`;
                            } else if (post.image) {
                                mediaHtml = `<img src="${post.image}" alt="Post Image" class="post-image">`;
                            }
                            const postHtml = `
                                <div class="post-card">
                                    <div class="post-header">
                                        <img src="${post.author.avatar || '/img/default-avatar.png'}" alt="${post.author.name}" class="post-avatar">
                                        <div class="post-user-info">
                                            <div class="post-username">${post.author.name}</div>
                                            <div class="post-time">${formattedDate}</div>
                                        </div>
                                    </div>
                                    <div class="post-content">
                                        <p class="post-caption">${post.content}</p>
                                        ${mediaHtml}
                                    </div>
                                    <div class="post-actions">
                                        <div class="post-action">
                                            <i class="far fa-heart"></i> Like
                                        </div>
                                        <div class="post-action">
                                            <i class="far fa-comment"></i> Comment
                                        </div>
                                        <div class="post-action">
                                            <i class="far fa-share-square"></i> Share
                                        </div>
                                    </div>
                                </div>
                            `;
                            postsContainer.innerHTML += postHtml;
                        });
                    } else {
                        postsContainer.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-th empty-icon"></i>
                                <p>No posts yet</p>
                                <p class="empty-subtext">Share your thoughts, ideas, or projects with the community</p>
                            </div>
                        `;
                    }
                } else {
                    postsContainer.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-exclamation-circle empty-icon"></i>
                            <p>Failed to load posts</p>
                            <p class="empty-subtext">Please try again later</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('Error loading posts:', error);
                postsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle empty-icon"></i>
                        <p>Error loading posts</p>
                        <p class="empty-subtext">Please try again later</p>
                    </div>
                `;
            });
    }

    // Load Media Function
    function loadMedia() {
        const mediaContainer = document.getElementById('media-grid');
        if (!mediaContainer) return;
        
        mediaContainer.innerHTML = '<div class="loading-media">Loading media...</div>';
        
        fetch(`/api/posts/user/${userId}/media`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.media) {
                    if (data.media.length > 0) {
                        // Render media grid
                        mediaContainer.innerHTML = '';
                        const mediaGrid = mediaContainer;
                        
                        data.media.forEach(item => {
                            const mediaHtml = `
                                <div class="media-item" data-src="${item.url}">
                                    <img src="${item.url}" alt="Media">
                                </div>
                            `;
                            
                            mediaGrid.innerHTML += mediaHtml;
                        });
                        
                        // Add click event to open lightbox
                        const mediaItems = document.querySelectorAll('.media-item');
                        mediaItems.forEach(item => {
                            item.addEventListener('click', function() {
                                const imgSrc = this.getAttribute('data-src');
                                const lightbox = document.getElementById('media-lightbox');
                                const lightboxImage = document.getElementById('lightbox-image');
                                
                                if (lightbox && lightboxImage) {
                                    lightboxImage.src = imgSrc;
                                    lightbox.style.display = 'block';
                                }
                            });
                        });
                    } else {
                        mediaContainer.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-images empty-icon"></i>
                                <p>No media yet</p>
                                <p class="empty-subtext">Share photos and images in your posts</p>
                            </div>
                        `;
                    }
                } else {
                    mediaContainer.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-exclamation-circle empty-icon"></i>
                            <p>Failed to load media</p>
                            <p class="empty-subtext">Please try again later</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('Error loading media:', error);
                mediaContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle empty-icon"></i>
                        <p>Error loading media</p>
                        <p class="empty-subtext">Please try again later</p>
                    </div>
                `;
            });
    }

    // Close Lightbox
    const closeLightbox = document.querySelector('.close-lightbox');
    const lightbox = document.getElementById('media-lightbox');
    
    if (closeLightbox && lightbox) {
        closeLightbox.addEventListener('click', function() {
            lightbox.style.display = 'none';
        });
        
        // Close lightbox when clicking outside of image
        lightbox.addEventListener('click', function(event) {
            if (event.target === lightbox) {
                lightbox.style.display = 'none';
            }
        });
    }
});