import React from 'react';
import { RuleEvaluation } from '../../types/compliance';

interface IssuesSectionProps {
  rules: RuleEvaluation[];
}

export const IssuesSection: React.FC<IssuesSectionProps> = ({ rules }) => {
  const issueItems = rules.filter((item) => item.status === 'REVIEW' || item.status === 'FAIL');
  const count = issueItems.length;

  return (
    <section
      className="dash-card dash-issues-card bg-white border border-slate-200 rounded-md p-6 shadow-xs"
      id="dash-issues-card"
      aria-label="Identified Issues and Action Items"
    >
      <div className="section-title-row flex items-center justify-between mb-4">
        <h3 className="section-title text-base font-bold text-[#0B1F33] m-0">
          Identified Issues &amp; Recommended Actions
        </h3>
        <span
          id="dash-issues-count-badge"
          className={`dash-issues-count-badge text-xs font-bold px-2.5 py-1 rounded border ${
            count === 0
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 badge-clean'
              : 'bg-red-50 text-red-800 border-red-300 badge-alert'
          }`}
        >
          {count === 0 ? '0 Issues' : `${count} Issue${count === 1 ? '' : 's'} Detected`}
        </span>
      </div>

      <div id="dash-issues-container" className="dash-issues-container flex flex-col space-y-3">
        {count === 0 ? (
          <div className="dash-issues-clean-card flex items-start space-x-3 bg-emerald-50/50 border border-emerald-200 p-4 rounded-md text-emerald-900">
            <span className="clean-check-icon text-lg font-bold text-emerald-700" aria-hidden="true">
              ✓
            </span>
            <div className="clean-card-text text-xs leading-relaxed">
              <strong className="block text-emerald-800 text-sm font-bold mb-0.5">
                Zero Non-Compliance Issues Detected
              </strong>
              <p className="m-0 text-emerald-700">
                All evaluated mandatory Legal Metrology declarations satisfied preliminary automated validation.
              </p>
            </div>
          </div>
        ) : (
          issueItems.map((issue) => {
            const isFail = issue.status === 'FAIL';
            const boxClass = isFail
              ? 'border-red-200 bg-red-50/30 issue-box-fail'
              : 'border-amber-200 bg-amber-50/30 issue-box-review';
            const badgeClass = isFail
              ? 'bg-red-100 text-red-800 border-red-300 badge-status-fail'
              : 'bg-amber-100 text-amber-800 border-amber-300 badge-status-review';
            const icon = isFail ? '✕' : '⚠️';
            const categoryTag = isFail
              ? 'Critical Missing / Invalid Declaration'
              : 'Requires Verification';

            return (
              <div
                key={issue.field_key}
                className={`dash-issue-box border rounded-md p-4 text-xs ${boxClass}`}
              >
                <div className="issue-box-header flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200/60">
                  <div className="issue-tag-group flex items-center space-x-2">
                    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-bold border ${badgeClass}`}>
                      <span>{icon}</span>
                      <span>{issue.status}</span>
                    </span>
                    <h4 className="issue-field-title text-sm font-bold text-slate-900 m-0">
                      {issue.field_name}
                    </h4>
                  </div>
                  <span className="issue-category-label text-[11px] font-semibold text-slate-500">
                    {categoryTag}
                  </span>
                </div>

                <div className="issue-box-body space-y-1.5 leading-relaxed">
                  <div className="issue-row-finding text-slate-700">
                    <span className="issue-caption font-bold text-slate-900">Finding:</span>{' '}
                    {issue.explanation}
                  </div>
                  <div className="issue-row-action flex items-start space-x-1.5 text-slate-800 pt-1">
                    <span className="action-bullet-icon text-sm flex-shrink-0" aria-hidden="true">
                      👉
                    </span>
                    <div className="action-text-block">
                      <strong>Suggested Action:</strong> {issue.suggested_action}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
