let ws;
let username = localStorage.getItem('chatUsername');
let messageInput;
let messagesContainer;
let activeUsersList;
let emojiPicker;

// Show popup if no username
function showUsernamePopup() {
    if (!username) {
        const popup = document.createElement('div');
        popup.className = 'popup-overlay';
        popup.innerHTML = `
            <div class="popup">
                <h2>Welcome to Global Chat</h2>
                <p>Enter your name to continue</p>
                <input type="text" id="username-input" placeholder="Your name" maxlength="30">
                <button id="continue-btn">Continue</button>
            </div>
        `;
        document.body.appendChild(popup);
        
        document.getElementById('continue-btn').addEventListener('click', () => {
            const name = document.getElementById('username-input').value.trim();
            if (name) {
                username = name;
                localStorage.setItem('chatUsername', username);
                document.body.removeChild(popup);
                initializeChat();
            }
        });
        
        document.getElementById('username-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('continue-btn').click();
            }
        });
    } else {
        initializeChat();
    }
}

// Initialize WebSocket connection
function initializeChat() {
    // Use appropriate WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('Connected to server');
        // Send join message
        ws.send(JSON.stringify({
            type: 'join',
            username: username
        }));
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleIncomingMessage(data);
    };
    
    ws.onclose = () => {
        console.log('Disconnected from server');
        addNotification('Disconnected from server. Trying to reconnect...');
        setTimeout(initializeChat, 3000);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// Handle incoming messages
function handleIncomingMessage(data) {
    switch(data.type) {
        case 'message':
            addMessage(data.username, data.content, data.timestamp, data.isOwn);
            break;
        case 'notification':
            addNotification(data.content, data.timestamp);
            break;
        case 'users':
            updateActiveUsers(data.users);
            break;
    }
}

// Add message to chat
function addMessage(username, content, timestamp, isOwn = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own-message' : ''}`;
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="username">${username}</span>
            <span class="timestamp">${timestamp}</span>
        </div>
        <div class="message-content">${content}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Add notification
function addNotification(content, timestamp) {
    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'notification';
    notificationDiv.innerHTML = `
        <span>${content}</span>
        <span class="timestamp">${timestamp}</span>
    `;
    messagesContainer.appendChild(notificationDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Update active users list
function updateActiveUsers(users) {
    activeUsersList.innerHTML = '';
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'active-user';
        userDiv.innerHTML = `
            <span class="status-dot"></span>
            <span>${user}</span>
        `;
        activeUsersList.appendChild(userDiv);
    });
}

// Send message
function sendMessage() {
    const content = messageInput.value.trim();
    if (content && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'message',
            content: content
        }));
        messageInput.value = '';
    }
}

// Initialize emoji picker
function initEmojiPicker() {
    const emojiButton = document.getElementById('emoji-btn');
    const emojiContainer = document.getElementById('emoji-picker');
    
    // Common emojis
    const emojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '✨', '🌟', '💯', '✅', 
                    '😎', '🤔', '😢', '😡', '👋', '🙏', '💪', '🍕', '⚽', '🎮'];
    
    emojis.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'emoji';
        span.textContent = emoji;
        span.onclick = () => {
            messageInput.value += emoji;
            messageInput.focus();
            emojiContainer.style.display = 'none';
        };
        emojiContainer.appendChild(span);
    });
    
    emojiButton.addEventListener('click', () => {
        emojiContainer.style.display = emojiContainer.style.display === 'none' ? 'grid' : 'none';
    });
    
    // Close emoji picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!emojiButton.contains(e.target) && !emojiContainer.contains(e.target)) {
            emojiContainer.style.display = 'none';
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    messagesContainer = document.getElementById('messages');
    messageInput = document.getElementById('message-input');
    activeUsersList = document.getElementById('active-users-list');
    
    // Send button
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    
    // Enter key to send
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Refresh users button
    document.getElementById('refresh-users').addEventListener('click', () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'getUsers' }));
        }
    });
    
    // Initialize emoji picker
    initEmojiPicker();
    
    // Show popup and initialize
    showUsernamePopup();
});
