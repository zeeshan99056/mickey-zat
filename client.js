let ws;
let username = localStorage.getItem('chatUsername');
let messageInput;
let messagesContainer;
let activeUsersList;
let emojiPicker;

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

function initializeChat() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('Connected to server');
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
}

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
            document.getElementById('user-count').textContent = data.users.length;
            break;
    }
}

function addMessage(username, content, timestamp, isOwn = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own-message' : ''}`;
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="username">${escapeHtml(username)}</span>
            <span class="timestamp">${timestamp}</span>
        </div>
        <div class="message-content">${escapeHtml(content)}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addNotification(content, timestamp) {
    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'notification';
    notificationDiv.innerHTML = `
        <span>${escapeHtml(content)}</span>
        <span class="timestamp">${timestamp}</span>
    `;
    messagesContainer.appendChild(notificationDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function updateActiveUsers(users) {
    activeUsersList.innerHTML = '';
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'active-user';
        userDiv.innerHTML = `
            <span class="status-dot"></span>
            <span>${escapeHtml(user)}</span>
        `;
        activeUsersList.appendChild(userDiv);
    });
}

function sendMessage() {
    const content = messageInput.value.trim();
    if (content && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'message',
            content: content
        }));
        messageInput.value = '';
    }
}

function initEmojiPicker() {
    const emojiButton = document.getElementById('emoji-btn');
    const emojiContainer = document.getElementById('emoji-picker');
    
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
    
    document.addEventListener('click', (e) => {
        if (!emojiButton.contains(e.target) && !emojiContainer.contains(e.target)) {
            emojiContainer.style.display = 'none';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    messagesContainer = document.getElementById('messages');
    messageInput = document.getElementById('message-input');
    activeUsersList = document.getElementById('active-users-list');
    
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    document.getElementById('refresh-users').addEventListener('click', () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'getUsers' }));
        }
    });
    
    initEmojiPicker();
    showUsernamePopup();
});
