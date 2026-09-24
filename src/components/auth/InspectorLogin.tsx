import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface InspectorLoginProps {
  onBackToRoles: () => void;
  onLoginSuccess: () => void;
}

export const InspectorLogin: React.FC<InspectorLoginProps> = ({ onBackToRoles, onLoginSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both official email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(email.trim(), password);
      if (res.success && res.user) {
        if (res.user.role !== 'inspector') {
          setError('This account has Administrator privileges. Please use the Admin Login screen.');
          return;
        }
        onLoginSuccess();
      } else {
        setError(res.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Network or server error during sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = () => {
    setEmail('inspector@nirikshan.gov.in');
    setPassword('Inspector@12345');
    setError(null);
  };

  return (
    <section id="inspector-login-view" className="auth-page-view py-12 px-4 max-w-md mx-auto" aria-labelledby="inspector-login-title">
      <div className="auth-page-card bg-white border border-slate-200 rounded-md shadow-sm p-6 sm:p-8">
        <div className="auth-card-top-nav flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
          <button
            type="button"
            className="btn-back-role text-xs text-[#0056A6] hover:underline font-medium cursor-pointer"
            id="btn-back-role-from-inspector"
            onClick={onBackToRoles}
          >
            &larr; Choose Role
          </button>
          <span className="auth-role-tag text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
            Inspector Authentication
          </span>
        </div>

        <div className="auth-card-header text-center mb-6">
          <h2 id="inspector-login-title" className="auth-card-title text-xl font-bold text-[#0B1F33]">
            Inspector Login
          </h2>
          <p className="auth-card-sub text-xs text-slate-500 mt-1">
            Nirikshan Mitra &middot; Legal Metrology Packaged Commodity Portal
          </p>
        </div>

        {error && (
          <div
            id="inspector-login-error"
            className="error-banner bg-red-50 text-red-700 border border-red-200 text-xs p-3 rounded mb-4 font-medium"
            role="alert"
          >
            {error}
          </div>
        )}

        <form id="form-inspector-login" onSubmit={handleSubmit} autoComplete="on">
          <div className="form-group mb-4">
            <label htmlFor="inspector-email" className="block text-xs font-semibold text-slate-700 mb-1">
              Government Email Address
            </label>
            <input
              type="email"
              id="inspector-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0056A6] focus:ring-1 focus:ring-[#0056A6]"
              placeholder="inspector@nirikshan.gov.in"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group mb-5">
            <label htmlFor="inspector-password" className="block text-xs font-semibold text-slate-700 mb-1">
              Account Password
            </label>
            <input
              type="password"
              id="inspector-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0056A6] focus:ring-1 focus:ring-[#0056A6]"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            id="btn-inspector-login-submit"
            disabled={isSubmitting}
            className="btn btn-primary btn-block btn-login-submit w-full bg-[#0056A6] hover:bg-[#004482] text-white font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Verifying Inspector Credentials...' : 'Login as Inspector'}
          </button>
        </form>

        <div className="auth-quick-fill-box mt-6 pt-5 border-t border-slate-200 text-center">
          <div className="quick-fill-label text-[11px] text-slate-500 mb-2 font-medium">Prototype Test Account:</div>
          <button
            type="button"
            id="btn-quick-fill-inspector"
            onClick={handleQuickFill}
            className="btn-quick-fill text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 py-1.5 px-3 rounded w-full cursor-pointer transition-colors"
          >
            ⚡ Fill Inspector Credentials (inspector@nirikshan.gov.in)
          </button>
        </div>
      </div>
    </section>
  );
};
