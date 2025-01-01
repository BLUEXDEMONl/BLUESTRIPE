const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
}));

// In-memory storage (replace with a database in a real application)
const users = [];
const posts = [];
const stories = [];

// WebSocket connections
const clients = new Map();

wss.on('connection', (ws) => {
    const id = uuidv4();
    const color = Math.floor(Math.random() * 360);
    const metadata = { id, color };

    clients.set(ws, metadata);

    ws.on('message', (messageAsString) => {
        const message = JSON.parse(messageAsString);
        const metadata = clients.get(ws);

        message.sender = metadata.id;
        message.color = metadata.color;

        [...clients.keys()].forEach((client) => {
            client.send(JSON.stringify(message));
        });
    });

    ws.on('close', () => {
        clients.delete(ws);
    });
});

app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ message: 'Username already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = { 
        id: users.length + 1, 
        username, 
        password: hashedPassword, 
        email,
        avatar: null,
        createdAt: new Date(),
        posts: 0,
        followers: 0,
        following: 0
    };
    users.push(user);
    req.session.userId = user.id;
    res.json({ user: { id: user.id, username: user.username, avatar: user.avatar } });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user.id;
        res.json({ user: { id: user.id, username: user.username, avatar: user.avatar } });
    } else {
        res.status(400).json({ message: 'Invalid credentials' });
    }
});

app.get('/api/check-auth', (req, res) => {
    if (req.session.userId) {
        const user = users.find(u => u.id === req.session.userId);
        res.json({ user: { id: user.id, username: user.username, avatar: user.avatar } });
    } else {
        res.json({ user: null });
    }
});

app.post('/api/posts', upload.single('media'), (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    const { caption } = req.body;
    const user = users.find(u => u.id === req.session.userId);
    const post = {
        id: posts.length + 1,
        author: user.username,
        authorAvatar: user.avatar,
        caption,
        mediaUrl: req.file ? `/uploads/${req.file.filename}` : null,
        mediaType: req.file ? (req.file.mimetype.startsWith('image') ? 'image' : 'video') : null,
        createdAt: new Date(),
        likes: 0,
        comments: []
    };
    posts.unshift(post);
    user.posts++;
    broadcastUpdate('newPost', post);
    res.json({ post });
});

app.get('/api/posts', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedPosts = posts.slice(startIndex, endIndex);
    res.json({ 
        posts: paginatedPosts,
        hasMore: endIndex < posts.length
    });
});

app.post('/api/posts/:id/like', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    const post = posts.find(p => p.id === parseInt(req.params.id));
    if (!post) {
        return res.status(404).json({ message: 'Post not found' });
    }
    post.likes++;
    broadcastUpdate('likePost', { postId: post.id, likes: post.likes });
    res.json({ likes: post.likes });
});

app.post('/api/posts/:id/comment', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    const { content } = req.body;
    const post = posts.find(p => p.id === parseInt(req.params.id));
    if (!post) {
        return res.status(404).json({ message: 'Post not found' });
    }
    const user = users.find(u => u.id === req.session.userId);
    const comment = {
        id: post.comments.length + 1,
        author: user.username,
        content,
        createdAt: new Date()
    };
    post.comments.push(comment);
    broadcastUpdate('newComment', { postId: post.id, comment });
    res.json({ comment });
});

app.get('/api/users/:id', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    const userPosts = posts.filter(post => post.author === user.username);
    res.json({
        user: { 
            id: user.id, 
            username: user.username, 
            avatar: user.avatar,
            createdAt: user.createdAt,
            posts: user.posts,
            followers: user.followers,
            following: user.following
        },
        posts: userPosts,
    });
});

app.post('/api/users/:id/follow', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    const userToFollow = users.find(u => u.id === parseInt(req.params.id));
    const currentUser = users.find(u => u.id === req.session.userId);
    if (!userToFollow || !currentUser) {
        return res.status(404).json({ message: 'User not found' });
    }
    if (userToFollow.id === currentUser.id) {
        return res.status(400).json({ message: 'You cannot follow yourself' });
    }
    userToFollow.followers++;
    currentUser.following++;
    res.json({ message: 'User followed successfully' });
});

app.post('/api/stories', upload.single('media'), (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    const user = users.find(u => u.id === req.session.userId);
    const story = {
        id: stories.length + 1,
        author: user.username,
        authorAvatar: user.avatar,
        mediaUrl: req.file ? `/uploads/${req.file.filename}` : null,
        mediaType: req.file ? (req.file.mimetype.startsWith('image') ? 'image' : 'video') : null,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    };
    stories.unshift(story);
    broadcastUpdate('newStory', story);
    res.json({ story });
});

app.get('/api/stories', (req, res) => {
    const currentTime = new Date();
    const activeStories = stories.filter(story => story.expiresAt > currentTime);
    res.json({ stories: activeStories });
});

app.get('/api/search', (req, res) => {
    const { q } = req.query;
    const searchResults = users.filter(user => 
        user.username.toLowerCase().includes(q.toLowerCase())
    ).map(user => ({
        id: user.id,
        username: user.username,
        avatar: user.avatar
    }));
    res.json({ results: searchResults });
});

function broadcastUpdate(type, data) {
    const message = JSON.stringify({ type, data });
    [...clients.keys()].forEach((client) => {
        client.send(message);
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

                   
