import React from 'react';

interface RoleSelectionProps {
  onSelectRole: (role: 'inspector' | 'admin') => void;
}

export const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectRole }) => {
  return (
    <section id="landing-role-selection" className="landing-role-selection py-12 px-4 max-w-4xl mx-auto" aria-labelledby="role-select-title">
      <div className="role-selection-card bg-white border border-slate-200 rounded-md shadow-sm p-6 sm:p-10">
        <div className="role-selection-header text-center mb-8">
          <div className="gov-seal-icon inline-block mb-3" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="48" height="48" role="img" aria-label="State Emblem">
              <circle cx="24" cy="24" r="21" fill="none" stroke="#133766" strokeWidth="1.8" />
              <circle cx="24" cy="24" r="13" fill="none" stroke="#133766" strokeWidth="1.2" />
              <line x1="24" y1="10" x2="24" y2="38" stroke="#133766" strokeWidth="1.2" />
              <line x1="10" y1="24" x2="38" y2="24" stroke="#133766" strokeWidth="1.2" />
              <line x1="14" y1="14" x2="34" y2="34" stroke="#133766" strokeWidth="0.8" />
              <line x1="34" y1="14" x2="14" y2="34" stroke="#133766" strokeWidth="0.8" />
              <circle cx="24" cy="24" r="2" fill="#133766" />
            </svg>
          </div>
          <h2 id="role-select-title" className="role-selection-title text-2xl font-bold text-[#0B1F33]">
            Nirikshan Mitra
          </h2>
          <p className="role-selection-sub text-sm text-slate-500 font-medium">
            Packaged Commodity Compliance Portal &middot; Legal Metrology
          </p>
          <p className="role-selection-intro text-base text-slate-700 mt-3">
            Select your role to continue
          </p>
        </div>

        <div className="role-cards-grid grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Option 1: Inspector Login */}
          <div className="role-option-card border border-slate-200 hover:border-blue-500 rounded p-6 flex flex-col justify-between bg-slate-50/50 hover:bg-white transition-all shadow-xs">
            <div>
              <div className="role-option-badge inline-block text-[11px] font-bold tracking-wider text-[#0056A6] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded mb-3">
                FIELD &amp; ENFORCEMENT
              </div>
              <h3 className="role-option-title text-lg font-bold text-slate-900 mb-2">
                Legal Metrology Inspector
              </h3>
              <p className="role-option-desc text-xs text-slate-600 leading-relaxed mb-6">
                Perform automated label compliance scans, multi-panel inspections, review statutory findings, assess brand risk priority, and generate official compliance reports.
              </p>
            </div>
            <button
              type="button"
              id="btn-goto-inspector-login"
              onClick={() => onSelectRole('inspector')}
              className="btn btn-primary btn-block btn-role-select w-full bg-[#0056A6] hover:bg-[#004482] text-white font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer"
            >
              Inspector Login &rarr;
            </button>
          </div>

          {/* Option 2: Admin Login */}
          <div className="role-option-card border border-slate-200 hover:border-amber-500 rounded p-6 flex flex-col justify-between bg-slate-50/50 hover:bg-white transition-all shadow-xs">
            <div>
              <div className="role-option-badge badge-admin inline-block text-[11px] font-bold tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded mb-3">
                DIRECTORATE &amp; GOVERNANCE
              </div>
              <h3 className="role-option-title text-lg font-bold text-slate-900 mb-2">
                System Administrator
              </h3>
              <p className="role-option-desc text-xs text-slate-600 leading-relaxed mb-6">
                Oversee portal governance, provision officer accounts, configure statutory Legal Metrology rules, and access full inspection intelligence.
              </p>
            </div>
            <button
              type="button"
              id="btn-goto-admin-login"
              onClick={() => onSelectRole('admin')}
              className="btn btn-primary btn-block btn-role-select btn-role-admin w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer"
            >
              Admin Login &rarr;
            </button>
          </div>
        </div>

        <div className="role-selection-footer-note text-center text-xs text-slate-500 mt-8 pt-6 border-t border-slate-200">
          <strong>Official Government Portal:</strong> Legal Metrology (Packaged Commodities) Rules, 2011 &middot; Department of Consumer Affairs, Government of India.
        </div>
      </div>
    </section>
  );
};
