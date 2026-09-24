import React, { useRef } from 'react';
import { PackageClassificationCard } from './PackageClassificationCard';
import { AnalysisStepper } from './AnalysisStepper';
import { RawOcrDisplay } from './RawOcrDisplay';
import { ClassificationResult, ClassificationStatus, PanelData, PanelKey } from '../../types/package';
import { OcrDiagnostics } from '../../types/inspection';

interface ScanIntakePanelProps {
  onBackToDashboard: () => void;
  previewSrc: string | null;
  fileName: string;
  fileSize: string;
  uploadError: string | null;
  onFileSelect: (file: File) => void;
  onRemoveScan: () => void;
  onAnalyzeProduct: () => void;
  isAnalyzing: boolean;
  analysisTitle: string;
  progressPercent: number;
  currentStep: number;
  classification: ClassificationResult | null;
  classificationStatus: ClassificationStatus;
  onRetryClassification?: () => void;
  panels: Record<PanelKey, PanelData | null>;
  onPanelUpload: (panelKey: PanelKey, file: File) => void;
  onPanelCamera: (panelKey: PanelKey) => void;
  onPanelRemove: (panelKey: PanelKey) => void;
  rawOcrText: string;
  diagnostics: OcrDiagnostics;
  onContinueToAssessment: () => void;
}

