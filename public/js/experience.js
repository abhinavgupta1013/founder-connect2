// Experience Tab Functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeExperienceTab();
});

function initializeExperienceTab() {
    const addExperienceBtn = document.getElementById('add-experience-btn');
    const experienceList = document.getElementById('experience-list');
    
    if (!addExperienceBtn || !experienceList) return;
    
    // Add experience button click handler
    addExperienceBtn.addEventListener('click', function() {
        // Create experience form
        const experienceForm = document.createElement('div');
        experienceForm.className = 'experience-form';
        experienceForm.innerHTML = `
            <div class="experience-content">
                <div class="form-group">
                    <label for="experience-title">Title</label>
                    <input type="text" id="experience-title" placeholder="e.g. Software Engineer">
                </div>
                <div class="form-group">
                    <label for="experience-company">Company</label>
                    <input type="text" id="experience-company" placeholder="e.g. Tech Company">
                </div>
                <div class="form-group">
                    <label for="experience-start-date">Start Date</label>
                    <input type="date" id="experience-start-date">
                </div>
                <div class="form-group">
                    <label for="experience-end-date">End Date</label>
                    <input type="date" id="experience-end-date">
                    <div class="checkbox-group">
                        <input type="checkbox" id="current-position">
                        <label for="current-position">I currently work here</label>
                    </div>
                </div>
                <div class="form-group">
                    <label for="experience-description">Description</label>
                    <textarea id="experience-description" rows="4" placeholder="Describe your role and responsibilities"></textarea>
                </div>
                <div class="form-actions">
                    <button class="btn btn-secondary" id="cancel-experience">Cancel</button>
                    <button class="btn btn-primary" id="save-experience">Save</button>
                </div>
            </div>
        `;
        
        // Clear any empty state
        experienceList.innerHTML = '';
        experienceList.appendChild(experienceForm);
        
        // Setup cancel button
        document.getElementById('cancel-experience').addEventListener('click', function() {
            experienceForm.remove();
            loadExperiences();
        });
        
        // Setup save button
        document.getElementById('save-experience').addEventListener('click', function() {
            const title = document.getElementById('experience-title').value;
            const company = document.getElementById('experience-company').value;
            const startDate = document.getElementById('experience-start-date').value;
            const endDate = document.getElementById('current-position').checked ? 'Present' : document.getElementById('experience-end-date').value;
            const description = document.getElementById('experience-description').value;
            
            if (!title || !company || !startDate) {
                alert('Please fill in all required fields');
                return;
            }
            
            document.getElementById('loading').style.display = 'flex';
            
            // For demo purposes, we'll just create a mock experience object
            // In a real app, you would save this to the database via an API call
            const newExperience = {
                _id: 'exp_' + Date.now(),
                title: title,
                company: company,
                startDate: startDate,
                endDate: endDate,
                currentPosition: document.getElementById('current-position').checked,
                description: description
            };
            
            // Simulate API call delay
            setTimeout(() => {
                // Store in localStorage for demo purposes
                const userId = document.getElementById('profile-user-id')?.value || 'current_user';
                const experiences = JSON.parse(localStorage.getItem(`experiences_${userId}`) || '[]');
                experiences.push(newExperience);
                localStorage.setItem(`experiences_${userId}`, JSON.stringify(experiences));
                
                document.getElementById('loading').style.display = 'none';
                loadExperiences();
            }, 500);
        });
        
        // Setup current position checkbox
        document.getElementById('current-position').addEventListener('change', function() {
            const endDateInput = document.getElementById('experience-end-date');
            endDateInput.disabled = this.checked;
            if (this.checked) {
                endDateInput.value = '';
            }
        });
    });
    
    // Load experiences
    loadExperiences();
}

