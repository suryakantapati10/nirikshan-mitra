import React from 'react';
import { ScoreCard } from './ScoreCard';
import { MetricsBreakdown } from './MetricsBreakdown';
import { DeclarationChecklist } from './DeclarationChecklist';
import { IssuesSection } from './IssuesSection';
import { ExtractedDeclarations } from './ExtractedDeclarations';
import { EvidenceExhibit } from './EvidenceExhibit';
import { ComplianceScore, ExtractedFields, RuleEvaluation } from '../../types/compliance';
import { OcrDiagnostics } from '../../types/inspection';

interface ComplianceDashboardProps {
  fields: ExtractedFields;
  complianceResults: RuleEvaluation[];
  scoreData: ComplianceScore;
  ocrDiagnostics?: OcrDiagnostics;
  imageSrc?: string;
  imageName?: string;
  imageSize?: string;
  rawOcrText?: string;
  isHistorical?: boolean;
  inspectionId?: string;
  onBackToDashboard: () => void;
  onBackToHistory?: () => void;
  onDownloadPdf: () => void;
  onOpenBrandHistory: (brandName: string) => void;
  onScanAnother: () => void;
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({
  fields,
  complianceResults,
  scoreData,
  ocrDiagnostics,
  imageSrc,
  imageName,
  imageSize,
  rawOcrText,
  isHistorical = false,
  inspectionId,
  onBackToDashboard,
  onBackToHistory,
  onDownloadPdf,
  onOpenBrandHistory,
  onScanAnother
}) => {
  const productName = fields?.product_name || 'Packaged Product';
  const manufacturerName = fields?.manufacturer || 'Not detected';
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div id="compliance-dashboard-panel" className="compliance-dashboard-panel max-w-7xl mx-auto px-4 sm:px-8 py-6" aria-live="polite">
      {/* 1. Executive Summary Header */}
      <header className="dash-exec-header bg-white border border-slate-200 rounded-md p-6 mb-6 shadow-xs">
        <div className="dash-exec-header-top flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="dash-meta-chips flex-1">
            <table className="dash-meta-table w-full text-xs text-left" aria-label="Assessment metadata">
              <tbody className="space-y-1">
                <tr>
                  <td className="meta-k font-medium text-slate-500 pr-3 py-1 w-28">Product:</td>
                  <td className="meta-v font-bold text-slate-900 py-1 pr-6">
                    <span id="dash-product-name">{productName}</span>
                  </td>
                  <td className="meta-k font-medium text-slate-500 pr-3 py-1 w-32">Assessment Date:</td>
                  <td className="meta-v text-slate-700 py-1 font-mono text-[11px]">
                    <span id="dash-assessment-date">{today}</span>
                  </td>
                </tr>
                <tr>
                  <td className="meta-k font-medium text-slate-500 pr-3 py-1">Manufacturer:</td>
                  <td className="meta-v font-bold text-slate-900 py-1 pr-6">
                    <span id="dash-manufacturer-name">{manufacturerName}</span>
                  </td>
                  <td className="meta-k font-medium text-slate-500 pr-3 py-1">Scope:</td>
                  <td className="meta-v text-slate-700 py-1">
                    Rule 6 &middot; Mandatory Declarations
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="dash-exec-action flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              id="btn-dash-back-home"
              onClick={onBackToDashboard}
              className="btn btn-outline border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded text-xs font-semibold cursor-pointer transition-colors"
              title="Return to Dashboard"
            >
              &larr; Back to Dashboard
            </button>
            <button
              type="button"
              id="btn-dash-download-pdf"
              onClick={onDownloadPdf}
              className="btn btn-outline border border-[#0056A6] text-[#0056A6] hover:bg-blue-50 px-3.5 py-2 rounded text-xs font-semibold cursor-pointer transition-colors"
              title="Download official inspection PDF report"
            >
              📄 Download PDF Report
            </button>
            <button
              type="button"
              id="btn-dash-brand-history"
              onClick={() => onOpenBrandHistory(manufacturerName)}
              className="btn btn-outline border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded text-xs font-semibold cursor-pointer transition-colors"
              title="View historical violations for this brand"
            >
              🏛️ Brand History
            </button>
            <button
              type="button"
              id="btn-scan-another-top"
              onClick={onScanAnother}
              className="btn btn-outline border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded text-xs font-semibold cursor-pointer transition-colors"
            >
              Scan Another Product
            </button>
          </div>
        </div>

        {isHistorical && inspectionId && (
          <div
            id="dash-archive-banner"
            className="dash-archive-banner mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded text-slate-700"
          >
            <div className="flex items-center space-x-2">
              <span className="archive-icon">📁</span>
              <span className="archive-text">
                Viewing archived inspection record <strong id="dash-archive-id" className="font-mono text-[#0056A6]">{inspectionId}</strong> (Stored in SQLite database)
              </span>
            </div>
            {onBackToHistory && (
              <button
                type="button"
                id="btn-back-to-history"
                onClick={onBackToHistory}
                className="btn btn-sm btn-outline border border-slate-300 hover:bg-white px-2.5 py-1 rounded text-xs font-medium cursor-pointer"
              >
                Back to History
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Grid Content */}
      <div className="dash-main-grid flex flex-col space-y-6">
        {/* Compliance Status Card (Score & Metrics) */}
        <section className="dash-card dash-score-card bg-white border border-slate-200 rounded-md p-6 shadow-xs" aria-label="Compliance Status">
          <h3 className="section-title text-base font-bold text-[#0B1F33] mb-4 m-0">Compliance Status</h3>
          <div className="dash-score-grid grid grid-cols-1 md:grid-cols-2 gap-6">
            <ScoreCard scoreData={scoreData} />
            <MetricsBreakdown scoreData={scoreData} />
          </div>
        </section>

        {/* Mandatory Declaration Checklist Table */}
        <DeclarationChecklist rules={complianceResults} />

        {/* Issues & Recommendations */}
        <IssuesSection rules={complianceResults} />

        {/* Extracted Declarations Cards */}
        <ExtractedDeclarations fields={fields} />

        {/* Evidence Exhibit */}
        <EvidenceExhibit
          imageSrc={imageSrc}
          imageName={imageName}
          imageSize={imageSize}
          diagnostics={ocrDiagnostics}
          rawOcrText={rawOcrText}
        />

        {/* Footer Action Bar */}
        <div className="dash-footer-bar bg-white border border-slate-200 rounded-md p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              id="btn-footer-back-home"
              onClick={onBackToDashboard}
              className="btn btn-outline border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded text-xs font-semibold cursor-pointer"
            >
              &larr; Back to Dashboard
            </button>
            <button
              type="button"
              id="btn-download-pdf-report"
              onClick={onDownloadPdf}
              className="btn btn-outline border border-[#0056A6] text-[#0056A6] hover:bg-blue-50 px-4 py-2 rounded text-xs font-semibold cursor-pointer"
            >
              Download PDF Report
            </button>
          </div>
          <button
            type="button"
            id="btn-scan-another-bottom"
            onClick={onScanAnother}
            className="btn btn-primary btn-scan-another w-full sm:w-auto bg-[#0056A6] hover:bg-[#004482] text-white font-bold py-2.5 px-6 rounded text-xs cursor-pointer shadow-xs"
          >
            Scan Another Product
          </button>
        </div>

        <p className="dash-footer-disclaimer text-xs text-slate-500 leading-relaxed text-center px-4">
          <strong>Preliminary Automated Assessment:</strong> This evaluation is generated by the Nirikshan Mitra
          automated inspection engine under Legal Metrology (Packaged Commodities) Rules, 2011. It provides
          administrative inspection support and does not constitute official legal certification.
        </p>
      </div>
    </div>
  );
};