export const ScanIntakePanel: React.FC<ScanIntakePanelProps> = ({
  onBackToDashboard,
  previewSrc,
  fileName,
  fileSize,
  uploadError,
  onFileSelect,
  onRemoveScan,
  onAnalyzeProduct,
  isAnalyzing,
  analysisTitle,
  progressPercent,
  currentStep,
  classification,
  classificationStatus,
  onRetryClassification,
  panels,
  onPanelUpload,
  onPanelCamera,
  onPanelRemove,
  rawOcrText,
  diagnostics,
  onContinueToAssessment
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div id="scan-upload-panel" className="scan-upload-panel max-w-7xl mx-auto px-4 sm:px-8 py-6">
      {/* Return to Dashboard Button */}
      <div className="inspection-top-nav mb-4">
        <button
          type="button"
          id="btn-back-to-dash-upload"
          onClick={onBackToDashboard}
          className="btn-back-dashboard text-xs text-[#0056A6] hover:underline font-semibold cursor-pointer"
          title="Return to Start Inspection"
        >
          &larr; Back to Dashboard
        </button>
      </div>

      {/* Section Header */}
      <div className="scan-dashboard-header mb-6">
        <h2 id="scan-heading" className="dash-scan-title text-2xl font-bold text-[#0B1F33] m-0">
          Scan a Product Label
        </h2>
        <p className="section-desc text-xs text-slate-500 m-0 mt-1">
          Upload or capture a photograph of the packaged commodity label to verify compliance under Rule 6.
        </p>
      </div>

      <hr className="section-divider border-t border-slate-200 mb-6" />

      {/* 2-Column Grid Layout */}
      <div className="scan-panel grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* LEFT COLUMN: Upload Intake */}
        <div className="upload-box bg-white border border-slate-200 rounded-md p-6 shadow-xs">
          <div className="upload-box-header flex items-center justify-between mb-4">
            <h3 className="panel-subhead text-sm font-bold text-slate-800 m-0">
              Product Label Image
            </h3>
          </div>

          <label
            htmlFor="label-upload"
            id="drop-zone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            tabIndex={0}
            className="upload-label flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 hover:border-[#0056A6] bg-slate-50 hover:bg-blue-50/20 rounded cursor-pointer transition-colors"
          >
            <span className="upload-icon text-slate-400 mb-3" aria-hidden="true">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </span>
            <span className="upload-title text-sm font-bold text-slate-800 mb-1 text-center">
              Drop a product-label image here
            </span>
            <span className="upload-hint text-xs text-slate-500 mb-4 text-center">
              Accepted formats: JPG, JPEG, PNG (Max 10 MB)
            </span>
            <span className="upload-button bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded text-xs font-semibold shadow-xs">
              Choose Image
            </span>
          </label>
          <input
            type="file"
            id="label-upload"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/jpg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
            }}
          />

          {uploadError && (
            <div
              id="upload-error"
              className="error-banner bg-red-50 text-red-700 border border-red-200 text-xs p-3 rounded mt-4 font-medium"
              role="alert"
            >
              {uploadError}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Preview & Action */}
        <div className="preview-box bg-white border border-slate-200 rounded-md p-6 shadow-xs">
          <h3 className="panel-subhead text-sm font-bold text-slate-800 mb-4">
            Uploaded Image Preview
          </h3>

          <div
            id="preview-frame"
            className="preview-frame min-h-[220px] max-h-[380px] bg-slate-100 border border-slate-200 rounded flex items-center justify-center p-3 mb-4 overflow-hidden"
          >
            {previewSrc ? (
              <img
                id="preview-image"
                src={previewSrc}
                alt="Uploaded product label preview"
                className="max-h-[350px] max-w-full object-contain rounded"
              />
            ) : (
              <p id="preview-placeholder" className="preview-placeholder text-xs text-slate-400 font-medium m-0">
                No image selected. Upload a label image to preview.
              </p>
            )}
          </div>

          {previewSrc && (
            <div id="file-info-container" className="file-info-container bg-slate-50 border border-slate-200 rounded p-2.5 mb-4 text-xs flex justify-between items-center">
              <span id="file-name" className="file-name font-semibold text-slate-800 truncate max-w-xs">
                {fileName}
              </span>
              <span id="file-size" className="file-size text-slate-500 font-medium flex-shrink-0">
                {fileSize}
              </span>
            </div>
          )}

          {/* Package Classification & Multi-Panel Tray */}
          {previewSrc && (classification || classificationStatus === 'loading') && (
            <PackageClassificationCard
              classification={classification}
              classificationStatus={classificationStatus}
              onRetryClassification={onRetryClassification}
              panels={panels}
              previewSrc={previewSrc}
              onPanelUpload={onPanelUpload}
              onPanelCamera={onPanelCamera}
              onPanelRemove={onPanelRemove}
            />
          )}

          {/* Action Buttons */}
          {previewSrc && !rawOcrText && (
            <div id="scan-actions" className="scan-actions flex items-center justify-end space-x-3 mb-4">
              <button
                type="button"
                id="btn-remove"
                disabled={isAnalyzing}
                onClick={onRemoveScan}
                className="btn btn-secondary border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 px-4 py-2 rounded text-xs font-semibold cursor-pointer"
              >
                Remove
              </button>
              <button
                type="button"
                id="btn-continue"
                disabled={classificationStatus !== 'success' || isAnalyzing}
                onClick={() => {
                  if (classificationStatus === 'success' && !isAnalyzing) {
                    onAnalyzeProduct();
                  }
                }}
                className={`btn btn-primary btn-analyze px-5 py-2 rounded text-xs font-bold shadow-xs transition-colors flex items-center justify-center min-w-[140px] ${
                  classificationStatus === 'success' && !isAnalyzing
                    ? 'bg-[#0056A6] hover:bg-[#004482] text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
                }`}
              >
                {isAnalyzing ? (
                  'Analyzing...'
                ) : classificationStatus === 'loading' ? (
                  <span className="flex items-center space-x-1.5">
                    <span
                      className="inline-block w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin"
                      aria-hidden="true"
                    ></span>
                    <span>Classifying package...</span>
                  </span>
                ) : (
                  'Analyze Product'
                )}
              </button>
            </div>
          )}

          {/* Analysis Progress Stepper */}
          <AnalysisStepper
            statusTitle={analysisTitle}
            progressPercent={progressPercent}
            currentStep={currentStep}
            isActive={isAnalyzing}
          />

          {/* Raw OCR Results Box */}
          <RawOcrDisplay
            ocrText={rawOcrText}
            diagnostics={diagnostics}
            onContinue={onContinueToAssessment}
          />
        </div>
      </div>
    </div>
  );
};
