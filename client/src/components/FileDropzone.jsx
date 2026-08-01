import React, { useState, useRef } from 'react';
import { UploadCloud, File, X, AlertCircle } from 'lucide-react';

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export function FileDropzone({ onFileSelect, selectedFile, onClearFile, disabled }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [sizeError, setSizeError] = useState(null);
  const fileInputRef = useRef(null);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setSizeError('File exceeds maximum 2GB size limit.');
      return;
    }
    setSizeError(null);
    onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`glass-card glass-card-hover rounded-2xl p-8 border-2 border-dashed text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[260px] ${
            isDragOver 
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' 
              : 'border-slate-700/60 hover:border-indigo-500/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFile(e.target.files[0])}
            disabled={disabled}
            className="hidden"
          />
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-500/5">
            <UploadCloud className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-200 mb-1">
            Drag & drop your file here
          </h3>
          <p className="text-xs text-slate-400 mb-4 max-w-xs">
            Or click to select a file from your computer (Up to 2GB limit)
          </p>
          <span className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all">
            Browse File
          </span>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-5 border border-slate-700/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <File className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-200 truncate">
                {selectedFile.name}
              </h4>
              <p className="text-xs text-slate-400">
                {formatBytes(selectedFile.size)}
              </p>
            </div>
          </div>

          {!disabled && (
            <button
              onClick={onClearFile}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors flex-shrink-0"
              title="Remove file"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {sizeError && (
        <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{sizeError}</span>
        </div>
      )}
    </div>
  );
}
