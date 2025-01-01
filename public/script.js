let currentUser = null;
let isLogin = true;
let ws;

const authForm = document.getElementById('auth-form');
const authSubmit = document.getElementById('auth-submit');
const toggleAuth = document.getElementById('toggle-auth');
const homeLink = document.getElementById('home-link');
const profileLink = document.getElementById('profile-link');
const createPostLink = document.getElementById('create-post-link');
const createStoryLink = document.getElementById('create-story-link');
const logoutLink = document.getElementById('logout-link');

const authSection = document.getElementById('auth-section');
const feedSection = document.getElementById('feed-section');
const profileSection = document.getElementById('profile-section');
const createPostSection = document.getElementById('create-post-section');
const createStorySection = document.getElementById('create-story-section');

const postForm = document.getElementById('post-form');
const postMedia = document.getElementById('post-media');
const mediaPreview = document.getElementById('media-preview');

const storyForm = document.getElementById('story-form');
const storyMedia = document.getElementById('story-media');
const storyPreview = document.getElementById('story-preview');

const modal = document.getElementById('post-modal');
const modalContent = document.getElementById('modal-post-content');

const storyModal = document.getElementById('story-modal');
const storyDisplay = document.getElementById('story-display');

const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

function initWebSocket() {
    ws = new WebSocket(`ws://${window.location.host}`);
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        switch(data.type) {
            case 'newPost':
                addNewPost(data.data);
                break;
            case 'newStory':
                addNewStory(data.data);
                break;
            case 'likePost':
                updatePostLikes(data.data);
                break;
            case 'newComment':
                addNewComment(data.data);
                break;
        }
    };

    ws.onclose = () => {
        console.log('WebSocket connection closed. Retrying...');
        setTimeout(initWebSocket, 3000);
    };
}

