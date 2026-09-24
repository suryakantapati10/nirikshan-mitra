import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onNavigate?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const { user, isAuthenticated, logout, role } = useAuth();

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out of Nirikshan Mitra?')) {
      await logout();
      if (onNavigate) onNavigate('role-select');
    }
  };

  const displayName = user?.name || (role === 'admin' ? 'Administrator' : 'Legal Metrology Inspector');
  const roleLabel = role === 'admin' ? 'Admin' : 'Inspector';
  const roleBadgeClass =
    role === 'admin'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-blue-100 text-blue-800 border-blue-300';

  return (
    <header className="site-header bg-[#0B1F33] text-white border-b border-[#1E293B] shadow-sm">
      <div className="header-inner max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left Branding Group */}
        <div
          className="header-brand-group flex items-center space-x-3.5 cursor-pointer"
          onClick={() => isAuthenticated && onNavigate && onNavigate('dashboard')}
          title="Nirikshan Mitra Home"
        >
          <div className="emblem flex-shrink-0 text-white" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="38" height="38" role="img" aria-label="State Emblem">
              <circle cx="24" cy="24" r="21" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
              <circle cx="24" cy="24" r="13" fill="none" stroke="#FFFFFF" strokeWidth="1" />
              <line x1="24" y1="10" x2="24" y2="38" stroke="#FFFFFF" strokeWidth="1" />
              <line x1="10" y1="24" x2="38" y2="24" stroke="#FFFFFF" strokeWidth="1" />
              <line x1="14" y1="14" x2="34" y2="34" stroke="#FFFFFF" strokeWidth="0.8" />
              <line x1="34" y1="14" x2="14" y2="34" stroke="#FFFFFF" strokeWidth="0.8" />
              <circle cx="24" cy="24" r="2" fill="#FFFFFF" />
            </svg>
          </div>
          <div className="header-titles">
            <h1 className="portal-name text-xl font-bold tracking-tight text-white m-0">Nirikshan Mitra</h1>
            <p className="portal-sub text-xs text-slate-300 m-0 font-normal">
              Packaged Commodity Compliance Portal &middot; Legal Metrology
            </p>
          </div>
        </div>

        {/* Right Auth Controls (Authenticated) */}
        {isAuthenticated && (
          <div id="header-auth-controls" className="header-auth-controls flex items-center space-x-3">
            <div
              id="user-profile-widget"
              className="header-account-block flex items-center space-x-2.5 bg-[#132B45] border border-[#1E3A5F] px-3 py-1.5 rounded"
              aria-label="Authenticated Account"
            >
              <span className="user-avatar text-base" id="officer-avatar" aria-hidden="true">
                👤
              </span>
              <div className="user-profile-text flex flex-col text-left">
                <span className="officer-display-name text-xs font-semibold text-slate-100" id="officer-display-name">
                  {displayName}
                </span>
                <span
                  className={`officer-role-badge text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${roleBadgeClass}`}
                  id="officer-role-badge"
                >
                  {roleLabel}
                </span>
              </div>
            </div>

            <button
              type="button"
              id="btn-logout"
              onClick={handleSignOut}
              className="btn-header-signout text-xs font-medium bg-transparent hover:bg-red-950/40 text-red-300 hover:text-red-200 border border-red-800/70 hover:border-red-600 px-3 py-1.5 rounded transition-colors"
              title="Sign out of Nirikshan Mitra"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
