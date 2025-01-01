let currentUser = null;
let isLogin = true;

const authForm = document.getElementById('auth-form');
const authSubmit = document.getElementById('auth-submit');
const toggleAuth = document.getElementById('toggle-auth');
const homeLink = document.getElementById('home-link');
const profileLink = document.getElementById('profile-link');
const createPostLink = document.getElementById('create-post-link');
const logoutLink = document.getElementById('logout-link');

const authSection = document.getElementById('auth-section');
const feedSection = document.getElementById('feed-section');
const profileSection = document.getElementById('profile-section');
const createPostSection = document.getElementById('create-post-section');

const postForm = document.getElementById('post-form');
const postMedia = document.getElementById('post-media');
const mediaPreview = document.getElementById('media-preview');

const modal = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');

// Authentication
toggleAuth.addEventListener('click', (e) => {
    e.preventDefault();
    isLogin = !isLogin;
    authSubmit.textContent = isLogin ? 'Login' : 'Register';
    toggleAuth.textContent = isLogin ? 'Register' : 'Login';
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`/api/${isLogin ? 'login' : 'register'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            showLoggedInState();
            loadFeed();
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

// Load Feed
async function loadFeed() {
    try {
        const response = await fetch('/api/posts');
        const data = await response.json();

        const postsContainer = document.getElementById('posts-container');
        postsContainer.innerHTML = '';

        data.posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.classList.add('post');
            postElement.innerHTML = `
                <div class="post-header">
                    <img src="${post.authorAvatar}" alt="${post.author}" class="post-avatar">
                    <span class="post-username">${post.author}</span>
                </div>
                ${post.mediaType === 'image' 
                    ? `<img src="${post.mediaUrl}" alt="Post image" class="post-image">`
                    : `<video src="${post.mediaUrl}" controls class="post-video"></video>`
                }
                <div class="post-actions">
                    <span class="post-action"><i class="far fa-heart"></i></span>
                    <span class="post-action"><i class="far fa-comment"></i></span>
                    <span class="post-action"><i class="far fa-paper-plane"></i></span>
                </div>
                <div class="post-likes">${post.likes} likes</div>
                <div class="post-caption">
                    <strong>${post.author}</strong> ${post.caption}
                </div>
            `;
            postsContainer.appendChild(postElement);
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
            postThumbnail.classList.add('user-post-thumbnail');
            postThumbnail.style.backgroundImage = `url(${post.mediaUrl})`;
            postThumbnail.addEventListener('click', () => showPostModal(post));
            userPostsGrid.appendChild(postThumbnail);
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
                    <img src="${post.authorAvatar}" alt="${post.author}" class="post-avatar">
                    <span class="post-username">${post.author}</span>
                </div>
                <div class="post-caption">
                    <strong>${post.author}</strong> ${post.caption}
                </div>
                <div class="post-likes">${post.likes} likes</div>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
}

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
    }
});

// Utility Functions
function showLoggedInState() {
    authSection.classList.add('hidden');
    document.querySelector('nav').classList.remove('hidden');
}

function showSection(section) {
    [authSection, feedSection, profileSection, createPostSection].forEach(s => s.classList.add('hidden'));
    section.classList.remove('hidden');
}

function logout() {
    currentUser = null;
    authSection.classList.remove('hidden');
    document.querySelector('nav').classList.add('hidden');
    [feedSection, profileSection, createPostSection].forEach(s => s.classList.add('hidden'));
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
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkAuth();

                              
