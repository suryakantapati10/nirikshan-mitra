import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface NavigationProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onSelectTab }) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <nav className="main-nav bg-white border-b border-slate-200" id="main-nav-bar" aria-label="Primary Navigation">
      <div className="nav-inner max-w-7xl mx-auto px-4 sm:px-8">
        <ul className="flex space-x-1 sm:space-x-4 m-0 p-0 list-none">
          <li>
            <button
              type="button"
              id="nav-link-dashboard"
              onClick={() => onSelectTab('dashboard')}
              className={`nav-link py-3 px-3 sm:px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'text-[#0056A6] border-[#0056A6] active'
                  : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
              data-target="dashboard"
            >
              Dashboard
            </button>
          </li>
          <li>
            <button
              type="button"
              id="nav-link-history"
              onClick={() => onSelectTab('history')}
              className={`nav-link py-3 px-3 sm:px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'text-[#0056A6] border-[#0056A6] active'
                  : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
              data-target="history"
            >
              Inspection History
            </button>
          </li>
          {role === 'admin' && (
            <li id="nav-admin-tab-item">
              <button
                type="button"
                id="nav-link-admin"
                onClick={() => onSelectTab('admin')}
                className={`nav-link py-3 px-3 sm:px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'admin'
                    ? 'text-[#0056A6] border-[#0056A6] active'
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                }`}
                data-target="admin"
              >
                Admin Panel
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};
