import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'qr-share-secret-key-change-in-prod';
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// In-memory room store: roomId -> { senderSocketId, receiverSocketId, lastActive, createdAt }
const rooms = new Map();

/**
 * Clean up rooms inactive for more than 30 minutes
 */
function cleanupInactiveRooms(io) {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.lastActive > INACTIVITY_TIMEOUT) {
      io.to(roomId).emit('room-expired', { message: 'Room expired due to 30 minutes of inactivity' });
      rooms.delete(roomId);
    }
  }
}

export function setupSignaling(io) {
  // Periodically purge inactive rooms every 5 minutes
  setInterval(() => cleanupInactiveRooms(io), 5 * 60 * 1000);

  io.on('connection', (socket) => {
    let currentRoomId = null;
    let currentRole = null;

    /**
     * Join Room Handler
     */
    socket.on('join-room', ({ roomId, token, role }) => {
      if (!roomId) {
        return socket.emit('error-msg', { message: 'Room ID is required' });
      }

      let room = rooms.get(roomId);

      if (role === 'sender') {
        // Verify JWT token for sender
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          if (decoded.roomId !== roomId || decoded.role !== 'sender') {
            return socket.emit('error-msg', { message: 'Invalid room ownership token' });
          }
        } catch (err) {
          return socket.emit('error-msg', { message: 'Invalid or expired room token' });
        }

        if (!room) {
          room = {
            senderSocketId: socket.id,
            receiverSocketId: null,
            createdAt: Date.now(),
            lastActive: Date.now()
          };
          rooms.set(roomId, room);
        } else {
          room.senderSocketId = socket.id;
          room.lastActive = Date.now();
        }

        socket.join(roomId);
        currentRoomId = roomId;
        currentRole = 'sender';

        socket.emit('room-joined', { role: 'sender', roomId });

        // If receiver was already connected, notify sender
        if (room.receiverSocketId) {
          socket.emit('peer-joined', { role: 'receiver' });
        }
      } else if (role === 'receiver') {
        if (!room) {
          return socket.emit('error-msg', { message: 'Room does not exist or has expired' });
        }

        // Room max size check: 1 sender + 1 receiver max
        if (room.receiverSocketId && room.receiverSocketId !== socket.id) {
          return socket.emit('error-msg', { message: 'Room is full. Maximum 2 peers allowed.' });
        }

        room.receiverSocketId = socket.id;
        room.lastActive = Date.now();

        socket.join(roomId);
        currentRoomId = roomId;
        currentRole = 'receiver';

        socket.emit('room-joined', { role: 'receiver', roomId });

        // Notify sender that receiver joined
        if (room.senderSocketId) {
          io.to(room.senderSocketId).emit('peer-joined', { role: 'receiver' });
        }
      } else {
        socket.emit('error-msg', { message: 'Invalid role specified' });
      }
    });

    /**
     * Relay SDP Offer (Sender -> Receiver)
     */
    socket.on('offer', ({ roomId, offer }) => {
      const room = rooms.get(roomId);
      if (room && room.receiverSocketId) {
        room.lastActive = Date.now();
        io.to(room.receiverSocketId).emit('offer', { offer });
      }
    });

    /**
     * Relay SDP Answer (Receiver -> Sender)
     */
    socket.on('answer', ({ roomId, answer }) => {
      const room = rooms.get(roomId);
      if (room && room.senderSocketId) {
        room.lastActive = Date.now();
        io.to(room.senderSocketId).emit('answer', { answer });
      }
    });

    /**
     * Relay ICE Candidate (Peer <-> Peer)
     */
    socket.on('ice-candidate', ({ roomId, candidate }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      room.lastActive = Date.now();

      const targetSocketId = socket.id === room.senderSocketId 
        ? room.receiverSocketId 
        : room.senderSocketId;

      if (targetSocketId) {
        io.to(targetSocketId).emit('ice-candidate', { candidate });
      }
    });

    /**
     * File Transfer Cancelled
     */
    socket.on('cancel-transfer', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      room.lastActive = Date.now();

      socket.to(roomId).emit('transfer-cancelled', {
        cancelledBy: currentRole
      });
    });

    /**
     * Disconnect Handler
     */
    socket.on('disconnect', () => {
      if (currentRoomId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          socket.to(currentRoomId).emit('peer-disconnected', { role: currentRole });

          if (currentRole === 'sender') {
            room.senderSocketId = null;
          } else if (currentRole === 'receiver') {
            room.receiverSocketId = null;
          }

          // If both peers disconnected, clean room up immediately
          if (!room.senderSocketId && !room.receiverSocketId) {
            rooms.delete(currentRoomId);
          }
        }
      }
    });
  });
}
