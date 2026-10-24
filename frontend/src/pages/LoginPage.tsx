import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, User, ArrowRight, AlertCircle, KeyRound } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { username: 'demo_user', email: 'demo@trivault.dev', password: 'Demo@1234' },
  { username: 'alice_dev', email: 'alice@trivault.dev', password: 'Alice@5678' },
  { username: 'bob_tester', email: 'bob@trivault.dev', password: 'Bob@9012' },
];

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide your username and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(username.trim(), password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vault-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-vault-cyan/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-vault-cyan/10 border border-vault-cyan/30 text-vault-cyan shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">TriVault Secure Gateway</h1>
          <p className="text-xs text-slate-400 font-mono">Split into Three. Secured as One.</p>
        </div>

        {/* Login Card */}
        <div className="bg-vault-900 border border-slate-800 rounded-2xl p-8 shadow-2xl card-glow space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-semibold text-slate-200">Account Authentication</h2>
            <p className="text-xs text-slate-500 mt-0.5">Sign in to access your encrypted file shards</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. alice or alice@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-vault-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-vault-cyan transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-vault-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-vault-cyan transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-vault-cyan hover:bg-vault-cyanGlow text-slate-950 font-semibold text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Vault</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-vault-cyan hover:underline font-medium">
              Create an account
            </Link>
          </div>
        </div>

        {/* Security Disclaimers */}
        <div className="text-center text-[11px] text-slate-500 font-mono">
          Protected by Bcrypt Salting & HMAC-SHA256 JWT Authentication
        </div>

        {/* Demo Credentials Card */}
        <div className="bg-vault-900/60 border border-vault-cyan/20 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-2 text-vault-cyan">
            <KeyRound className="w-4 h-4" />
            <h3 className="text-sm font-semibold tracking-wide">Demo Credentials</h3>
          </div>
          <p className="text-[11px] text-slate-400">
            Use any of the following accounts to explore the app:
          </p>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <div
                key={acc.username}
                className="flex items-center justify-between bg-vault-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">{acc.username}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">
                    {acc.email} &nbsp;·&nbsp; <span className="text-slate-400">{acc.password}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUsername(acc.username);
                    setPassword(acc.password);
                    setError(null);
                  }}
                  className="ml-3 shrink-0 px-3 py-1 rounded-lg bg-vault-cyan/10 border border-vault-cyan/30 text-vault-cyan text-[11px] font-semibold hover:bg-vault-cyan/20 transition-colors"
                >
                  Use
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
