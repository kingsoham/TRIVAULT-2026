import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StoredFile } from '../types';
import {
  HardDrive,
  Layers,
  UploadCloud,
  FileText,
  Shield,
  Eye,
  Download,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { FileUploadModal } from '../components/FileUploadModal';
import { ShardInspectionModal } from '../components/ShardInspectionModal';
import { ToastContainer } from '../components/Toast';
import { ToastMessage } from '../types';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalSizeBytes, setTotalSizeBytes] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFileForShard, setSelectedFileForShard] = useState<StoredFile | null>(null);
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

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.listFiles();
      setFiles(data.files);
      setTotalCount(data.total_count);
      setTotalSizeBytes(data.total_size_bytes);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

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

  const handleDownload = async (file: StoredFile) => {
    try {
      addToast('info', `Reassembling 3 shards and decrypting ${file.filename}...`);
      await api.downloadFile(file.id, file.filename);
      addToast('success', `${file.filename} downloaded successfully.`);
    } catch (err: any) {
      addToast('error', err.message || 'Download failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-vault-900 via-vault-850 to-vault-900 border border-slate-800 card-glow">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Welcome back, {user?.username}
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
              VAULT ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Every stored file is encrypted with Fernet and distributed across 3 ordered shards.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadDashboardData}
            title="Refresh dashboard metrics"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-vault-cyan hover:bg-vault-cyanGlow text-slate-950 font-semibold text-sm shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all flex items-center space-x-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload New File</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Cards — Derived strictly from real backend database */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Files Card */}
        <div className="p-5 rounded-2xl bg-vault-900 border border-slate-800 space-y-3 card-glow-hover transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Files</span>
            <div className="w-8 h-8 rounded-lg bg-vault-cyan/10 border border-vault-cyan/30 flex items-center justify-center text-vault-cyan">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white font-mono">{totalCount}</span>
            <span className="text-xs text-slate-500 font-mono">records in SQLite</span>
          </div>
        </div>

        {/* Total Storage Used */}
        <div className="p-5 rounded-2xl bg-vault-900 border border-slate-800 space-y-3 card-glow-hover transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Original Data Size</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white font-mono">{formatFileSize(totalSizeBytes)}</span>
            <span className="text-xs text-slate-500 font-mono">unencrypted bytes</span>
          </div>
        </div>

        {/* Shard Multiplication Metric */}
        <div className="p-5 rounded-2xl bg-vault-900 border border-slate-800 space-y-3 card-glow-hover transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Encrypted Shards</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-emerald-400 font-mono">{totalCount * 3}</span>
            <span className="text-xs text-slate-500 font-mono">physical .enc files</span>
          </div>
        </div>
      </div>

      {/* Recent Uploads Table */}
      <div className="bg-vault-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Shield className="w-4 h-4 text-vault-cyan" />
            <h2 className="text-sm font-semibold text-slate-200">Recent Vault Uploads</h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {files.length > 5 ? 'Showing latest 5 files' : `${files.length} items`}
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs font-mono">
            <div className="w-6 h-6 border-2 border-vault-cyan/30 border-t-vault-cyan rounded-full animate-spin mx-auto mb-2" />
            Loading files from SQLite database...
          </div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-vault-950 border border-slate-800 flex items-center justify-center text-slate-600 mx-auto">
              <HardDrive className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-300 font-medium">Your secure vault is currently empty</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload your first file to see how Fernet encryption and 3-shard storage work in real time.
            </p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-vault-cyan/10 hover:bg-vault-cyan/20 text-vault-cyan border border-vault-cyan/30 text-xs font-semibold transition-all"
            >
              Upload a File Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-vault-950/70 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-6">File Name</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Shards</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {files.slice(0, 5).map((file) => (
                  <tr key={file.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-slate-200 flex items-center space-x-2.5">
                      <FileText className="w-4 h-4 text-vault-cyan shrink-0" />
                      <span className="truncate max-w-[200px] sm:max-w-xs">{file.filename}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{formatFileSize(file.size)}</td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                        3 Shards
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{formatDate(file.created_at)}</td>
                    <td className="py-3.5 px-6 text-right space-x-2">
                      <button
                        onClick={() => setSelectedFileForShard(file)}
                        title="Inspect physical shards and SHA-256 manifest"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-vault-cyan/10 text-slate-400 hover:text-vault-cyan border border-slate-700 hover:border-vault-cyan/30 transition-all inline-flex items-center"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownload(file)}
                        title="Reassemble and download original file"
                        className="p-1.5 rounded-lg bg-vault-cyan/10 hover:bg-vault-cyan/20 text-vault-cyan border border-vault-cyan/30 transition-all inline-flex items-center"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals & Toasts */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={() => {
          loadDashboardData();
          addToast('success', 'File encrypted, sharded into 3 files, and saved.');
        }}
        onError={(msg) => addToast('error', msg)}
      />

      <ShardInspectionModal
        file={selectedFileForShard}
        isOpen={!!selectedFileForShard}
        onClose={() => setSelectedFileForShard(null)}
      />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
