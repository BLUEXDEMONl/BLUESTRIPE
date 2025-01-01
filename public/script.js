let currentUser = null;

const authForm = document.getElementById('auth-form');
const authSubmit = document.getElementById('auth-submit');
const toggleAuth = document.getElementById('toggle-auth');
const postForm = document.getElementById('post-form');
const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('search-input');
const homeLink = document.getElementById('home-link');
const profileLink = document.getElementById('profile-link');
const logoutLink = document.getElementById('logout-link');

const authSection = document.getElementById('auth-section');
const postSection = document.getElementById('post-section');
const feedSection = document.getElementById('feed-section');
const profileSection = document.getElementById('profile-section');
const searchResults = document.getElementById('search-results');

let isLogin = true;

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
});

postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('post-content').value;
    const videoFile = document.getElementById('post-video').files[0];

    const formData = new FormData();
    formData.append('content', content);
    if (videoFile) {
        formData.append('video', videoFile);
    }

    const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
    });

    const data = await response.json();

    if (response.ok) {
        document.getElementById('post-content').value = '';
        document.getElementById('post-video').value = '';
        loadFeed();
    } else {
        alert(data.message);
    }
});

searchButton.addEventListener('click', async () => {
    const query = searchInput.value;
    const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    const userResults = document.getElementById('user-results');
    userResults.innerHTML = '';

    data.users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.textContent = user.username;
        userResults.appendChild(userElement);
    });

    showSection(searchResults);
});

homeLink.addEventListener('click', (e) => {
    e.preventDefault();
    loadFeed();
});

profileLink.addEventListener('click', (e) => {
    e.preventDefault();
    loadProfile();
});

logoutLink.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
});

async function loadFeed() {
    const response = await fetch('/api/posts');
    const data = await response.json();

    const postsContainer = document.getElementById('posts-container');
    postsContainer.innerHTML = '';

    data.posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.classList.add('post');
        postElement.innerHTML = `
            <p>${post.content}</p>
            ${post.videoUrl ? `<video src="${post.videoUrl}" controls></video>` : ''}
            <p>Posted by: ${post.author}</p>
        `;
        postsContainer.appendChild(postElement);
    });

    showSection(feedSection);
}

async function loadProfile() {
    const response = await fetch(`/api/users/${currentUser.id}`);
    const data = await response.json();

    const profileInfo = document.getElementById('profile-info');
    profileInfo.innerHTML = `
        <h3>${data.user.username}</h3>
        <p>Joined: ${new Date(data.user.createdAt).toLocaleDateString()}</p>
    `;

    const userPosts = document.getElementById('user-posts');
    userPosts.innerHTML = '';

    data.posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.classList.add('post');
        postElement.innerHTML = `
            <p>${post.content}</p>
            ${post.videoUrl ? `<video src="${post.videoUrl}" controls></video>` : ''}
        `;
        userPosts.appendChild(postElement);
    });

    showSection(profileSection);
}

function showLoggedInState() {
    authSection.classList.add('hidden');
    postSection.classList.remove('hidden');
    document.querySelector('nav').classList.remove('hidden');
}

function showSection(section) {
    [authSection, postSection, feedSection, profileSection, searchResults].forEach(s => s.classList.add('hidden'));
    section.classList.remove('hidden');
}

function logout() {
    currentUser = null;
    authSection.classList.remove('hidden');
    postSection.classList.add('hidden');
    feedSection.classList.add('hidden');
    profileSection.classList.add('hidden');
    searchResults.classList.add('hidden');
    document.querySelector('nav').classList.add('hidden');
}

// Check if user is already logged in
async function checkAuth() {
    const response = await fetch('/api/check-auth');
    const data = await response.json();

    if (data.user) {
        currentUser = data.user;
        showLoggedInState();
        loadFeed();
    }
}

checkAuth();

      
