import React from 'react';
import { ExtractedFields } from '../../types/compliance';
import { FIELD_DEFINITIONS } from '../../services/fieldExtractor';

interface ExtractedDeclarationsProps {
  fields: ExtractedFields;
}

export const ExtractedDeclarations: React.FC<ExtractedDeclarationsProps> = ({ fields }) => {
  const detectedCount = FIELD_DEFINITIONS.filter(
    (def) => fields[def.key] && String(fields[def.key]).trim().length > 0
  ).length;

  return (
    <section className="dash-card dash-extracted-card bg-white border border-slate-200 rounded-md p-6 shadow-xs" aria-label="Extracted Packaged Commodity Declarations">
      <div className="section-title-row flex items-center justify-between mb-4">
        <h3 className="section-title text-base font-bold text-[#0B1F33] m-0">Extracted Declarations</h3>
        <span
          id="dash-extracted-count-badge"
          className={`dash-extracted-count-badge text-xs font-bold px-2.5 py-1 rounded border ${
            detectedCount >= 7
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 high'
              : 'bg-slate-100 text-slate-700 border-slate-300'
          }`}
        >
          {detectedCount} / {FIELD_DEFINITIONS.length} Detected
        </span>
      </div>

      <div id="dash-extracted-grid" className="dash-extracted-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {FIELD_DEFINITIONS.map((def) => {
          const val = fields[def.key];
          const isDetected = val !== null && val !== undefined && String(val).trim().length > 0;

          return (
            <div
              key={def.key}
              className={`dash-extracted-card-item p-3 rounded border text-xs flex flex-col justify-between ${
                isDetected
                  ? 'bg-white border-slate-200 shadow-xs item-detected'
                  : 'bg-slate-50/70 border-dashed border-slate-200 text-slate-400 item-missing'
              }`}
            >
              <div className="extracted-item-header flex items-center justify-between mb-1.5">
                <div className="extracted-item-name-row flex items-center space-x-1.5">
                  <span className="extracted-icon text-sm" aria-hidden="true">{def.icon}</span>
                  <span className="extracted-label-title font-semibold text-slate-700 truncate">
                    {def.label}
                  </span>
                </div>
                {isDetected ? (
                  <span className="status-badge-detected text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                    ✓ Present
                  </span>
                ) : (
                  <span className="status-badge-missing text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                    ✕ Missing
                  </span>
                )}
              </div>

              <div className="extracted-item-content pt-1">
                {isDetected ? (
                  <div className="extracted-text-val font-medium text-slate-900 font-mono text-[11.5px] break-words">
                    {val}
                  </div>
                ) : (
                  <div className="extracted-empty-val text-slate-400 italic text-[11px]">
                    Not detected on label
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
