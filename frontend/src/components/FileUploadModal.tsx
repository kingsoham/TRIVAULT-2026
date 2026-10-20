import React, { useState, useRef } from 'react';
import { UploadCloud, File as FileIcon, X, Shield, Lock, Layers } from 'lucide-react';
import { api } from '../services/api';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  onError: (msg: string) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  onError,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setUploadStep('Applying Fernet AES-128 Encryption...');
      
      // Real API upload
      await api.uploadFile(selectedFile);

      setUploadStep('Sharding into 3 chunks and computing SHA-256 manifests...');
      setTimeout(() => {
        setIsUploading(false);
        setSelectedFile(null);
        onUploadSuccess();
        onClose();
      }, 400);
    } catch (err: any) {
      setIsUploading(false);
      onError(err.message || 'File upload failed.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-vault-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-vault-cyan/10 border border-vault-cyan/30 flex items-center justify-center text-vault-cyan">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Upload Secure File</h3>
              <p className="text-xs text-slate-400">Encrypted and distributed across 3 shards</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
              dragActive
                ? 'border-vault-cyan bg-vault-cyan/5 scale-[0.99]'
                : 'border-slate-800 hover:border-slate-700 bg-vault-950/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <div className="w-14 h-14 rounded-2xl bg-vault-cyan/10 border border-vault-cyan/20 flex items-center justify-center text-vault-cyan mb-3">
              <UploadCloud className="w-7 h-7" />
            </div>
            <p className="text-sm font-medium text-slate-200 text-center">
              Drag and drop your file here, or <span className="text-vault-cyan underline">browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Maximum upload size: 25 MB</p>
          </div>

          {/* Selected File Details */}
          {selectedFile && (
            <div className="p-3.5 rounded-xl bg-vault-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3 overflow-hidden">
                <FileIcon className="w-5 h-5 text-vault-cyan shrink-0" />
                <div className="truncate">
                  <p className="text-xs font-medium text-slate-200 truncate">{selectedFile.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                disabled={isUploading}
                className="text-slate-500 hover:text-rose-400 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Upload Progress Animation */}
          {isUploading && (
            <div className="p-4 rounded-xl bg-vault-cyan/5 border border-vault-cyan/20 space-y-3">
              <div className="flex items-center space-x-2 text-xs text-vault-cyan font-mono">
                <div className="w-4 h-4 border-2 border-vault-cyan/30 border-t-vault-cyan rounded-full animate-spin" />
                <span>{uploadStep}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-vault-cyan animate-pulse rounded-full w-4/5" />
              </div>
            </div>
          )}

          {/* Pipeline Notice */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="p-2.5 rounded-lg bg-vault-950/80 border border-slate-800 text-center text-[11px]">
              <Lock className="w-4 h-4 mx-auto text-vault-cyan mb-1" />
              <span className="text-slate-300 font-medium">1. Fernet AES</span>
              <p className="text-[10px] text-slate-500">Authenticated</p>
            </div>
            <div className="p-2.5 rounded-lg bg-vault-950/80 border border-slate-800 text-center text-[11px]">
              <Layers className="w-4 h-4 mx-auto text-vault-cyan mb-1" />
              <span className="text-slate-300 font-medium">2. 3 Shards</span>
              <p className="text-[10px] text-slate-500">Ordered Chunks</p>
            </div>
            <div className="p-2.5 rounded-lg bg-vault-950/80 border border-slate-800 text-center text-[11px]">
              <Shield className="w-4 h-4 mx-auto text-vault-cyan mb-1" />
              <span className="text-slate-300 font-medium">3. Manifest</span>
              <p className="text-[10px] text-slate-500">SHA-256 Hashes</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-vault-950/40 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-vault-cyan hover:bg-vault-cyanGlow text-slate-950 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <span>Encrypt & Store</span>
          </button>
        </div>
      </div>
    </div>
  );
};
