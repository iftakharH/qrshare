import React, { useState, useEffect } from 'react';
import { QRDisplay } from '../components/QRDisplay';
import { FileDropzone } from '../components/FileDropzone';
import { ProgressBar } from '../components/ProgressBar';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { Send, RefreshCw, Lock, Sparkles } from 'lucide-react';

export function Sender() {
  const [roomData, setRoomData] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const { socket, isConnected } = useSocket();

  // Create room endpoint call
  const createRoom = async () => {
    setLoadingRoom(true);
    setRoomError(null);
    try {
      const res = await fetch('/api/rooms/create', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setRoomError(data.error);
      } else {
        setRoomData(data);
      }
    } catch (err) {
      setRoomError('Unable to connect to room server');
    } finally {
      setLoadingRoom(false);
    }
  };

  useEffect(() => {
    createRoom();
  }, []);

  // Join room on socket connect
  useEffect(() => {
    if (socket && isConnected && roomData) {
      socket.emit('join-room', {
        roomId: roomData.roomId,
        token: roomData.token,
        role: 'sender'
      });
    }
  }, [socket, isConnected, roomData]);

  const {
    peerStatus,
    transferState,
    progress,
    transferSpeed,
    error: rtcError,
    sendFile,
    cancelTransfer
  } = useWebRTC({
    socket,
    roomId: roomData ? roomData.roomId : null,
    role: 'sender'
  });

  const receiverUrl = roomData
    ? `${window.location.origin}/receive/${roomData.roomId}`
    : '';

  const handleSend = () => {
    if (selectedFile) {
      sendFile(selectedFile);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top Banner Header */}
      <div className="text-center space-y-3 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Stateless P2P File Transfer
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
          Share files securely across devices
        </h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Files are transferred directly peer-to-peer via WebRTC data channel. No data touches the server.
        </p>
      </div>

      {loadingRoom ? (
        <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm text-slate-300 font-medium">Generating secure crypto room...</p>
        </div>
      ) : roomError ? (
        <div className="glass-card rounded-2xl p-8 text-center space-y-4 max-w-md mx-auto">
          <p className="text-rose-400 text-sm font-medium">{roomError}</p>
          <button
            onClick={createRoom}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Grid: QR & Dropzone Side-by-Side on Desktop, Stacked on Mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: QR Display */}
            <div className="lg:col-span-5 flex">
              <div className="w-full">
                <QRDisplay receiverUrl={receiverUrl} />
              </div>
            </div>

            {/* Right: Dropzone & File Selection */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              <FileDropzone
                onFileSelect={setSelectedFile}
                selectedFile={selectedFile}
                onClearFile={() => setSelectedFile(null)}
                disabled={transferState === 'transferring'}
              />

              {/* Action Button */}
              {selectedFile && transferState !== 'transferring' && transferState !== 'completed' && (
                <button
                  onClick={handleSend}
                  disabled={peerStatus !== 'connected'}
                  className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm shadow-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                    peerStatus === 'connected'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-indigo-500/20 active:scale-[0.99] cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  {peerStatus === 'connected' ? 'Send File Now' : 'Waiting for Receiver to Scan QR...'}
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar & Status section */}
          <ProgressBar
            progress={progress}
            speed={transferSpeed}
            status={peerStatus}
            transferState={transferState}
            error={rtcError}
            onCancel={cancelTransfer}
            role="sender"
          />

          {/* Footer Security Assurance */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>End-to-End Encrypted via WebRTC DTLS • Session expires in 30 minutes</span>
          </div>
        </div>
      )}
    </div>
  );
}
