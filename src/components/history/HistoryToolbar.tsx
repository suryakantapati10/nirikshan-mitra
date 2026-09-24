import React from 'react';

interface HistoryToolbarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  riskFilter: string;
  onRiskChange: (val: string) => void;
  totalCount: number;
}

export const HistoryToolbar: React.FC<HistoryToolbarProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  riskFilter,
  onRiskChange,
  totalCount
}) => {
  return (
    <div className="history-toolbar bg-white border border-slate-200 rounded-md p-4 mb-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
      <div className="history-search-box flex-1 w-full md:w-auto">
        <input
          type="text"
          id="history-search-input"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="history-search-input w-full border border-slate-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-[#0056A6] focus:ring-1 focus:ring-[#0056A6]"
          placeholder="Filter by ID, brand, product..."
          aria-label="Filter inspections"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
        <div className="history-filter-box flex items-center space-x-2">
          <label htmlFor="history-status-filter" className="filter-label font-semibold text-slate-700">
            Status:
          </label>
          <select
            id="history-status-filter"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="history-status-select border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#0056A6]"
            aria-label="Filter by compliance status"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLIANT">Compliant</option>
            <option value="POTENTIAL_VIOLATION">Potential Violation</option>
            <option value="NEEDS_REVIEW">Needs Review</option>
          </select>
        </div>

        <div className="history-filter-box flex items-center space-x-2">
          <label htmlFor="history-risk-filter" className="filter-label font-semibold text-slate-700">
            Risk Priority:
          </label>
          <select
            id="history-risk-filter"
            value={riskFilter}
            onChange={(e) => onRiskChange(e.target.value)}
            className="history-status-select border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#0056A6]"
            aria-label="Filter by inspection risk priority"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>

        <div
          className="history-count-badge bg-slate-100 border border-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded text-[11px]"
          id="history-count-badge"
        >
          {totalCount} Inspection{totalCount === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  );
};
