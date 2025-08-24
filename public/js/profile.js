// Profile and Search Functionality

// Check if user is logged in and redirect to their profile
document.addEventListener('DOMContentLoaded', function() {
    // Show loading animation
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }

    // Check if user is logged in
    fetch('/api/me')
        .then(response => {
            if (!response.ok) {
                throw new Error('Not authenticated');
            }
            return response.json();
        })
        .then(user => {
            // If we're not already on the user's profile page, redirect
            const currentPath = window.location.pathname;
            const userProfilePath = `/profile/${user.slug}`;
            
            if (currentPath === '/' || currentPath === '/index.html') {
                window.location.href = userProfilePath;
            } else {
                // Hide loading animation if we're already on a profile page
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
            }
        })
        .catch(error => {
            console.log('Not logged in or error:', error);
            // Hide loading animation
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        });
});

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    if (!searchInput || !searchResults) return;
    
    searchInput.addEventListener('input', debounce(function() {
        const query = this.value.trim();
        
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        fetch(`/api/search-users?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(users => {
                searchResults.innerHTML = '';
                
                if (users.length === 0) {
                    searchResults.innerHTML = '<div class="search-result-item">No users found</div>';
                } else {
                    users.forEach(user => {
                        const item = document.createElement('div');
                        item.className = 'search-result-item';
                        item.textContent = `${user.name || user.email} ${user.role ? '- ' + user.role : ''}`;
                        item.addEventListener('click', () => {
                            window.location.href = `/profile/${user.slug}`;
                        });
                        searchResults.appendChild(item);
                    });
                }
                
                searchResults.style.display = 'block';
            })
            .catch(error => {
                console.error('Search error:', error);
            });
    }, 300));
    
    // Hide search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
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

// Initialize search when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeSearch);