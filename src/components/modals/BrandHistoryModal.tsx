import React, { useEffect, useState } from 'react';
import { riskService } from '../../services/riskService';
import { BrandInfo, RiskProfile, ViolationRecord } from '../../types/risk';

interface BrandHistoryModalProps {
  isOpen: boolean;
  brandIdentifier: string;
  onClose: () => void;
}

export const BrandHistoryModal: React.FC<BrandHistoryModalProps> = ({
  isOpen,
  brandIdentifier,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [riskData, setRiskData] = useState<RiskProfile | null>(null);

  useEffect(() => {
    if (!isOpen || !brandIdentifier) return;

    setLoading(true);
    Promise.all([
      riskService.getBrandViolations(brandIdentifier).catch(() => ({ success: false, brand: { brand_name: brandIdentifier }, violations: [] })),
      riskService.getBrandRisk(brandIdentifier).catch(() => null)
    ])
      .then(([violRes, rData]) => {
        if (violRes && violRes.brand) {
          setBrand(violRes.brand);
        } else {
          setBrand({ brand_name: brandIdentifier });
        }
        setViolations(violRes?.violations || []);
        setRiskData(rData as any);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, brandIdentifier]);

  if (!isOpen) return null;

  const riskLevel = (riskData?.riskLevel || 'LOW').toUpperCase();
  const riskScore = typeof riskData?.riskScore === 'number' ? riskData.riskScore : 0;
  const riskClass =
    riskLevel === 'HIGH'
      ? 'bg-red-100 text-red-800 border-red-300'
      : riskLevel === 'MEDIUM'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-emerald-100 text-emerald-800 border-emerald-300';

  const metrics = riskData?.metrics || {
    frequencyScore: 0,
    severityScore: 0,
    repeatScore: 0,
    recencyScore: 0
  };

  return (
    <div
      id="brand-history-modal"
      className="brand-history-modal fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="brand-modal-title"
    >
      <div
        className="modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-xs"
        id="brand-modal-backdrop"
        onClick={onClose}
      ></div>

      <div className="modal-dialog relative bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col z-10">
        {/* Modal Header */}
        <div className="modal-header p-5 bg-[#0B1F33] text-white flex items-center justify-between border-b border-[#1E293B]">
          <div>
            <span className="modal-eyebrow text-[10px] font-bold uppercase tracking-wider text-blue-300 block mb-0.5">
              Regulatory History
            </span>
            <h3 id="brand-modal-title" className="brand-modal-title text-lg font-bold text-white m-0">
              Brand Violation History
            </h3>
            <p id="brand-modal-subhead" className="brand-modal-subhead text-xs text-slate-300 m-0 mt-0.5">
              Recorded non-compliance findings and internal risk prioritization
            </p>
          </div>
          <button
            type="button"
            id="btn-close-brand-history"
            onClick={onClose}
            className="btn-modal-close text-slate-300 hover:text-white text-2xl font-bold p-1 cursor-pointer leading-none"
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body p-6 overflow-y-auto space-y-6 text-xs">
          {/* Brand Statistics Chips */}
          <div className="brand-stats-row grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="brand-stat-card bg-slate-50 border border-slate-200 rounded p-2.5 text-center col-span-2 sm:col-span-1">
              <span className="stat-label text-[10px] font-medium text-slate-500 block mb-1">
                Brand / Manufacturer
              </span>
              <strong id="brand-stat-name" className="stat-value text-xs font-bold text-slate-900 truncate block">
                {brand?.brand_name || brandIdentifier}
              </strong>
            </div>

            <div className="brand-stat-card bg-slate-50 border border-slate-200 rounded p-2.5 text-center col-span-2 sm:col-span-1">
              <span className="stat-label text-[10px] font-medium text-slate-500 block mb-1">
                Category
              </span>
              <strong id="brand-stat-category" className="stat-value text-xs font-bold text-slate-900 truncate block">
                {brand?.product_category || 'General'}
              </strong>
            </div>

            <div className="brand-stat-card bg-slate-50 border border-slate-200 rounded p-2.5 text-center">
              <span className="stat-label text-[10px] font-medium text-slate-500 block mb-1">
                Inspections
              </span>
              <strong id="brand-stat-inspections" className="stat-value text-sm font-bold text-slate-800">
                {riskData?.totalInspections !== undefined ? riskData.totalInspections : brand?.inspection_count || 1}
              </strong>
            </div>

            <div className="brand-stat-card bg-slate-50 border border-slate-200 rounded p-2.5 text-center">
              <span className="stat-label text-[10px] font-medium text-slate-500 block mb-1">
                Issues
              </span>
              <strong id="brand-stat-violations" className="stat-value stat-highlight text-sm font-bold text-red-700">
                {riskData?.totalViolations !== undefined ? riskData.totalViolations : violations.length}
              </strong>
            </div>

            <div className="brand-stat-card bg-slate-50 border border-slate-200 rounded p-2.5 text-center">
              <span className="stat-label text-[10px] font-medium text-slate-500 block mb-1">
                Repeats
              </span>
              <strong id="brand-stat-repeated" className="stat-value text-sm font-bold text-amber-700">
                {riskData?.repeatedViolations !== undefined ? riskData.repeatedViolations : 0}
              </strong>
            </div>

            <div className="brand-stat-card stat-card-risk bg-slate-50 border border-slate-200 rounded p-2.5 text-center">
              <span className="stat-label text-[10px] font-medium text-slate-500 block mb-1">
                Priority
              </span>
              <div className="risk-badge-container flex items-center justify-center space-x-1">
                <span id="brand-stat-risk-badge" className={`risk-pill text-[10px] font-bold px-1.5 py-0.2 rounded border ${riskClass}`}>
                  {riskLevel}
                </span>
                <span id="brand-stat-risk-score" className="risk-score-num text-[10px] font-mono text-slate-500">
                  {riskScore}/100
                </span>
              </div>
            </div>
          </div>

          {/* Internal Risk Priority Profile Card */}
          <div className="brand-risk-breakdown-card bg-white border border-slate-200 rounded-md p-5 shadow-xs" id="brand-risk-breakdown-card">
            <div className="risk-breakdown-header flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <span className="risk-breakdown-title text-sm font-bold text-slate-900 block">
                  Internal Risk Priority Profile
                </span>
                <span className="risk-breakdown-sub text-[11px] text-slate-500">
                  Deterministic calculation based on historical records
                </span>
              </div>
              <span id="brand-risk-priority-pill" className={`risk-pill text-xs font-bold px-2.5 py-1 rounded border ${riskClass}`}>
                {riskData?.priorityLabel || `${riskLevel} Priority`}
              </span>
            </div>

            <p id="brand-risk-explanation" className="risk-breakdown-expl text-xs text-slate-600 mb-4 leading-relaxed">
              {riskData?.explanation || 'Calculated from historical inspection records.'}
            </p>

            <div className="risk-metrics-grid grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs" id="brand-risk-metrics-grid">
              <div className="risk-metric-cell p-2.5 bg-slate-50 rounded border border-slate-200 text-center">
                <span className="risk-metric-name block text-[10.5px] text-slate-500 mb-0.5">Violation Frequency</span>
                <strong id="risk-metric-freq" className="risk-metric-val text-slate-800 font-semibold">
                  {metrics.frequencyScore} / 30 pts
                </strong>
              </div>
              <div className="risk-metric-cell p-2.5 bg-slate-50 rounded border border-slate-200 text-center">
                <span className="risk-metric-name block text-[10.5px] text-slate-500 mb-0.5">Severity Contribution</span>
                <strong id="risk-metric-sev" className="risk-metric-val text-slate-800 font-semibold">
                  {metrics.severityScore} / 30 pts
                </strong>
              </div>
              <div className="risk-metric-cell p-2.5 bg-slate-50 rounded border border-slate-200 text-center">
                <span className="risk-metric-name block text-[10.5px] text-slate-500 mb-0.5">Repeated Rule Failures</span>
                <strong id="risk-metric-repeat" className="risk-metric-val text-slate-800 font-semibold">
                  {metrics.repeatScore} / 25 pts
                </strong>
              </div>
              <div className="risk-metric-cell p-2.5 bg-slate-50 rounded border border-slate-200 text-center">
                <span className="risk-metric-name block text-[10.5px] text-slate-500 mb-0.5">Recency Contribution</span>
                <strong id="risk-metric-recency" className="risk-metric-val text-slate-800 font-semibold">
                  {metrics.recencyScore} / 15 pts
                </strong>
              </div>
            </div>
          </div>

          {/* Chronological Timeline */}
          <div className="brand-timeline-section">
            <h4 className="timeline-heading text-sm font-bold text-slate-800 mb-3">
              Chronological Finding Timeline
            </h4>
            <div id="brand-violations-timeline" className="brand-violations-timeline space-y-3">
              {loading ? (
                <p className="timeline-loading text-slate-500 italic py-4 text-center">Loading historical violation records…</p>
              ) : violations.length === 0 ? (
                <div className="timeline-empty-clean bg-emerald-50/50 border border-emerald-200 p-4 rounded-md flex items-start space-x-3 text-emerald-900">
                  <span className="clean-icon font-bold text-emerald-700 text-lg">✓</span>
                  <div>
                    <h5 className="text-sm font-bold text-emerald-800 m-0 mb-0.5">Clean Compliance Record</h5>
                    <p className="m-0 text-xs text-emerald-700">
                      No non-compliance violations or review issues recorded for this brand.
                    </p>
                  </div>
                </div>
              ) : (
                violations.map((v, i) => {
                  const d = new Date(v.detected_at || v.inspected_at || '');
                  const dateStr = isNaN(d.getTime())
                    ? v.detected_at || v.inspected_at || '—'
                    : d.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      });

                  const isFail = v.violation_type === 'FAIL';
                  const pillClass = isFail ? 'bg-red-50 text-red-800 border-red-300 pill-fail' : 'bg-amber-50 text-amber-800 border-amber-300 pill-review';
                  const typeLabel = isFail ? 'VIOLATION (FAIL)' : 'REVIEW ITEM';
                  const sevClass = v.severity === 'CRITICAL' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-slate-100 text-slate-700 border-slate-300';

                  return (
                    <div
                      key={i}
                      className={`timeline-entry p-4 rounded-md border text-xs ${
                        isFail ? 'bg-red-50/20 border-red-200' : 'bg-amber-50/20 border-amber-200'
                      }`}
                    >
                      <div className="timeline-card-header flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                        <div className="timeline-meta-left flex items-center space-x-2">
                          <span className="timeline-insp-id mono-id text-[#0056A6] font-mono font-semibold">
                            {v.inspection_id}
                          </span>
                          <span className="timeline-dot text-slate-300">•</span>
                          <span className="timeline-date text-slate-500 font-mono text-[11px]">{dateStr}</span>
                        </div>
                        <div className="timeline-badges flex items-center space-x-1.5">
                          <span className={`badge-type text-[10px] font-bold px-1.5 py-0.2 rounded border ${pillClass}`}>
                            {typeLabel}
                          </span>
                          <span className={`badge-sev text-[10px] font-bold px-1.5 py-0.2 rounded border ${sevClass}`}>
                            {v.severity || 'WARNING'}
                          </span>
                        </div>
                      </div>

                      <div className="timeline-rule-row font-bold text-slate-900 mb-1">
                        {v.rule_name || v.field_key}
                        {v.source_reference && (
                          <span className="rule-legal-cite text-slate-500 font-normal ml-1">
                            ({v.source_reference})
                          </span>
                        )}
                      </div>

                      {v.extracted_value ? (
                        <div className="timeline-field-val text-slate-700 mb-1">
                          <strong>Detected on packaging:</strong>{' '}
                          <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">
                            {v.extracted_value}
                          </code>
                        </div>
                      ) : (
                        <div className="timeline-field-val text-missing text-slate-400 italic mb-1">
                          <strong>Detected on packaging:</strong> Declaration Missing / Not Found
                        </div>
                      )}

                      <div className="timeline-explanation text-slate-700 leading-relaxed mb-1">
                        {v.explanation || 'Requirement not met.'}
                      </div>

                      {v.suggested_action && (
                        <div className="timeline-action text-slate-800 leading-relaxed pt-1">
                          <strong>Recommended Action:</strong> {v.suggested_action}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Safety Disclaimer */}
          <div className="brand-modal-safety-notice bg-slate-50 border border-slate-200 p-3 rounded text-[11px] text-slate-500 leading-relaxed">
            <strong>Internal Inspection Priority Notice:</strong> Risk priority levels and scores are deterministic administrative indicators calculated strictly from historical database records to support inspection scheduling. They do not constitute an official government risk classification, legal penalty, or determination of guilt.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            id="btn-close-brand-modal-bottom"
            onClick={onClose}
            className="btn btn-secondary border border-slate-300 hover:bg-slate-200 text-slate-700 px-4 py-1.5 rounded text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
