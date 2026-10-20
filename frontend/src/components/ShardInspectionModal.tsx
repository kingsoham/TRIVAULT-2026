import React, { useEffect, useState } from 'react';
import { FileDetail, StoredFile } from '../types';
import { api } from '../services/api';
import { Layers, ShieldCheck, Hash, AlertCircle, X, CheckCircle2 } from 'lucide-react';

interface ShardInspectionModalProps {
  file: StoredFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShardInspectionModal: React.FC<ShardInspectionModalProps> = ({ file, isOpen, onClose }) => {
  const [fileDetail, setFileDetail] = useState<FileDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && file) {
      setLoading(true);
      setError(null);
      api.getFileMetadata(file.id)
        .then((data) => {
          setFileDetail(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load shard metadata');
          setLoading(false);
        });
    } else {
      setFileDetail(null);
    }
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-vault-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-vault-cyan/10 border border-vault-cyan/30 flex items-center justify-center text-vault-cyan">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Cryptographic Shard Inspector</h3>
              <p className="text-xs text-slate-400 font-mono">File: {file.filename} (ID #{file.id})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-vault-cyan/30 border-t-vault-cyan rounded-full animate-spin" />
              <p className="text-xs font-mono">Reading manifest.json & checking shard digests...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && fileDetail && (
            <>
              {/* Summary Banner */}
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-vault-950 border border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">ORIGINAL SIZE</span>
                  <span className="text-slate-200 font-semibold">{fileDetail.size} Bytes</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">TOTAL SHARDS</span>
                  <span className="text-vault-cyan font-semibold">{fileDetail.shard_count} Chunks (Ordered)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">STATUS</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Encrypted
                  </span>
                </div>
              </div>

              {/* Shard Cards */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  PERSISTED SHARD MANIFEST RECORD
                </p>
                {fileDetail.shards.map((shard) => (
                  <div
                    key={shard.shard_index}
                    className="p-4 rounded-xl bg-vault-950/70 border border-slate-800 hover:border-vault-cyan/30 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-md bg-vault-cyan/10 text-vault-cyan text-xs font-mono font-bold flex items-center justify-center border border-vault-cyan/20">
                          {shard.shard_index}
                        </span>
                        <span className="text-xs font-mono text-slate-200">
                          shard_{shard.shard_index}.enc
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                        {shard.size_bytes} Bytes
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono">
                        <Hash className="w-3 h-3 text-vault-cyan" />
                        <span>SHA-256 INTEGRITY DIGEST:</span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-300 bg-vault-900 px-3 py-1.5 rounded-lg border border-slate-800/80 break-all select-all">
                        {shard.sha256_hash}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Professor Explanation Notice */}
              <div className="p-4 rounded-xl bg-vault-cyan/5 border border-vault-cyan/20 text-xs space-y-1.5 text-slate-300">
                <div className="flex items-center space-x-2 text-vault-cyan font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>How TriVault Reassembles This File</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  During retrieval, the server validates the SHA-256 checksum of each shard against <code className="text-vault-cyan">manifest.json</code>.
                  If any single byte has been modified or if any shard is missing, reconstruction is aborted.
                  All three shards are concatenated into the original ciphertext and decrypted via Fernet AES-128-CBC.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-vault-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
