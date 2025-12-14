import 'reflect-metadata';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

import { setupWebSockets } from './interface/websocket';
import { initializeDB } from './config/database';

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Crypto Exchange Engine Project is running');
});

initializeDB();
setupWebSockets(io);

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
