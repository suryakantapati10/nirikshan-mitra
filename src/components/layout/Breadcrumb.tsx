import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface BreadcrumbProps {
  currentTitle: string;
  onHomeClick: () => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ currentTitle, onHomeClick }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <div className="breadcrumb-bar bg-[#F1F5F9] border-b border-slate-200 py-2 px-4 sm:px-8 text-xs text-slate-600" id="breadcrumb-bar" aria-label="Breadcrumb">
      <div className="breadcrumb-inner max-w-7xl mx-auto flex items-center space-x-2">
        <button
          type="button"
          onClick={onHomeClick}
          className="text-[#0056A6] hover:underline cursor-pointer font-medium"
        >
          Home
        </button>
        <span className="breadcrumb-sep text-slate-400" aria-hidden="true">›</span>
        <span className="breadcrumb-current text-slate-700 font-semibold" aria-current="page">
          {currentTitle}
        </span>
      </div>
    </div>
  );
};
