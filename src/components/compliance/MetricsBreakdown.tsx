import React from 'react';
import { ComplianceScore } from '../../types/compliance';

interface MetricsBreakdownProps {
  scoreData: ComplianceScore;
}

export const MetricsBreakdown: React.FC<MetricsBreakdownProps> = ({ scoreData }) => {
  const { totalChecks, passed, review, failed, na } = scoreData;

  return (
    <div className="dash-metrics-breakdown-block p-5 bg-white border border-slate-200 rounded-md shadow-xs flex flex-col justify-between">
      <div className="dash-section-sub text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
        Rule Evaluation Breakdown
      </div>

      <div className="dash-metrics-grid grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="dash-metric-tile tile-total p-2.5 bg-slate-50 border border-slate-200 rounded text-center">
          <span className="tile-k block text-[11px] font-medium text-slate-500 mb-0.5">Total Rules</span>
          <strong id="dash-stat-total" className="tile-v text-base font-bold text-slate-900">
            {totalChecks}
          </strong>
        </div>

        <div className="dash-metric-tile tile-pass p-2.5 bg-emerald-50/60 border border-emerald-200 rounded text-center">
          <span className="tile-k block text-[11px] font-medium text-emerald-800 mb-0.5">Passed</span>
          <strong id="dash-stat-passed" className="tile-v text-base font-bold text-emerald-700">
            ✓ {passed}
          </strong>
        </div>

        <div className="dash-metric-tile tile-review p-2.5 bg-amber-50/60 border border-amber-200 rounded text-center">
          <span className="tile-k block text-[11px] font-medium text-amber-800 mb-0.5">Review</span>
          <strong id="dash-stat-review" className="tile-v text-base font-bold text-amber-700">
            ⚠️ {review}
          </strong>
        </div>

        <div className="dash-metric-tile tile-fail p-2.5 bg-red-50/60 border border-red-200 rounded text-center">
          <span className="tile-k block text-[11px] font-medium text-red-800 mb-0.5">Failed</span>
          <strong id="dash-stat-failed" className="tile-v text-base font-bold text-red-700">
            ✕ {failed}
          </strong>
        </div>

        <div className="dash-metric-tile tile-na p-2.5 bg-slate-100 border border-slate-200 rounded text-center col-span-2 sm:col-span-1">
          <span className="tile-k block text-[11px] font-medium text-slate-600 mb-0.5">N/A</span>
          <strong id="dash-stat-na" className="tile-v text-base font-bold text-slate-700">
            — {na}
          </strong>
        </div>
      </div>
    </div>
  );
};