// Load experiences from localStorage (for demo purposes)
function loadExperiences() {
    const experienceList = document.getElementById('experience-list');
    const userId = document.getElementById('profile-user-id')?.value || 'current_user';
    
    if (!experienceList) return;
    
    document.getElementById('loading').style.display = 'flex';
    
    // Simulate API call delay
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
        
        // Get experiences from localStorage
        const experiences = JSON.parse(localStorage.getItem(`experiences_${userId}`) || '[]');
        
        if (experiences.length > 0) {
            experienceList.innerHTML = '';
            
            // Create experience timeline
            const timeline = document.createElement('div');
            timeline.className = 'experience-timeline';
            
            experiences.forEach(exp => {
                const experienceItem = createExperienceElement(exp);
                timeline.appendChild(experienceItem);
            });
            
            experienceList.appendChild(timeline);
            
            // Add event listeners for edit/delete buttons
            setupExperienceActionListeners();
        } else {
            // Show empty state
            experienceList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-briefcase"></i>
                    <p>No experience added yet</p>
                </div>
            `;
        }
    }, 300);
}

// Create experience element
function createExperienceElement(experience) {
    const experienceItem = document.createElement('div');
    experienceItem.className = 'experience-item';
    experienceItem.dataset.id = experience._id;
    
    // Format dates for display
    let startDate = experience.startDate;
    let endDate = experience.currentPosition ? 'Present' : experience.endDate;
    
    // Try to format dates if they're valid
    try {
        const startDateObj = new Date(experience.startDate);
        if (!isNaN(startDateObj)) {
            startDate = startDateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        }
        
        if (!experience.currentPosition) {
            const endDateObj = new Date(experience.endDate);
            if (!isNaN(endDateObj)) {
                endDate = endDateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            }
        }
    } catch (e) {
        console.error('Error formatting dates:', e);
    }
    
    experienceItem.innerHTML = `
        <div class="experience-marker"></div>
        <div class="experience-content">
            <div class="experience-header">
                <h4>${experience.title}</h4>
                <div class="experience-actions">
                    <button class="edit-experience" data-id="${experience._id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-experience" data-id="${experience._id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
            <div class="experience-company">${experience.company}</div>
            <div class="experience-date">${startDate} - ${endDate}</div>
            <div class="experience-description">${experience.description || ''}</div>
        </div>
    `;
    
    return experienceItem;
}

// Setup experience action listeners
function setupExperienceActionListeners() {
    // Edit experience
    document.querySelectorAll('.edit-experience').forEach(btn => {
        btn.addEventListener('click', function() {
            const experienceId = this.dataset.id;
            const experienceItem = document.querySelector(`.experience-item[data-id="${experienceId}"]`);
            
            // Get current experience data
            const title = experienceItem.querySelector('h4').textContent;
            const company = experienceItem.querySelector('.experience-company').textContent;
            const dateText = experienceItem.querySelector('.experience-date').textContent;
            const description = experienceItem.querySelector('.experience-description').textContent;
            
            // Parse dates
            const dates = dateText.split(' - ');
            const startDateText = dates[0];
            const endDateText = dates[1];
            const isCurrentPosition = endDateText === 'Present';
            
            // Create edit form
            const editForm = document.createElement('div');
            editForm.className = 'experience-form';
            editForm.innerHTML = `
                <div class="experience-content">
                    <div class="form-group">
                        <label for="edit-experience-title">Title</label>
                        <input type="text" id="edit-experience-title" value="${title}">
                    </div>
                    <div class="form-group">
                        <label for="edit-experience-company">Company</label>
                        <input type="text" id="edit-experience-company" value="${company}">
                    </div>
                    <div class="form-group">
                        <label for="edit-experience-start-date">Start Date</label>
                        <input type="date" id="edit-experience-start-date">
                    </div>
                    <div class="form-group">
                        <label for="edit-experience-end-date">End Date</label>
                        <input type="date" id="edit-experience-end-date" ${isCurrentPosition ? 'disabled' : ''}>
                        <div class="checkbox-group">
                            <input type="checkbox" id="edit-current-position" ${isCurrentPosition ? 'checked' : ''}>
                            <label for="edit-current-position">I currently work here</label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="edit-experience-description">Description</label>
                        <textarea id="edit-experience-description" rows="4">${description}</textarea>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-secondary" id="cancel-edit-experience">Cancel</button>
                        <button class="btn btn-primary" id="update-experience" data-id="${experienceId}">Update</button>
                    </div>
                </div>
            `;
            
            // Replace experience item with edit form
            experienceItem.replaceWith(editForm);
            
            // Setup cancel button
            document.getElementById('cancel-edit-experience').addEventListener('click', function() {
                editForm.replaceWith(experienceItem);
            });
            
            // Setup current position checkbox
            document.getElementById('edit-current-position').addEventListener('change', function() {
                const endDateInput = document.getElementById('edit-experience-end-date');
                endDateInput.disabled = this.checked;
                if (this.checked) {
                    endDateInput.value = '';
                }
            });
            
            // Setup update button
            document.getElementById('update-experience').addEventListener('click', function() {
                const title = document.getElementById('edit-experience-title').value;
                const company = document.getElementById('edit-experience-company').value;
                const startDate = document.getElementById('edit-experience-start-date').value || new Date().toISOString().split('T')[0]; // Default to today
                const endDate = document.getElementById('edit-current-position').checked ? 'Present' : 
                               (document.getElementById('edit-experience-end-date').value || new Date().toISOString().split('T')[0]);
                const description = document.getElementById('edit-experience-description').value;
                
                if (!title || !company) {
                    alert('Please fill in all required fields');
                    return;
                }
                
                document.getElementById('loading').style.display = 'flex';
                
                // For demo purposes, update the experience in localStorage
                const userId = document.getElementById('profile-user-id')?.value || 'current_user';
                const experiences = JSON.parse(localStorage.getItem(`experiences_${userId}`) || '[]');
                const index = experiences.findIndex(exp => exp._id === experienceId);
                
                if (index !== -1) {
                    experiences[index] = {
                        ...experiences[index],
                        title,
                        company,
                        startDate,
                        endDate,
                        currentPosition: document.getElementById('edit-current-position').checked,
                        description
                    };
                    
                    localStorage.setItem(`experiences_${userId}`, JSON.stringify(experiences));
                }
                
                // Simulate API call delay
                setTimeout(() => {
                    document.getElementById('loading').style.display = 'none';
                    loadExperiences();
                }, 500);
            });
        });
    });
    
    // Delete experience
    document.querySelectorAll('.delete-experience').forEach(btn => {
        btn.addEventListener('click', function() {
            const experienceId = this.dataset.id;
            
            if (confirm('Are you sure you want to delete this experience?')) {
                document.getElementById('loading').style.display = 'flex';
                
                // For demo purposes, remove the experience from localStorage
                const userId = document.getElementById('profile-user-id')?.value || 'current_user';
                let experiences = JSON.parse(localStorage.getItem(`experiences_${userId}`) || '[]');
                experiences = experiences.filter(exp => exp._id !== experienceId);
                localStorage.setItem(`experiences_${userId}`, JSON.stringify(experiences));
                
                // Simulate API call delay
                setTimeout(() => {
                    document.getElementById('loading').style.display = 'none';
                    loadExperiences();
                }, 500);
            }
        });
    });
}