// Authentication
toggleAuth.addEventListener('click', (e) => {
    e.preventDefault();
    isLogin = !isLogin;
    authSubmit.textContent = isLogin ? 'Login' : 'Register';
    toggleAuth.textContent = isLogin ? 'Register' : 'Login';
    document.getElementById('email').style.display = isLogin ? 'none' : 'block';
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const email = document.getElementById('email').value;

    try {
        const response = await fetch(`/api/${isLogin ? 'login' : 'register'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email }),
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            showLoggedInState();
            loadFeed();
            initWebSocket();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
});

// Navigation
homeLink.addEventListener('click', (e) => {
    e.preventDefault();
    loadFeed();
});

profileLink.addEventListener('click', (e) => {
    e.preventDefault();
    loadProfile(currentUser.id);
});

createPostLink.addEventListener('click', (e) => {
    e.preventDefault();
    showSection(createPostSection);
});

createStoryLink.addEventListener('click', (e) => {
    e.preventDefault();
    showSection(createStorySection);
});

logoutLink.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
});

// Create Post
postMedia.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            mediaPreview.innerHTML = file.type.startsWith('image') 
                ? `<img src="${e.target.result}" alt="Preview">`
                : `<video src="${e.target.result}" controls></video>`;
        };
        reader.readAsDataURL(file);
    }
});

postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const caption = document.getElementById('post-caption').value;
    const mediaFile = postMedia.files[0];

    if (!mediaFile) {
        alert('Please select an image or video to post.');
        return;
    }

    const formData = new FormData();
    formData.append('caption', caption);
    formData.append('media', mediaFile);

    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (response.ok) {
            postForm.reset();
            mediaPreview.innerHTML = '';
            loadFeed();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while creating the post. Please try again.');
    }
});

// Create Story
storyMedia.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            storyPreview.innerHTML = file.type.startsWith('image') 
                ? `<img src="${e.target.result}" alt="Preview">`
                : `<video src="${e.target.result}" controls></video>`;
        };
        reader.readAsDataURL(file);
    }
});

storyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mediaFile = storyMedia.files[0];

    if (!mediaFile) {
        alert('Please select an image or video for your story.');
        return;
    }

    const formData = new FormData();
    formData.append('media', mediaFile);

    try {
        const response = await fetch('/api/stories', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (response.ok) {
            storyForm.reset();
            storyPreview.innerHTML = '';
            loadFeed();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while creating the story. Please try again.');
    }
});

// Load Feed
async function loadFeed() {
    try {
        const [postsResponse, storiesResponse] = await Promise.all([
            fetch('/api/posts'),
            fetch('/api/stories')
        ]);
        const postsData = await postsResponse.json();
        const storiesData = await storiesResponse.json();

        const storiesContainer = document.getElementById('stories-container');
        const postsContainer = document.getElementById('posts-container');

        storiesContainer.innerHTML = `
            <div class="story add-story">
                <div class="story-avatar">
                    <i class="fas fa-plus"></i>
                </div>
                <span>Your Story</span>
            </div>
        `;

        storiesData.stories.forEach(story => {
            const storyElement = document.createElement('div');
            storyElement.classList.add('story', 'animate-in');
            storyElement.innerHTML = `
                <div class="story-avatar">
                    <img src="${story.authorAvatar || 'default-avatar.jpg'}" alt="${story.author}">
                </div>
                <span>${story.author}</span>
            `;
            storyElement.addEventListener('click', () => showStory(story));
            storiesContainer.appendChild(storyElement);
        });

        postsContainer.innerHTML = '';

        postsData.posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.classList.add('post', 'animate-in');
            postElement.innerHTML = `
                <div class="post-header">
                    <img src="${post.authorAvatar || 'default-avatar.jpg'}" alt="${post.author}" class="post-avatar">
                    <span class="post-username">${post.author}</span>
                </div>
                ${post.mediaType === 'image' 
                    ? `<img src="${post.mediaUrl}" alt="Post image" class="post-image">`
                    : `<video src="${post.mediaUrl}" controls class="post-video"></video>`
                }
                <div class="post-actions">
                    <span class="post-action like-action" data-post-id="${post.id}"><i class="far fa-heart"></i></span>
                    <span class="post-action comment-action" data-post-id="${post.id}"><i class="far fa-comment"></i></span>
                    <span class="post-action"><i class="far fa-paper-plane"></i></span>
                </div>
                <div class="post-likes">${post.likes} likes</div>
                <div class="post-caption">
                    <strong>${post.author}</strong> ${post.caption}
                </div>
                <div class="post-comments">
                    ${post.comments.map(comment => `
                        <div class="post-comment">
                            <strong>${comment.author}</strong> ${comment.content}
                        </div>
                    `).join('')}
                </div>
            `;
            postsContainer.appendChild(postElement);
        });

        // Add event listeners for like and comment actions
        document.querySelectorAll('.like-action').forEach(likeAction => {
            likeAction.addEventListener('click', () => likePost(likeAction.dataset.postId));
        });

        document.querySelectorAll('.comment-action').forEach(commentAction => {
            commentAction.addEventListener('click', () => showCommentModal(commentAction.dataset.postId));
        });

        // Animate elements
        gsap.from('.animate-in', {
            opacity: 0,
            y: 20,
            stagger: 0.1,
            duration: 0.5,
            ease: 'power2.out'
        });

        showSection(feedSection);
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while loading the feed. Please try again.');
    }
}

// Load Profile
async function loadProfile(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();

        document.getElementById('profile-picture').src = data.user.avatar || 'default-avatar.jpg';
        document.getElementById('profile-username').textContent = data.user.username;
        document.getElementById('profile-stats').textContent = `${data.user.posts} posts · ${data.user.followers} followers · ${data.user.following} following`;

        const userPostsGrid = document.getElementById('user-posts-grid');
        userPostsGrid.innerHTML = '';

        data.posts.forEach(post => {
            const postThumbnail = document.createElement('div');
            postThumbnail.classList.add('user-post-thumbnail', 'animate-in');
            postThumbnail.style.backgroundImage = `url(${post.mediaUrl})`;
            postThumbnail.addEventListener('click', () => showPostModal(post));
            userPostsGrid.appendChild(postThumbnail);
        });

        // Animate elements
        gsap.from('.animate-in', {
            opacity: 0,
            y: 20,
            stagger: 0.1,
            duration: 0.5,
            ease: 'power2.out'
        });

        showSection(profileSection);
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while loading the profile. Please try again.');
    }
}

// Show Post Modal
function showPostModal(post) {
    modalContent.innerHTML = `
        <div class="modal-post">
            ${post.mediaType === 'image' 
                ? `<img src="${post.mediaUrl}" alt="Post image" class="modal-post-image">`
                : `<video src="${post.mediaUrl}" controls class="modal-post-video"></video>`
            }
            <div class="modal-post-info">
                <div class="post-header">
                    <img src="${post.authorAvatar || 'default-avatar.jpg'}" alt="${post.author}" class="post-avatar">
                    <span class="post-username">${post.author}</span>
                </div>
                <div class="post-caption">
                    <strong>${post.author}</strong> ${post.caption}
                </div>
                <div class="post-likes">${post.likes} likes</div>
                <div class="post-comments">
                    ${post.comments.map(comment => `
                        <div class="post-comment">
                            <strong>${comment.author}</strong> ${comment.content}
                        </div>
                    `).join('')}
                </div>
                <div class="post-actions">
                    <span class="post-action like-action" data-post-id="${post.id}"><i class="far fa-heart"></i></span>
                    <span class="post-action comment-action" data-post-id="${post.id}"><i class="far fa-comment"></i></span>
                    <span class="post-action"><i class="far fa-paper-plane"></i></span>
                </div>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');

    // Add event listeners for like and comment actions in the modal
    modal.querySelector('.like-action').addEventListener('click', () => likePost(post.id));
    modal.querySelector('.comment-action').addEventListener('click', () => showCommentModal(post.id));
}

// Show Story
function showStory(story) {
    storyDisplay.innerHTML = `
        ${story.mediaType === 'image' 
            ? `<img src="${story.mediaUrl}" alt="Story image" class="story-media">`
            : `<video src="${story.mediaUrl}" autoplay loop class="story-media"></video>`
        }
        <div class="story-info">
            <img src="${story.authorAvatar || 'default-avatar.jpg'}" alt="${story.author}" class="story-avatar">
            <span class="story-username">${story.author}</span>
        </div>
    `;
    storyModal.classList.remove('hidden');

    // Auto-close story after 5 seconds
    setTimeout(() => {
        storyModal.classList.add('hidden');
    }, 5000);
}

// Like Post
async function likePost(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
        const data = await response.json();

        if (response.ok) {
            updatePostLikes({ postId, likes: data.likes });
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while liking the post. Please try again.');
    }
}

// Show Comment Modal
function showCommentModal(postId) {
    modalContent.innerHTML = `
        <h3>Add a comment</h3>
        <form id="comment-form">
            <textarea id="comment-content" placeholder="Write a comment..." required></textarea>
            <button type="submit">Post</button>
        </form>
    `;
    modal.classList.remove('hidden');

    document.getElementById('comment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = document.getElementById('comment-content').value;

        try {
            const response = await fetch(`/api/posts/${postId}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });

            const data = await response.json();

            if (response.ok) {
                modal.classList.add('hidden');
                addNewComment({ postId, comment: data.comment });
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while posting the comment. Please try again.');
        }
    });
}

// Update Post Likes
function updatePostLikes({ postId, likes }) {
    const likesElement = document.querySelector(`.post[data-post-id="${postId}"] .post-likes`);
    if (likesElement) {
        likesElement.textContent = `${likes} likes`;
    }
}

// Add New Comment
function addNewComment({ postId, comment }) {
    const commentsElement = document.querySelector(`.post[data-post-id="${postId}"] .post-comments`);
    if (commentsElement) {
        const commentElement = document.createElement('div');
        commentElement.classList.add('post-comment', 'new-content');
        commentElement.innerHTML = `<strong>${comment.author}</strong> ${comment.content}`;
        commentsElement.appendChild(commentElement);
    }
}

// Add New Post
function addNewPost(post) {
    const postsContainer = document.getElementById('posts-container');
    const postElement = document.createElement('div');
    postElement.classList.add('post', 'new-content');
    postElement.innerHTML = `
        <div class="post-header">
            <img src="${post.authorAvatar || 'default-avatar.jpg'}" alt="${post.author}" class="post-avatar">
            <span class="post-username">${post.author}</span>
        </div>
        ${post.mediaType === 'image' 
            ? `<img src="${post.mediaUrl}" alt="Post image" class="post-image">`
            : `<video src="${post.mediaUrl}" controls class="post-video"></video>`
        }
        <div class="post-actions">
            <span class="post-action like-action" data-post-id="${post.id}"><i class="far fa-heart"></i></span>
            <span class="post-action comment-action" data-post-id="${post.id}"><i class="far fa-comment"></i></span>
            <span class="post-action"><i class="far fa-paper-plane"></i></span>
        </div>
        <div class="post-likes">${post.likes} likes</div>
        <div class="post-caption">
            <strong>${post.author}</strong> ${post.caption}
        </div>
        <div class="post-comments"></div>
    `;
    postsContainer.insertBefore(postElement, postsContainer.firstChild);

    // Add event listeners for like and comment actions
    postElement.querySelector('.like-action').addEventListener('click', () => likePost(post.id));
    postElement.querySelector('.comment-action').addEventListener('click', () => showCommentModal(post.id));
}

// Add New Story
function addNewStory(story) {
    const storiesContainer = document.getElementById('stories-container');
    const storyElement = document.createElement('div');
    storyElement.classList.add('story', 'new-content');
    storyElement.innerHTML = `
        <div class="story-avatar">
            <img src="${story.authorAvatar || 'default-avatar.jpg'}" alt="${story.author}">
        </div>
        <span>${story.author}</span>
    `;
    storyElement.addEventListener('click', () => showStory(story));
    storiesContainer.insertBefore(storyElement, storiesContainer.children[1]);
}

// Search Users
searchInput.addEventListener('input', debounce(async (e) => {
    const query = e.target.value.trim();
    if (query.length > 0) {
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();

            searchResults.innerHTML = '';
            data.results.forEach(user => {
                const resultElement = document.createElement('div');
                resultElement.classList.add('search-result');
                resultElement.innerHTML = `
                    <img src="${user.avatar || 'default-avatar.jpg'}" alt="${user.username}" class="search-result-avatar">
                    <span>${user.username}</span>
                `;
                resultElement.addEventListener('click', () => {
                    searchInput.value = '';
                    searchResults.classList.add('hidden');
                    loadProfile(user.id);
                });
                searchResults.appendChild(resultElement);
            });
            searchResults.classList.remove('hidden');
        } catch (error) {
            console.error('Error:', error);
        }
    } else {
        searchResults.classList.add('hidden');
    }
}, 300));

// Utility Functions
function showLoggedInState() {
    authSection.classList.add('hidden');
    document.querySelector('nav').classList.remove('hidden');
}

function showSection(section) {
    [authSection, feedSection, profileSection, createPostSection, createStorySection].forEach(s => s.classList.add('hidden'));
    section.classList.remove('hidden');
}

function logout() {
    currentUser = null;
    authSection.classList.remove('hidden');
    document.querySelector('nav').classList.add('hidden');
    [feedSection, profileSection, createPostSection, createStorySection].forEach(s => s.classList.add('hidden'));
    if (ws) {
        ws.close();
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Check Authentication Status on Page Load
async function checkAuth() {
    try {
        const response = await fetch('/api/check-auth');
        const data = await response.json();

        if (data.user) {
            currentUser = data.user;
            showLoggedInState();
            loadFeed();
            initWebSocket();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
    }
    if (e.target === storyModal) {
        storyModal.classList.add('hidden');
    }
});

checkAuth();

                
