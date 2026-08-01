import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, QrCode, Smartphone } from 'lucide-react';

export function QRDisplay({ receiverUrl }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current && receiverUrl) {
      QRCode.toCanvas(canvasRef.current, receiverUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }, (err) => {
        if (err) console.error('Failed to render QR Code:', err);
      });
    }
  }, [receiverUrl]);

  const copyToClipboard = () => {
    if (!receiverUrl) return;
    navigator.clipboard.writeText(receiverUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col items-center justify-between text-center relative overflow-hidden">
      {/* Subtle top glow accent */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />

      <div className="space-y-2 mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider border border-indigo-500/20">
          <QrCode className="w-3.5 h-3.5" />
          Receiver Access
        </div>
        <h3 className="text-lg font-bold text-slate-100">Scan to Receive File</h3>
        <p className="text-xs text-slate-400 max-w-xs">
          Scan with your phone camera or share the direct connection link below.
        </p>
      </div>

      <div className="bg-white p-3 rounded-xl shadow-xl shadow-slate-950/50 border border-white/10 my-2">
        <canvas ref={canvasRef} className="rounded-lg block" />
      </div>

      <div className="w-full mt-4 space-y-2">
        <button
          onClick={copyToClipboard}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all duration-200 border border-slate-700 active:scale-[0.98]"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-400" />
              <span className="truncate">Copy Connection Link</span>
            </>
          )}
        </button>
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
          <span>Cross-platform mobile & desktop supported</span>
        </div>
      </div>
    </div>
  );
}
