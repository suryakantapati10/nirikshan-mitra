import React, { useState } from 'react';
import { HistoryToolbar } from './HistoryToolbar';
import { InspectionRecord } from '../../types/inspection';

interface InspectionHistoryTableProps {
  inspections: InspectionRecord[];
  onRefresh: () => void;
  onGoToScan: () => void;
  onViewDetails: (id: string) => void;
  onViewBrandHistory: (brand: string) => void;
  onDownloadPdf: (id: string) => void;
}

export const InspectionHistoryTable: React.FC<InspectionHistoryTableProps> = ({
  inspections,
  onRefresh,
  onGoToScan,
  onViewDetails,
  onViewBrandHistory,
  onDownloadPdf
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  const filteredInspections = inspections.filter((row) => {
    let matchesTerm = true;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const id = (row.inspection_id || '').toLowerCase();
      const b = (row.brand_name || '').toLowerCase();
      const p = (row.product_name || '').toLowerCase();
      matchesTerm = id.includes(term) || b.includes(term) || p.includes(term);
    }

    let matchesStatus = true;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'COMPLIANT') {
        matchesStatus = row.overall_status === 'COMPLIANT';
      } else if (statusFilter === 'POTENTIAL_VIOLATION') {
        matchesStatus =
          row.overall_status === 'POTENTIAL_VIOLATION' || row.overall_status === 'NON_COMPLIANT';
      } else if (statusFilter === 'NEEDS_REVIEW') {
        matchesStatus = row.overall_status === 'NEEDS_REVIEW' || row.overall_status === 'PENDING';
      }
    }

    let matchesRisk = true;
    if (riskFilter !== 'ALL') {
      const r = (row.risk_level || 'LOW').toUpperCase();
      matchesRisk = r === riskFilter;
    }

    return matchesTerm && matchesStatus && matchesRisk;
  });

  return (
    <section id="history-panel" className="view-section history-panel max-w-7xl mx-auto px-4 sm:px-8 py-6" aria-labelledby="history-heading">
      <div className="history-header flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 id="history-heading" className="history-title text-2xl font-bold text-[#0B1F33] m-0">
            Inspection History &amp; Compliance Archive
          </h2>
          <p className="section-desc text-xs text-slate-500 m-0 mt-1">
            Centralized repository of packaged commodity inspections under Legal Metrology Rules, 2011.
          </p>
        </div>
        <div className="history-header-actions flex items-center space-x-2.5">
          <button
            type="button"
            id="btn-refresh-history"
            onClick={onRefresh}
            className="btn btn-outline btn-sm border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer"
          >
            Refresh
          </button>
          <button
            type="button"
            id="btn-go-to-scan"
            onClick={onGoToScan}
            className="btn btn-primary btn-sm bg-[#0056A6] hover:bg-[#004482] text-white px-3.5 py-1.5 rounded text-xs font-bold shadow-xs cursor-pointer"
          >
            Scan New Product
          </button>
        </div>
      </div>

      <HistoryToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        riskFilter={riskFilter}
        onRiskChange={setRiskFilter}
        totalCount={filteredInspections.length}
      />

      <div className="history-table-container bg-white border border-slate-200 rounded-md shadow-xs overflow-x-auto">
        <table className="history-table w-full text-left text-xs border-collapse" aria-label="Inspection History Table">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-semibold text-[11px] uppercase tracking-wider">
              <th scope="col" className="p-3">Inspection ID</th>
              <th scope="col" className="p-3">Date / Time</th>
              <th scope="col" className="p-3">Brand</th>
              <th scope="col" className="p-3">Product</th>
              <th scope="col" className="p-3">Type</th>
              <th scope="col" className="p-3">Score</th>
              <th scope="col" className="p-3">Status</th>
              <th scope="col" className="p-3">Issues</th>
              <th scope="col" className="p-3">Risk Priority</th>
              <th scope="col" className="p-3">Rule Ver</th>
              <th scope="col" className="p-3">Inspector</th>
              <th scope="col" className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody id="history-table-tbody" className="divide-y divide-slate-100">
            {filteredInspections.map((row) => {
              const d = new Date(row.inspected_at || '');
              const dateStr = isNaN(d.getTime())
                ? row.inspected_at || '—'
                : d.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

              const isCompliant = row.overall_status === 'COMPLIANT';
              const isViolation =
                row.overall_status === 'POTENTIAL_VIOLATION' ||
                row.overall_status === 'NON_COMPLIANT';
              const statusClass = isCompliant
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 status-compliant'
                : isViolation
                ? 'bg-red-50 text-red-800 border-red-300 status-noncompliant'
                : 'bg-amber-50 text-amber-800 border-amber-300 status-pending';

              const statusLabel = isCompliant
                ? 'COMPLIANT'
                : isViolation
                ? 'POTENTIAL VIOLATION'
                : 'NEEDS REVIEW';

              const score = typeof row.overall_score === 'number' ? row.overall_score : 0;
              const scoreBadgeClass =
                score >= 85
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 score-high'
                  : score >= 60
                  ? 'bg-amber-50 text-amber-800 border-amber-300 score-mid'
                  : 'bg-red-50 text-red-800 border-red-300 score-low';

              const violationCount =
                typeof row.violation_count === 'number' ? row.violation_count : 0;
              const riskLevel = (row.risk_level || 'LOW').toUpperCase();
              const riskClass =
                riskLevel === 'HIGH'
                  ? 'bg-red-100 text-red-800 border-red-300 risk-high'
                  : riskLevel === 'MEDIUM'
                  ? 'bg-amber-100 text-amber-800 border-amber-300 risk-medium'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300 risk-low';

              return (
                <tr key={row.inspection_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3">
                    <span className="mono-id text-[#0056A6] font-mono font-semibold">
                      {row.inspection_id}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                    {dateStr}
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => onViewBrandHistory(row.brand_name || 'Generic / Unspecified')}
                      className="btn-link-brand text-[#0056A6] hover:underline font-semibold cursor-pointer text-left"
                    >
                      {row.brand_name || 'Generic / Unspecified'}
                    </button>
                  </td>
                  <td className="p-3 font-semibold text-slate-800 max-w-xs truncate">
                    {row.product_name || 'Packaged Product'}
                  </td>
                  <td className="p-3">
                    <span className="pkg-badge text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      {row.package_type || 'Other'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`score-pill text-[11px] font-bold px-2 py-0.5 rounded border ${scoreBadgeClass}`}>
                      {score}<small className="text-[9px] font-normal">/100</small>
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`status-pill text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="p-3">
                    {violationCount > 0 ? (
                      <span className="issues-count-pill issues-has text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                        {violationCount} issue{violationCount === 1 ? '' : 's'}
                      </span>
                    ) : (
                      <span className="issues-count-pill issues-zero text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        0 issues
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`risk-pill text-[10px] font-bold px-2 py-0.5 rounded border ${riskClass}`}>
                      {riskLevel}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="rule-ver-tag text-[11px] text-slate-500 font-mono">
                      v{row.rule_version || '1.0.0'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 truncate max-w-[120px]">
                    <span className="inspector-badge">{row.inspector_name || 'Unassigned'}</span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <div className="table-actions-cell flex items-center justify-end space-x-1.5">
                      <button
                        type="button"
                        onClick={() => onViewDetails(row.inspection_id)}
                        className="btn btn-xs btn-outline btn-view-insp border border-slate-300 hover:bg-slate-100 text-slate-700 px-2 py-1 rounded text-[11px] font-medium cursor-pointer"
                        title="View stored inspection record"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => onViewBrandHistory(row.brand_name || 'Generic / Unspecified')}
                        className="btn btn-xs btn-outline btn-brand-hist border border-slate-300 hover:bg-slate-100 text-slate-700 px-2 py-1 rounded text-[11px] font-medium cursor-pointer"
                        title="View historical violations for this brand"
                      >
                        Brand
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownloadPdf(row.inspection_id)}
                        className="btn btn-xs btn-outline btn-download-pdf-row border border-[#0056A6] text-[#0056A6] hover:bg-blue-50 px-2 py-1 rounded text-[11px] font-medium cursor-pointer"
                        title="Download PDF inspection report"
                      >
                        PDF
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredInspections.length === 0 && (
          <div id="history-empty-state" className="history-empty-state text-center py-12 px-4">
            <span className="empty-icon text-4xl block mb-2" aria-hidden="true">📋</span>
            <h4 className="text-base font-bold text-slate-800 m-0">No Inspections Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No inspection records match your filter criteria or no scans have been performed yet.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
