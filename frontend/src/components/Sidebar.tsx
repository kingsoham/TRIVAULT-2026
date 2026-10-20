import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, HardDrive, ShieldCheck, Database, Key } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/files', label: 'File Vault', icon: HardDrive },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-vault-900 flex flex-col justify-between shrink-0">
      <div className="p-4 space-y-6">
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
            NAVIGATION
          </p>
          <nav className="space-y-1 pt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-vault-cyan/10 text-vault-cyan border border-vault-cyan/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Security Architecture Badge Box */}
        <div className="p-3.5 rounded-xl bg-vault-950/80 border border-slate-800 space-y-2.5">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cryptographic Pipeline</span>
          </div>
          <div className="space-y-2 text-[11px] text-slate-400 font-mono">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Key className="w-3 h-3 text-vault-cyan" /> Encryption:</span>
              <span className="text-slate-300">Fernet (AES-128)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Database className="w-3 h-3 text-vault-cyan" /> Shards:</span>
              <span className="text-slate-300">3 Parts (Ordered)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-vault-cyan" /> Integrity:</span>
              <span className="text-slate-300">HMAC + SHA-256</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
        <p>Field Project Implementation</p>
        <p className="text-slate-600">Second Year Engineering</p>
      </div>
    </aside>
  );
};
