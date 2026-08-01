import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { roomCreationLimiter } from './rateLimit.js';
import { setupSignaling } from './signaling.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'qr-share-secret-key-change-in-prod';

const app = express();
const httpServer = createServer(app);

// Socket.io initialization
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Security headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

app.use(cors());
app.use(express.json());

// API Route: Create a new crypto-random UUID session room with JWT ownership token
app.post('/api/rooms/create', roomCreationLimiter, (req, res) => {
  try {
    const roomId = crypto.randomUUID();
    
    // Sign JWT token for room ownership verification
    const token = jwt.sign(
      { roomId, role: 'sender' },
      JWT_SECRET,
      { expiresIn: '30m' }
    );

    res.json({
      success: true,
      roomId,
      token,
      expiresInMinutes: 30
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session room' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Attach signaling logic
setupSignaling(io);

// Serve static frontend in production mode
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// SPA Fallback for client routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(500).send('Frontend static build not found. Please run npm run build.');
    }
  });
});

function startServer(port) {
  httpServer.listen(port, () => {
    console.log(`🚀 QRShare server running on port ${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} is in use, trying port ${Number(port) + 1}...`);
      startServer(Number(port) + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(PORT);
