let currentUserId = null;

document.getElementById('register-btn').addEventListener('click', register);
document.getElementById('login-btn').addEventListener('click', login);
document.getElementById('upload-profile-pic-btn').addEventListener('click', uploadProfilePic);
document.getElementById('create-post-btn').addEventListener('click', createPost);

function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentUserId = data.userId;
            showUserSection(username);
        } else {
            alert('Registration failed');
        }
    });
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentUserId = data.userId;
            showUserSection(username);
        } else {
            alert('Login failed');
        }
    });
}

function showUserSection(username) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('user-section').style.display = 'block';
    document.getElementById('user-greeting').textContent = username;
    fetchPosts();
}

function uploadProfilePic() {
    const fileInput = document.getElementById('profile-pic-input');
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a file');
        return;
    }

    const formData = new FormData();
    formData.append('profilePic', file);
    formData.append('userId', currentUserId);

    fetch('/api/upload-profile-pic', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('profile-pic').src = data.profilePic;
            document.getElementById('profile-pic').style.display = 'block';
        } else {
            alert('Failed to upload profile picture');
        }
    });
}

function createPost() {
    const fileInput = document.getElementById('post-media-input');
    const file = fileInput.files[0];
    const caption = document.getElementById('post-caption').value;

    if (!file) {
        alert('Please select a file');
        return;
    }

    const formData = new FormData();
    formData.append('media', file);
    formData.append('userId', currentUserId);
    formData.append('caption', caption);

    fetch('/api/create-post', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Post created successfully');
            fetchPosts();
        } else {
            alert('Failed to create post');
        }
    });
}

function fetchPosts() {
    fetch('/api/posts')
    .then(response => response.json())
    .then(posts => {
        const postsContainer = document.getElementById('posts-container');
        postsContainer.innerHTML = '';
        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'post';
            postElement.innerHTML = `
                <h3>${post.username}</h3>
                <p>${post.caption}</p>
                ${post.mediaUrl.endsWith('.mp4') ? 
                    `<video src="${post.mediaUrl}" controls></video>` : 
                    `<img src="${post.mediaUrl}" alt="Post image">`}
                <p>Posted on: ${new Date(post.timestamp).toLocaleString()}</p>
            `;
            postsContainer.appendChild(postElement);
        });
    });
}
