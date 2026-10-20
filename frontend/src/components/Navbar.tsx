import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, LogOut, User as UserIcon } from 'lucide-react';
import { api } from '../services/api';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [systemHealth, setSystemHealth] = useState<'healthy' | 'checking' | 'degraded'>('checking');

  useEffect(() => {
    api.checkHealth()
      .then((res) => {
        setSystemHealth(res.status === 'healthy' ? 'healthy' : 'degraded');
      })
      .catch(() => {
        setSystemHealth('degraded');
      });
  }, []);

  return (
    <header className="h-16 border-b border-slate-800 bg-vault-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-vault-cyan/10 border border-vault-cyan/30 flex items-center justify-center text-vault-cyan shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg tracking-tight text-white">TriVault</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-vault-cyan/10 text-vault-cyan border border-vault-cyan/20">
              v1.0 • 3-SHARD
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">Split into Three. Secured as One.</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* System Status Pill */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-vault-950 border border-slate-800 text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${
            systemHealth === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 'bg-amber-500 animate-pulse'
          }`} />
          <span className="text-slate-300">CORE STATUS:</span>
          <span className={systemHealth === 'healthy' ? 'text-emerald-400' : 'text-amber-400'}>
            {systemHealth.toUpperCase()}
          </span>
        </div>

        {/* User Profile */}
        {user && (
          <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="hidden sm:block text-left text-xs">
              <p className="font-semibold text-slate-200">{user.username}</p>
              <p className="text-slate-500 truncate max-w-[140px]">{user.email}</p>
            </div>
            <button
              onClick={logout}
              title="End active session"
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition-all text-xs flex items-center space-x-1"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
