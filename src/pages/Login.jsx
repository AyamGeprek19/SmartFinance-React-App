import React, { useState } from 'react';
import { apiRequest } from '../lib/api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      onLogin(data.user);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center p-4 selection:bg-primary selection:text-on-primary font-body-md">
      <div className="max-w-md w-full bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-surface-container-high">
        <div className="flex flex-col items-center mb-8">
          <img alt="SmartFinance Logo" className="h-12 w-auto mb-4 object-contain" src="https://lh3.googleusercontent.com/aida/AEtjO1UuIlNTj5eccxRmvbpbIOhDN_OccVyHLK0Ehn4NvIlQACp-MoSA1oqKfk4ut28Rsu0a1T9ntjTbHkVShcLf8kO2US8YBWoZEMY4yOquId535Tp3D1oIB_ZBFGp4LvTrW_9DrjtJjWnjfOoLddv1Zth_UKtFsKWmdCfznXss_drxjXnb1s_rdSttKuK2viWpbz-FtD-t3NWqC1s4BP5OOrFrnqSHOTl-zNQ-pLf8yeZeruk6bkKE9dltj-k" />
          <h1 className="text-display-lg-mobile font-semibold text-on-surface tracking-tight">Welcome Back</h1>
          <p className="text-on-surface-variant text-body-md mt-2">Sign in to SmartFinance Platform</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-label-md font-medium text-on-surface-variant mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-surface-container px-4 py-3 rounded-lg text-on-surface border border-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors placeholder:text-outline"
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="block text-label-md font-medium text-on-surface-variant mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container px-4 py-3 rounded-lg text-on-surface border border-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors placeholder:text-outline"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-on-primary py-3 rounded-lg font-label-md font-bold text-label-md hover:bg-primary-fixed transition-colors mt-2 shadow-sm"
          >
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        {error && <p className="mt-4 text-center text-sm text-red-400" role="alert">{error}</p>}
        
        <div className="mt-8 border-t border-surface-container pt-6">
          <div className="text-center text-label-sm text-on-surface-variant uppercase tracking-wider mb-4 font-semibold">Account Access</div>
          <button onClick={() => { setUsername('admin'); setPassword(''); }} className="w-full flex items-center justify-center gap-2 bg-surface-container-high hover:bg-surface-bright text-on-surface py-2.5 rounded-lg text-label-md font-medium transition-colors border border-transparent hover:border-outline-variant">
            <span className="material-symbols-outlined text-[18px] text-primary">account_circle</span>
            Use admin username
          </button>
        </div>
      </div>
    </div>
  );
}