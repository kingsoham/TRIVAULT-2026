import React, { useState } from 'react';
import { StoredFile } from '../types';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  file: StoredFile | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (fileId: number) => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  file,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !file) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await onConfirm(file.id);
      setIsDeleting(false);
      onClose();
    } catch (err: any) {
      setIsDeleting(false);
      setError(err.message || 'Failed to delete file.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-vault-900 border border-rose-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-white text-base">Confirm Permanent Deletion</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1 leading-relaxed">
            <div className="flex items-center space-x-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>This operation cannot be undone</span>
            </div>
            <p>
              Deleting <strong className="text-white font-mono">{file.filename}</strong> will immediately erase all 3 encrypted shards (<code className="text-rose-200">shard_1.enc</code>, <code className="text-rose-200">shard_2.enc</code>, <code className="text-rose-200">shard_3.enc</code>) and remove all database metadata.
            </p>
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all disabled:opacity-50"
            >
              {isDeleting ? 'Deleting Shards...' : 'Yes, Delete Permanently'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
