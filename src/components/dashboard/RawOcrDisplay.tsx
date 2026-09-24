import React, { useState } from 'react';
import { OcrDiagnostics } from '../../types/inspection';

interface RawOcrDisplayProps {
  ocrText: string;
  diagnostics: OcrDiagnostics;
  onContinue: () => void;
}

export const RawOcrDisplay: React.FC<RawOcrDisplayProps> = ({
  ocrText,
  diagnostics,
  onContinue
}) => {
  const [copied, setCopied] = useState(false);

  if (!ocrText) return null;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(ocrText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div id="ocr-results-box" className="ocr-results-box bg-white border border-slate-200 rounded p-4 mb-4 text-xs shadow-xs" aria-live="polite">
      <div className="ocr-results-header flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
        <h4 className="ocr-section-title text-sm font-bold text-slate-900 m-0">Raw OCR Extracted Text</h4>
        <button
          type="button"
          id="btn-copy-ocr"
          onClick={handleCopy}
          className="btn btn-sm btn-outline border border-slate-300 hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-xs cursor-pointer transition-colors"
        >
          {copied ? 'Copied!' : 'Copy Text'}
        </button>
      </div>

      <div className="ocr-diagnostics-bar flex flex-wrap gap-4 py-1.5 px-3 bg-slate-50 border border-slate-200 rounded mb-3 text-[11px] text-slate-600" id="ocr-diagnostics-bar">
        <div className="diag-item flex items-center space-x-1">
          <span className="diag-label font-medium text-slate-500">Engine:</span>
          <span className="diag-value font-semibold text-slate-800" id="diag-engine">
            {diagnostics.engine || 'Gemini Flash Vision (Server API)'}
          </span>
        </div>
        <div className="diag-item flex items-center space-x-1">
          <span className="diag-label font-medium text-slate-500">Quality:</span>
          <span className="diag-value font-semibold text-slate-800" id="diag-quality">
            {diagnostics.quality || 'High Resolution'}
          </span>
        </div>
        <div className="diag-item flex items-center space-x-1">
          <span className="diag-label font-medium text-slate-500">Characters:</span>
          <span className="diag-value font-semibold text-slate-800" id="diag-count">
            {diagnostics.characterCount || ocrText.length}
          </span>
        </div>
      </div>

      <pre
        id="ocr-text-display"
        className="ocr-text-display bg-slate-900 text-slate-100 p-3 rounded text-xs font-mono max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all"
      >
        {ocrText}
      </pre>

      <div id="analysis-completion-action" className="analysis-completion-action mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="completion-message text-xs font-semibold text-emerald-700 m-0">
          &#10003; OCR text extraction complete. Ready for regulatory compliance assessment.
        </p>
        <button
          type="button"
          id="btn-continue-results"
          onClick={onContinue}
          className="btn btn-primary btn-continue-large w-full sm:w-auto bg-[#0056A6] hover:bg-[#004482] text-white font-bold py-2.5 px-6 rounded text-sm transition-colors cursor-pointer"
        >
          Continue to Assessment &rarr;
        </button>
      </div>
    </div>
  );
};
