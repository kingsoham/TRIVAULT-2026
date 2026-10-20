import React, { useState, useEffect } from 'react';
import { StoredFile } from '../types';
import { Edit2, X } from 'lucide-react';

interface RenameModalProps {
  file: StoredFile | null;
  isOpen: boolean;
  onClose: () => void;
  onRename: (fileId: number, newName: string) => Promise<void>;
}

export const RenameModal: React.FC<RenameModalProps> = ({ file, isOpen, onClose, onRename }) => {
  const [newFilename, setNewFilename] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      setNewFilename(file.filename);
      setError(null);
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFilename.trim();
    if (!clean) {
      setError('Filename cannot be empty.');
      return;
    }
    if (clean === file.filename) {
      onClose();
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onRename(file.id, clean);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to rename file.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-vault-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-vault-cyan/10 border border-vault-cyan/30 flex items-center justify-center text-vault-cyan">
              <Edit2 className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-white text-base">Rename Stored File</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
              NEW FILENAME
            </label>
            <input
              type="text"
              value={newFilename}
              onChange={(e) => setNewFilename(e.target.value)}
              placeholder="e.g., project_report.pdf"
              className="w-full px-3.5 py-2.5 rounded-xl bg-vault-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-vault-cyan font-mono"
              autoFocus
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Note: This updates the display metadata only. Physical shard directories remain isolated.
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
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-vault-cyan hover:bg-vault-cyanGlow text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Save Name'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
