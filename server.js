const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Map(); // ws -> { username, id }

app.use(express.static(path.join(__dirname, './')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Broadcast to all connected clients
function broadcast(data, excludeClient = null) {
    clients.forEach((clientInfo, client) => {
        if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Get active users list
function getActiveUsers() {
    return Array.from(clients.values()).map(client => client.username);
}

wss.on('connection', (ws) => {
    console.log('New client connected');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch(data.type) {
                case 'join':
                    // Store client info
                    clients.set(ws, {
                        username: data.username,
                        id: Date.now() + Math.random()
                    });
                    
                    // Send join notification
                    const joinMessage = {
                        type: 'notification',
                        content: `${data.username} joined the chat`,
                        timestamp: new Date().toLocaleTimeString()
                    };
                    broadcast(joinMessage);
                    
                    // Send updated active users list
                    broadcast({
                        type: 'users',
                        users: getActiveUsers()
                    });
                    break;
                    
                case 'message':
                    const clientInfo = clients.get(ws);
                    if (clientInfo) {
                        const chatMessage = {
                            type: 'message',
                            username: clientInfo.username,
                            content: data.content,
                            timestamp: new Date().toLocaleTimeString(),
                            isOwn: false // Will be handled client-side
                        };
                        broadcast(chatMessage, ws);
                        
                        // Send to sender with isOwn flag
                        ws.send(JSON.stringify({
                            ...chatMessage,
                            isOwn: true
                        }));
                    }
                    break;
                    
                case 'getUsers':
                    ws.send(JSON.stringify({
                        type: 'users',
                        users: getActiveUsers()
                    }));
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });
    
    ws.on('close', () => {
        const clientInfo = clients.get(ws);
        if (clientInfo) {
            // Send leave notification
            const leaveMessage = {
                type: 'notification',
                content: `${clientInfo.username} left the chat`,
                timestamp: new Date().toLocaleTimeString()
            };
            broadcast(leaveMessage);
            
            // Remove client
            clients.delete(ws);
            
            // Send updated active users list
            broadcast({
                type: 'users',
                users: getActiveUsers()
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
