import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StoredFile } from '../types';
import {
  HardDrive,
  UploadCloud,
  FileText,
  Search,
  Download,
  Trash2,
  Edit2,
  Eye,
  RefreshCw,
  AlertCircle,
  ArrowUpDown,
} from 'lucide-react';
import { FileUploadModal } from '../components/FileUploadModal';
import { ShardInspectionModal } from '../components/ShardInspectionModal';
import { RenameModal } from '../components/RenameModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { ToastContainer } from '../components/Toast';
import { ToastMessage } from '../types';

export const FileManagerPage: React.FC = () => {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [shardInspectFile, setShardInspectFile] = useState<StoredFile | null>(null);
  const [renameTargetFile, setRenameTargetFile] = useState<StoredFile | null>(null);
  const [deleteTargetFile, setDeleteTargetFile] = useState<StoredFile | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchFiles = async (search?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.listFiles(search);
      setFiles(res.files);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve files.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(searchQuery);
  }, [searchQuery]);

  const handleDownload = async (file: StoredFile) => {
    try {
      addToast('info', `Reassembling 3 shards for ${file.filename}...`);
      await api.downloadFile(file.id, file.filename);
      addToast('success', `${file.filename} decrypted and downloaded.`);
    } catch (err: any) {
      addToast('error', err.message || 'Download failed.');
    }
  };

  const handleRename = async (fileId: number, newName: string) => {
    await api.renameFile(fileId, newName);
    addToast('success', `File renamed to "${newName}".`);
    fetchFiles(searchQuery);
  };

  const handleDelete = async (fileId: number) => {
    await api.deleteFile(fileId);
    addToast('success', 'File and its 3 shards permanently deleted.');
    fetchFiles(searchQuery);
  };

  // Sorting
  const sortedFiles = [...files].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }
    if (sortBy === 'name') {
      return sortOrder === 'asc'
        ? a.filename.localeCompare(b.filename)
        : b.filename.localeCompare(a.filename);
    }
    if (sortBy === 'size') {
      return sortOrder === 'asc' ? a.size - b.size : b.size - a.size;
    }
    return 0;
  });

  const toggleSort = (type: 'date' | 'name' | 'size') => {
    if (sortBy === type) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(type);
      setSortOrder('asc');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-vault-900 border border-slate-800">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white tracking-tight">Encrypted File Vault</h1>
          <p className="text-xs text-slate-400 font-mono">
            Manage your personal files. Shards are stored separately on disk.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by filename..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-vault-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-vault-cyan transition-colors"
            />
          </div>

          <button
            onClick={() => fetchFiles(searchQuery)}
            title="Refresh File Vault"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-vault-cyan hover:bg-vault-cyanGlow text-slate-950 font-semibold text-xs shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all flex items-center space-x-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* File Table Card */}
      <div className="bg-vault-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-16 text-center text-slate-500 text-xs font-mono">
            <div className="w-8 h-8 border-2 border-vault-cyan/30 border-t-vault-cyan rounded-full animate-spin mx-auto mb-3" />
            Querying SQLite File Registry & Verifying Storage Root...
          </div>
        ) : sortedFiles.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-vault-950 border border-slate-800 flex items-center justify-center text-slate-600 mx-auto">
              <HardDrive className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-300 font-medium">
              {searchQuery ? `No files found matching "${searchQuery}"` : 'No files in vault yet'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? 'Try clearing the search query to view all uploaded files.'
                : 'Click the Upload File button to store your first encrypted document.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-vault-950/70 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th
                    className="py-3.5 px-6 cursor-pointer hover:text-vault-cyan transition-colors"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Filename</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-vault-cyan transition-colors"
                    onClick={() => toggleSort('size')}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Original Size</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Encryption & Sharding</th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-vault-cyan transition-colors"
                    onClick={() => toggleSort('date')}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Date Added</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {sortedFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-3.5 px-6 font-medium text-slate-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-vault-cyan/10 border border-vault-cyan/20 flex items-center justify-center text-vault-cyan shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate max-w-xs md:max-w-sm">
                          <p className="truncate text-slate-200 font-semibold">{file.filename}</p>
                          <p className="text-[11px] text-slate-500 font-mono">ID #{file.id} • {file.content_type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                          Fernet AES
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-vault-cyan/10 text-vault-cyan border border-vault-cyan/20 text-[10px]">
                          3 Shards
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs">
                      {formatDate(file.created_at)}
                    </td>
                    <td className="py-3.5 px-6 text-right space-x-1.5">
                      {/* Inspect Shards */}
                      <button
                        onClick={() => setShardInspectFile(file)}
                        title="Inspect 3 Shards and SHA-256 Manifest"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-vault-cyan/10 text-slate-400 hover:text-vault-cyan border border-slate-700 hover:border-vault-cyan/30 transition-all inline-flex items-center"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Download */}
                      <button
                        onClick={() => handleDownload(file)}
                        title="Reassemble and Download File"
                        className="p-1.5 rounded-lg bg-vault-cyan/10 hover:bg-vault-cyan/20 text-vault-cyan border border-vault-cyan/30 transition-all inline-flex items-center"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Rename */}
                      <button
                        onClick={() => setRenameTargetFile(file)}
                        title="Rename Display Filename"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-all inline-flex items-center"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteTargetFile(file)}
                        title="Delete File and its 3 Shards"
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all inline-flex items-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          fetchFiles(searchQuery);
          addToast('success', 'File encrypted, sharded into 3, and saved to vault.');
        }}
        onError={(msg) => addToast('error', msg)}
      />

      <ShardInspectionModal
        file={shardInspectFile}
        isOpen={!!shardInspectFile}
        onClose={() => setShardInspectFile(null)}
      />

      <RenameModal
        file={renameTargetFile}
        isOpen={!!renameTargetFile}
        onClose={() => setRenameTargetFile(null)}
        onRename={handleRename}
      />

      <DeleteConfirmModal
        file={deleteTargetFile}
        isOpen={!!deleteTargetFile}
        onClose={() => setDeleteTargetFile(null)}
        onConfirm={handleDelete}
      />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
