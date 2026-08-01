import React, { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { ProgressBar } from '../components/ProgressBar';
import { Download, ShieldCheck, FileCheck, HardDriveDownload } from 'lucide-react';

export function Receiver({ roomId }) {
  const { socket, isConnected } = useSocket();
  const [joined, setJoined] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Join room as receiver
  useEffect(() => {
    if (socket && isConnected && roomId) {
      socket.emit('join-room', {
        roomId,
        role: 'receiver'
      });

      socket.on('room-joined', () => {
        setJoined(true);
        setServerError(null);
      });

      socket.on('error-msg', ({ message }) => {
        setServerError(message);
      });
    }

    return () => {
      if (socket) {
        socket.off('room-joined');
        socket.off('error-msg');
      }
    };
  }, [socket, isConnected, roomId]);

  const {
    peerStatus,
    transferState,
    progress,
    transferSpeed,
    receivedFile,
    error: rtcError
  } = useWebRTC({
    socket,
    roomId,
    role: 'receiver'
  });

  // Automatically trigger download prompt when transfer completes
  useEffect(() => {
    if (transferState === 'completed' && receivedFile && receivedFile.url) {
      const a = document.createElement('a');
      a.href = receivedFile.url;
      a.download = receivedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [transferState, receivedFile]);

  return (
    <div className="max-w-xl mx-auto space-y-6 pt-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <HardDriveDownload className="w-3.5 h-3.5" />
          Receiver Portal
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          Receiving P2P File Transfer
        </h1>
        <p className="text-xs text-slate-400">
          Connected securely to sender. Transfer will stream directly to your browser memory.
        </p>
      </div>

      {serverError ? (
        <div className="glass-card rounded-2xl p-8 text-center space-y-3">
          <p className="text-rose-400 text-sm font-semibold">{serverError}</p>
          <p className="text-xs text-slate-400">
            Please ask the sender for a new QR code or connection link.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Connection & Transfer Status Card */}
          <div className="glass-card glass-card-hover rounded-2xl p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
              {transferState === 'completed' ? (
                <FileCheck className="w-8 h-8 text-emerald-400" />
              ) : (
                <Download className="w-8 h-8 text-indigo-400 animate-bounce" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-200">
                {transferState === 'completed' 
                  ? 'File Download Complete!' 
                  : transferState === 'transferring'
                  ? 'Receiving File Stream...'
                  : 'Ready to receive'}
              </h3>
              <p className="text-xs text-slate-400">
                {transferState === 'completed'
                  ? `Saved ${receivedFile?.name || 'file'} to your browser downloads.`
                  : 'Waiting for sender to select and transmit file.'}
              </p>
            </div>
          </div>

          {/* Progress Bar Component */}
          <ProgressBar
            progress={progress}
            speed={transferSpeed}
            status={peerStatus}
            transferState={transferState}
            error={rtcError}
            role="receiver"
            downloadUrl={receivedFile?.url}
            fileName={receivedFile?.name}
          />

          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero server storage • Pure WebRTC DataChannel stream</span>
          </div>
        </div>
      )}
    </div>
  );
}
