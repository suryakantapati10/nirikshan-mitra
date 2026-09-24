import React from 'react';
import { ComplianceScore } from '../../types/compliance';

interface ScoreCardProps {
  scoreData: ComplianceScore;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({ scoreData }) => {
  const { score, overallStatus, statusKey } = scoreData;

  const statusTheme =
    statusKey === 'COMPLIANT'
      ? {
          pill: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          fill: 'bg-emerald-600',
          icon: '✓'
        }
      : statusKey === 'NEEDS_REVIEW'
      ? {
          pill: 'bg-amber-50 text-amber-800 border-amber-300',
          fill: 'bg-amber-500',
          icon: '⚠️'
        }
      : {
          pill: 'bg-red-50 text-red-800 border-red-300',
          fill: 'bg-red-600',
          icon: '✕'
        };

  return (
    <div className="dash-score-dial-block flex flex-col justify-between p-5 bg-white border border-slate-200 rounded-md shadow-xs">
      <div className="dash-score-number-row flex items-baseline space-x-1 mb-2">
        <span id="dash-score-val" className="dash-score-giant text-4xl font-extrabold text-[#0B1F33]">
          {score}
        </span>
        <span className="dash-score-giant-denom text-sm font-semibold text-slate-400">/ 100</span>
      </div>

      <div
        className="dash-score-meter-track w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200 mb-4"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        id="dash-meter-track"
      >
        <div
          id="dash-meter-fill"
          className={`dash-score-meter-fill h-full rounded-full transition-all duration-500 ${statusTheme.fill}`}
          style={{ width: `${Math.max(4, score)}%` }}
        ></div>
      </div>

      <div className="dash-status-row flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <span className="dash-status-prompt text-slate-500 font-medium">Overall Assessment:</span>
        <div
          id="dash-status-pill"
          className={`dash-overall-status-pill flex items-center space-x-1.5 px-2.5 py-1 rounded font-bold border text-xs ${statusTheme.pill}`}
        >
          <span id="dash-status-icon" className="status-icon" aria-hidden="true">
            {statusTheme.icon}
          </span>
          <span id="dash-status-text" className="status-text tracking-wide">
            {overallStatus}
          </span>
        </div>
      </div>
    </div>
  );
};
