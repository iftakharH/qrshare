import { useState, useRef, useEffect, useCallback } from 'react';

const CHUNK_SIZE = 64 * 1024; // 64KB chunks
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB max file limit

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function useWebRTC({ socket, roomId, role }) {
  const [peerStatus, setPeerStatus] = useState('waiting'); // waiting, connecting, connected, disconnected
  const [transferState, setTransferState] = useState('idle'); // idle, transferring, completed, error, cancelled
  const [progress, setProgress] = useState(0);
  const [transferSpeed, setTransferSpeed] = useState(0); // MB/s
  const [receivedFile, setReceivedFile] = useState(null);
  const [error, setError] = useState(null);

  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const receivedChunksRef = useRef([]);
  const fileMetaRef = useRef(null);
  const receivedSizeRef = useRef(0);
  const startTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lastBytesRef = useRef(0);

  // Initialize RTCPeerConnection
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', { roomId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case 'connecting':
          setPeerStatus('connecting');
          break;
        case 'connected':
          setPeerStatus('connected');
          break;
        case 'disconnected':
        case 'failed':
        case 'closed':
          setPeerStatus('disconnected');
          break;
        default:
          break;
      }
    };

    return pc;
  }, [socket, roomId]);

  // Handle incoming data channel (Receiver side)
  const setupDataChannelEvents = useCallback((dataChannel) => {
    dataChannelRef.current = dataChannel;
    dataChannel.binaryType = 'arraybuffer';

    dataChannel.onopen = () => {
      setPeerStatus('connected');
    };

    dataChannel.onclose = () => {
      setPeerStatus('disconnected');
    };

    dataChannel.onerror = (err) => {
      console.error('DataChannel error:', err);
      setError('Data channel communication error');
      setTransferState('error');
    };

    dataChannel.onmessage = (event) => {
      // Handle metadata packet
      if (typeof event.data === 'string') {
        try {
          const meta = JSON.parse(event.data);
          if (meta.type === 'file-meta') {
            fileMetaRef.current = meta;
            receivedChunksRef.current = [];
            receivedSizeRef.current = 0;
            startTimeRef.current = Date.now();
            lastTimeRef.current = Date.now();
            lastBytesRef.current = 0;

            setTransferState('transferring');
            setProgress(0);
            setReceivedFile(null);
          } else if (meta.type === 'transfer-complete') {
            const blob = new Blob(receivedChunksRef.current, { type: fileMetaRef.current.fileType });
            const url = URL.createObjectURL(blob);
            setReceivedFile({
              name: fileMetaRef.current.fileName,
              size: fileMetaRef.current.fileSize,
              url
            });
            setTransferState('completed');
            setProgress(100);
          }
        } catch (e) {
          console.error('Error parsing metadata:', e);
        }
        return;
      }

      // Handle binary file chunk
      const chunk = event.data;
      receivedChunksRef.current.push(chunk);
      receivedSizeRef.current += chunk.byteLength;

      const totalSize = fileMetaRef.current ? fileMetaRef.current.fileSize : 1;
      const currentProgress = Math.min(100, Math.round((receivedSizeRef.current / totalSize) * 100));
      setProgress(currentProgress);

      // Speed calculation (every 500ms)
      const now = Date.now();
      const timeDiff = (now - lastTimeRef.current) / 1000;
      if (timeDiff >= 0.5) {
        const bytesDiff = receivedSizeRef.current - lastBytesRef.current;
        const speedMBps = (bytesDiff / timeDiff) / (1024 * 1024);
        setTransferSpeed(speedMBps.toFixed(2));
        lastTimeRef.current = now;
        lastBytesRef.current = receivedSizeRef.current;
      }
    };
  }, []);

  // Socket signaling listener setup
  useEffect(() => {
    if (!socket || !roomId) return;

    socket.on('peer-joined', async () => {
      setPeerStatus('connecting');

      if (role === 'sender') {
        const pc = createPeerConnection();
        // Create Data Channel on Sender side
        const dataChannel = pc.createDataChannel('fileTransfer', { ordered: true });
        setupDataChannelEvents(dataChannel);

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { roomId, offer });
        } catch (err) {
          console.error('Error creating offer:', err);
          setError('Failed to create WebRTC offer');
        }
      }
    });

    socket.on('offer', async ({ offer }) => {
      if (role === 'receiver') {
        const pc = createPeerConnection();

        pc.ondatachannel = (event) => {
          setupDataChannelEvents(event.channel);
        };

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { roomId, answer });
        } catch (err) {
          console.error('Error handling offer:', err);
          setError('Failed to accept connection offer');
        }
      }
    });

    socket.on('answer', async ({ answer }) => {
      if (role === 'sender' && pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('Error setting remote description:', err);
        }
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    });

    socket.on('transfer-cancelled', () => {
      setTransferState('cancelled');
      setError('File transfer was cancelled by peer');
    });

    socket.on('peer-disconnected', () => {
      setPeerStatus('disconnected');
    });

    return () => {
      socket.off('peer-joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('transfer-cancelled');
      socket.off('peer-disconnected');
    };
  }, [socket, roomId, role, createPeerConnection, setupDataChannelEvents]);

  // Initiate file send (Sender side)
  const sendFile = useCallback(async (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds maximum limit of 2GB');
      return;
    }
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      setError('Data channel is not open. Waiting for receiver...');
      return;
    }

    const dataChannel = dataChannelRef.current;
    setTransferState('transferring');
    setProgress(0);
    setError(null);

    // Send File Metadata
    const meta = {
      type: 'file-meta',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream'
    };
    dataChannel.send(JSON.stringify(meta));

    // Slice and send chunks
    let offset = 0;
    const startTime = Date.now();
    let lastTime = startTime;
    let lastBytes = 0;

    const readChunk = () => {
      if (dataChannel.readyState !== 'open') {
        setTransferState('error');
        setError('Connection lost during file transfer');
        return;
      }

      // Check buffer high water mark to avoid browser buffer overflow
      if (dataChannel.bufferedAmount > 16 * 1024 * 1024) {
        setTimeout(readChunk, 50);
        return;
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const reader = new FileReader();

      reader.onload = (e) => {
        dataChannel.send(e.target.result);
        offset += e.target.result.byteLength;

        const currentProgress = Math.min(100, Math.round((offset / file.size) * 100));
        setProgress(currentProgress);

        // Speed calculation
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;
        if (timeDiff >= 0.5) {
          const bytesDiff = offset - lastBytes;
          const speedMBps = (bytesDiff / timeDiff) / (1024 * 1024);
          setTransferSpeed(speedMBps.toFixed(2));
          lastTime = now;
          lastBytes = offset;
        }

        if (offset < file.size) {
          readChunk();
        } else {
          // Send completion signal
          dataChannel.send(JSON.stringify({ type: 'transfer-complete' }));
          setTransferState('completed');
          setProgress(100);
        }
      };

      reader.readAsArrayBuffer(slice);
    };

    readChunk();
  }, []);

  // Cancel file transfer
  const cancelTransfer = useCallback(() => {
    if (socket && roomId) {
      socket.emit('cancel-transfer', { roomId });
    }
    setTransferState('cancelled');
    setError('Transfer cancelled');
  }, [socket, roomId]);

  return {
    peerStatus,
    transferState,
    progress,
    transferSpeed,
    receivedFile,
    error,
    sendFile,
    cancelTransfer
  };
}
