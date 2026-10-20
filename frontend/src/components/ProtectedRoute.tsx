import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-vault-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-12 h-12 border-4 border-vault-cyan/30 border-t-vault-cyan rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-mono tracking-wider">VERIFYING TRIVAULT CRYPTOGRAPHIC IDENTITY...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
