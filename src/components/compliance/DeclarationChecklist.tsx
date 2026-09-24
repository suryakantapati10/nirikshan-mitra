import React from 'react';
import { RuleEvaluation } from '../../types/compliance';

interface DeclarationChecklistProps {
  rules: RuleEvaluation[];
}

export const DeclarationChecklist: React.FC<DeclarationChecklistProps> = ({ rules }) => {
  return (
    <section className="dash-card dash-checklist-card bg-white border border-slate-200 rounded-md p-6 shadow-xs" aria-label="Mandatory Declaration Checklist">
      <div className="section-title-row flex flex-col sm:flex-row sm:items-baseline justify-between mb-4 gap-1">
        <h3 className="section-title text-base font-bold text-[#0B1F33] m-0">Declaration Checklist</h3>
        <span className="rule-notice-strip dash-table-sub text-xs text-slate-500 font-medium">
          Evaluated under Legal Metrology (Packaged Commodities) Rules, 2011
        </span>
      </div>

      <div className="dash-table-container overflow-x-auto">
        <table className="dash-checklist-table w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-semibold text-[11px] uppercase tracking-wider">
              <th scope="col" className="p-3 w-[20%]">Declaration</th>
              <th scope="col" className="p-3 w-[22%]">Detected Value</th>
              <th scope="col" className="p-3 w-[12%]">Status</th>
              <th scope="col" className="p-3 w-[24%]">Remarks</th>
              <th scope="col" className="p-3 w-[22%]">Recommended Action</th>
            </tr>
          </thead>
          <tbody id="dash-checklist-tbody" className="divide-y divide-slate-100">
            {rules.map((item) => {
              const isPass = item.status === 'PASS';
              const isReview = item.status === 'REVIEW';
              const isNa = item.status === 'N/A';

              const badgeClass = isPass
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 badge-status-pass'
                : isReview
                ? 'bg-amber-50 text-amber-800 border-amber-300 badge-status-review'
                : isNa
                ? 'bg-slate-100 text-slate-600 border-slate-300 badge-status-na'
                : 'bg-red-50 text-red-800 border-red-300 badge-status-fail';

              const icon = isPass ? '✓' : isReview ? '⚠️' : isNa ? '—' : '✕';

              return (
                <tr key={item.field_key} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 font-bold text-slate-900 align-top">
                    {item.field_name}
                  </td>
                  <td className="p-3 text-slate-700 font-mono text-[11px] align-top">
                    {item.extracted_value ? (
                      <span className="dash-cell-val font-medium text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                        {item.extracted_value}
                      </span>
                    ) : (
                      <span className="dash-cell-missing text-slate-400 italic">Not detected</span>
                    )}
                  </td>
                  <td className="p-3 align-top">
                    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-bold border ${badgeClass}`}>
                      <span>{icon}</span>
                      <span>{item.status}</span>
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 text-xs leading-relaxed align-top">
                    <span className="dash-cell-remarks">{item.explanation}</span>
                  </td>
                  <td className="p-3 text-slate-600 text-xs leading-relaxed align-top">
                    <span className="dash-cell-action">{item.suggested_action}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
