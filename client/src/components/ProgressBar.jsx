import React from 'react';
import { Loader2, CheckCircle2, XCircle, Zap, ShieldCheck } from 'lucide-react';

export function ProgressBar({ 
  progress, 
  speed, 
  status, 
  transferState, 
  error, 
  onCancel, 
  role,
  downloadUrl,
  fileName 
}) {
  const getStatusBadge = () => {
    if (error || transferState === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-medium border border-rose-500/20">
          <XCircle className="w-3.5 h-3.5" />
          {error || 'Transfer Cancelled'}
        </span>
      );
    }

    if (transferState === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Done ✓
        </span>
      );
    }

    if (transferState === 'transferring') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          Transferring ({progress}%)
        </span>
      );
    }

    if (status === 'connected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Connected
        </span>
      );
    }

    if (status === 'connecting') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Connecting Peer...
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700">
        <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
        Waiting for receiver...
      </span>
    );
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-700/60 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-slate-400 font-medium">DTLS Encrypted P2P</span>
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      {/* Progress Bar Track */}
      {(transferState === 'transferring' || transferState === 'completed') && (
        <div className="space-y-2">
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                transferState === 'completed'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>{progress}% Transferred</span>
            {transferState === 'transferring' && speed > 0 && (
              <span className="flex items-center gap-1 text-indigo-400 font-semibold">
                <Zap className="w-3.5 h-3.5" />
                {speed} MB/s
              </span>
            )}
          </div>
        </div>
      )}

      {/* Controls & Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {transferState === 'transferring' && onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 text-xs font-semibold border border-slate-700 hover:border-rose-500/30 transition-all active:scale-95"
          >
            Cancel Transfer
          </button>
        )}

        {role === 'receiver' && transferState === 'completed' && downloadUrl && (
          <a
            href={downloadUrl}
            download={fileName || 'downloaded-file'}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Download File Now
          </a>
        )}
      </div>
    </div>
  );
}
