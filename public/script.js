let currentUserId = null;
let authToken = null;

document.getElementById('register-btn').addEventListener('click', register);
document.getElementById('login-btn').addEventListener('click', login);
document.getElementById('upload-profile-pic-btn').addEventListener('click', uploadProfilePic);
document.getElementById('update-bio-btn').addEventListener('click', updateBio);
document.getElementById('create-post-btn').addEventListener('click', createPost);

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.target.getAttribute('data-section');
        showSection(section);
    });
});

function showSection(section) {
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    document.getElementById(`${section}-section`).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    document.querySelector(`.nav-link[data-section="${section}"]`).classList.add('active');
}

async function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (data.success) {
            alert('Registration successful. Please log in.');
        } else {
            alert('Registration failed: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during registration.');
    }
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (data.success) {
            currentUserId = data.userId;
            authToken = data.token;
            showUserSection(username);
        } else {
            alert('Login failed: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during login.');
    }
}

function showUserSection(username) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('user-section').style.display = 'block';
    document.getElementById('user-greeting').textContent = username;
    showSection('feed');
    fetchPosts();
}

async function uploadProfilePic() {
    const fileInput = document.getElementById('profile-pic-input');
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a file');
        return;
    }

    const formData = new FormData();
    formData.append('profilePic', file);

    try {
        const response = await fetch('/api/upload-profile-pic', {
            method: 'POST',
            headers: { 'Authorization': authToken },
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            document.getElementById('profile-pic').src = data.profilePic;
            alert('Profile picture updated successfully');
        } else {
            alert('Failed to upload profile picture: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while uploading the profile picture.');
    }
}

async function updateBio() {
    const bio = document.getElementById('bio-input').value;

    try {
        const response = await fetch('/api/update-bio', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': authToken
            },
            body: JSON.stringify({ bio })
        });
        const data = await response.json();
        if (data.success) {
            alert('Bio updated successfully');
        } else {
            alert('Failed to update bio: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while updating the bio.');
    }
}

async function createPost() {
    const fileInput = document.getElementById('post-media-input');
    const file = fileInput.files[0];
    const caption = document.getElementById('post-caption').value;

    if (!file) {
        alert('Please select a file');
        return;
    }

    const formData = new FormData();
    formData.append('media', file);
    formData.append('caption', caption);

    try {
        const response = await fetch('/api/create-post', {
            method: 'POST',
            headers: { 'Authorization': authToken },
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            alert('Post created successfully');
            fetchPosts();
        } else {
            alert('Failed to create post: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while creating the post.');
    }
}

async function fetchPosts() {
    try {
        const response = await fetch('/api/posts');
        const posts = await response.json();
        const postsContainer = document.getElementById('posts-container');
        postsContainer.innerHTML = '';
        posts.forEach(post => {
            const postElement = createPostElement(post);
            postsContainer.appendChild(postElement);
        });
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while fetching posts.');
    }
}

function createPostElement(post) {
    const postElement = document.createElement('div');
    postElement.className = 'post';
    postElement.innerHTML = `
        <div class="post-header">
            <img src="${post.profilePic || '/placeholder-avatar.jpg'}" alt="${post.username}" class="post-avatar">
            <div>
                <div class="post-username">${post.username}</div>
                <div class="post-timestamp">${new Date(post.createdAt).toLocaleString()}</div>
            </div>
        </div>
        ${post.mediaUrl.endsWith('.mp4') ? 
            `<video src="${post.mediaUrl}" controls class="post-media"></video>` : 
            `<img src="${post.mediaUrl}" alt="Post image" class="post-media">`}
        <p class="post-caption">${post.caption}</p>
        <div class="post-actions">
            <div class="post-action like-action" data-post-id="${post._id}">
                <span class="like-icon">❤️</span>
                <span class="like-count">${post.likes.length}</span>
            </div>
            <div class="post-action comment-action" data-post-id="${post._id}">
                💬 Comment
            </div>
        </div>
        <div class="post-comments">
            ${post.comments.map(comment => `
                <div class="comment">
                    <span class="comment-username">${comment.username}</span>
                    ${comment.text}
                </div>
            `).join('')}
        </div>
        <div class="comment-input-container">
            <input type="text" class="comment-input" placeholder="Add a comment...">
            <button class="comment-submit" data-post-id="${post._id}">Post</button>
        </div>
    `;

    postElement.querySelector('.like-action').addEventListener('click', () => likePost(post._id));
    postElement.querySelector('.comment-submit').addEventListener('click', (e) => {
        const commentText = e.target.previousElementSibling.value;
        if (commentText) {
            addComment(post._id, commentText);
        }
    });

    return postElement;
}

async function likePost(postId) {
    try {
        const response = await fetch('/api/like-post', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': authToken
            },
            body: JSON.stringify({ postId })
        });
        const data = await response.json();
        if (data.success) {
            const likeAction = document.querySelector(`.like-action[data-post-id="${postId}"]`);
            likeAction.querySelector('.like-count').textContent = data.likes;
        } else {
            alert('Failed to like post: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while liking the post.');
    }
}

async function addComment(postId, text) {
    try {
        const response = await fetch('/api/comment-post', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': authToken
            },
            body: JSON.stringify({ postId, text })
        });
        const data = await response.json();
        if (data.success) {
            const commentContainer = document.querySelector(`.post[data-post-id="${postId}"] .post-comments`);
            const commentElement = document.createElement('div');
            commentElement.className = 'comment';
            commentElement.innerHTML = `
                <span class="comment-username">${data.comment.username}</span>
                ${data.comment.text}
            `;
            commentContainer.appendChild(commentElement);
        } else {
            alert('Failed to add comment: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while adding the comment.');
    }
}

// Initial setup
showSection('feed');

    
