# QRShare - Production-Ready P2P File Sharing Web App

QRShare is a fast, stateless, peer-to-peer (P2P) file sharing web application built with Node.js, Express, Socket.io, React, Vite, TailwindCSS, and WebRTC.

Files are transferred directly between devices via DTLS-encrypted WebRTC DataChannels in 64KB chunks. **No file data ever touches or passes through the server.**

---

## ⚡ Tech Stack

- **Backend**: Node.js + Express
- **Realtime / Signaling**: Socket.io
- **P2P Transfer**: WebRTC DataChannels (DTLS Encrypted)
- **Frontend**: React + Vite + TailwindCSS
- **Database**: None (Stateless sessions)
- **Auth**: Anonymous sessions with JWT room ownership verification
- **Deployment**: Docker multi-stage containerization (Railway / Render ready)

---

## 🔒 Mandatory Security Features

1. **Pure P2P**: Zero server storage. File chunks pass directly browser-to-browser.
2. **DTLS Encryption**: Mandatory WebRTC DataChannel encryption in browser.
3. **Crypto Room UUIDs**: Rooms are generated with `crypto.randomUUID()`.
4. **JWT Ownership**: Room owner tokens signed with JWT to prevent unauthorized transfer cancellations or hijacking.
5. **Max 2 Connections**: Rooms strictly enforce a maximum of 2 connections (1 sender + 1 receiver).
6. **Rate Limiting**: Express rate limiter capping room creation to **10 rooms per IP per hour**.
7. **Security Headers**: Secured with `helmet` (CSP, HSTS, X-Frame-Options, X-Content-Type).
8. **Client-Side File Size Validation**: File size capped at 2GB prior to transfer initialization.
9. **Inactivity Expiration**: Session rooms auto-expire after 30 minutes of inactivity.

---

## 🚀 Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Port for Express & Socket.io server |
| `JWT_SECRET` | `qr-share-secret-key-change-in-prod` | Secret key for signing room ownership JWT tokens |
| `NODE_ENV` | `development` | Set to `production` in containerized/cloud deployment |

---

## 🛠️ Local Setup & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
# Start Vite frontend (port 5173 with proxy to backend)
npm run dev

# In another terminal window, start Express & Socket.io backend (port 3000)
npm run server
```

Open `http://localhost:5173` in your browser.

---

## 📦 Production Build & Docker Deployment

### Local Production Build
```bash
# Build React static assets into dist/
npm run build

# Start Express production server serving API + static frontend on port 3000
npm run start
```

### Docker Container Deployment (Railway / Render / Docker)
```bash
# Build Docker image
docker build -t qr-share .

# Run Docker container
docker run -p 3000:3000 -e JWT_SECRET="your-secure-production-secret" qr-share
```

Access the application at `http://localhost:3000`.
