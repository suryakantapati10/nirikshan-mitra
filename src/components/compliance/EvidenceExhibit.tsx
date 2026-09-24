import React, { useState } from 'react';
import { OcrDiagnostics } from '../../types/inspection';

interface EvidenceExhibitProps {
  imageSrc?: string;
  imageName?: string;
  imageSize?: string;
  diagnostics?: OcrDiagnostics;
  rawOcrText?: string;
}

export const EvidenceExhibit: React.FC<EvidenceExhibitProps> = ({
  imageSrc,
  imageName = 'label_image.jpg',
  imageSize = 'Standard',
  diagnostics,
  rawOcrText = ''
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (rawOcrText && navigator.clipboard) {
      navigator.clipboard.writeText(rawOcrText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <section className="dash-card dash-image-card bg-white border border-slate-200 rounded-md p-6 shadow-xs" aria-label="Inspection Evidence">
      <h3 className="section-title text-base font-bold text-[#0B1F33] mb-4 m-0">
        Inspection Evidence &amp; OCR Diagnostics
      </h3>

      <div className="dash-evidence-layout grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Image Column */}
        <div className="dash-evidence-img-col flex flex-col space-y-3">
          <div className="dash-image-frame bg-slate-100 border border-slate-200 rounded p-2 flex items-center justify-center max-h-[300px] overflow-hidden">
            {imageSrc ? (
              <img
                id="dash-product-image"
                src={imageSrc}
                alt="Uploaded product label photograph for Legal Metrology assessment"
                className="max-h-[280px] max-w-full object-contain rounded"
              />
            ) : (
              <div className="text-xs text-slate-400 p-8 text-center">No image available</div>
            )}
          </div>

          <div className="dash-image-details bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1">
            <div className="dash-image-spec-row flex justify-between">
              <span className="dash-spec-k font-medium text-slate-500">File:</span>
              <span id="dash-img-name" className="dash-spec-v font-semibold text-slate-800 truncate max-w-xs">
                {imageName}
              </span>
            </div>
            <div className="dash-image-spec-row flex justify-between">
              <span className="dash-spec-k font-medium text-slate-500">Size:</span>
              <span id="dash-img-size" className="dash-spec-v text-slate-700">
                {imageSize}
              </span>
            </div>
            <div className="dash-image-spec-row flex justify-between">
              <span className="dash-spec-k font-medium text-slate-500">OCR Engine:</span>
              <span id="dash-img-engine-label" className="dash-spec-v text-slate-700 font-medium">
                {diagnostics?.engine || 'Gemini Vision (Server API)'}
              </span>
            </div>
            <div className="dash-image-spec-row flex justify-between">
              <span className="dash-spec-k font-medium text-slate-500">Quality:</span>
              <span id="dash-img-quality-label" className="dash-spec-v text-slate-700 font-medium">
                {diagnostics?.quality || 'High Resolution'}
              </span>
            </div>
          </div>
        </div>

        {/* OCR Drawer Column */}
        <div className="dash-drawer-card bg-slate-50 border border-slate-200 rounded-md p-4 flex flex-col h-full justify-between">
          <div>
            <div className="dash-drawer-header flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
              <h4 className="dash-card-title-sm text-xs font-bold text-slate-800 m-0 uppercase tracking-wider">
                Raw OCR Text
              </h4>
              <button
                type="button"
                id="btn-toggle-raw-ocr"
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="btn btn-sm btn-outline border border-slate-300 hover:bg-white text-slate-700 px-2.5 py-1 rounded text-xs cursor-pointer transition-colors"
              >
                {isDrawerOpen ? 'Hide OCR' : 'View OCR Text'}
              </button>
            </div>

            {isDrawerOpen ? (
              <div id="dash-raw-ocr-drawer" className="dash-raw-ocr-drawer mt-2">
                <div className="dash-drawer-actions flex justify-end mb-2">
                  <button
                    type="button"
                    id="btn-dash-copy-raw"
                    onClick={handleCopy}
                    className="btn btn-sm btn-outline border border-slate-300 hover:bg-white text-slate-700 px-2.5 py-1 rounded text-xs cursor-pointer"
                  >
                    {copied ? 'Copied!' : 'Copy Text'}
                  </button>
                </div>
                <pre
                  id="dash-raw-ocr-pre"
                  className="dash-raw-ocr-pre bg-slate-900 text-slate-100 p-3 rounded text-xs font-mono max-h-56 overflow-y-auto whitespace-pre-wrap select-all leading-relaxed"
                >
                  {rawOcrText || '[No OCR text recorded for this inspection]'}
                </pre>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-6 text-center">
                Click "View OCR Text" to inspect the raw characters recognized from packaging panels.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
