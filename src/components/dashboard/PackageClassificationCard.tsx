import React from 'react';
import { ClassificationResult, ClassificationStatus, PanelData, PanelKey } from '../../types/package';

interface PackageClassificationCardProps {
  classification: ClassificationResult | null;
  classificationStatus?: ClassificationStatus;
  onRetryClassification?: () => void;
  panels: Record<PanelKey, PanelData | null>;
  previewSrc?: string | null;
  onPanelUpload: (panelKey: PanelKey, file: File) => void;
  onPanelCamera: (panelKey: PanelKey) => void;
  onPanelRemove: (panelKey: PanelKey) => void;
}

export const PackageClassificationCard: React.FC<PackageClassificationCardProps> = ({
  classification,
  classificationStatus = 'idle',
  onRetryClassification,
  panels,
  previewSrc,
  onPanelUpload,
  onPanelCamera,
  onPanelRemove
}) => {
  if (!classification && classificationStatus !== 'loading') return null;

  const isLoading = classificationStatus === 'loading';
  const isError = classificationStatus === 'error' || Boolean(classification?.isError);

  const activeClassification: ClassificationResult = classification || {
    packageType: 'Analyzing container type...' as any,
    confidence: 0,
    confidencePercent: 0,
    isLowConfidence: false,
    displayText: 'Analyzing container type...',
    confidenceText: 'Analyzing...',
    guidancePrompt: 'Evaluating packaging geometry and mandatory panel positions...',
    geometryTip: 'Hold on while visual container structure is being identified...',
    icon: '⏳',
    reasoning: 'Evaluating visual geometry and packaging cues...',
    success: false
  };

  const panelConfigs: Array<{ key: PanelKey; label: string; suffix: string; hint: string }> = [
    { key: 'front', label: 'Front / Main', suffix: 'front', hint: 'Active front panel' },
    { key: 'back', label: 'Back / Rear', suffix: 'back', hint: 'Optional' },
    { key: 'side', label: 'Side / Other', suffix: 'side', hint: 'Optional' },
    { key: 'top_bottom', label: 'Top / Bottom', suffix: 'top-bottom', hint: 'When needed' }
  ];

  return (
    <div
      id="package-classification-card"
      className="package-classification-card bg-slate-50 border border-slate-200 rounded p-4 mb-4 text-xs"
      aria-live="polite"
    >
      {/* Header Banner */}
      <div className="pkg-header-banner flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="pkg-detected-left flex items-center space-x-3">
          <span
            id="pkg-type-icon"
            className={`pkg-type-icon text-2xl ${isLoading ? 'animate-pulse' : ''}`}
            aria-hidden="true"
          >
            {isLoading ? '⏳' : isError ? '⚠️' : (activeClassification.icon || '📦')}
          </span>
          <div className="pkg-title-meta">
            <div className="pkg-title-row flex items-center space-x-2">
              <h4 id="pkg-detected-text" className="pkg-detected-title text-sm font-bold text-slate-900 m-0">
                Package detected:{' '}
                <span id="pkg-detected-type">
                  {isLoading
                    ? 'Analyzing container type...'
                    : isError
                    ? (activeClassification.packageType || 'Classification Unavailable')
                    : activeClassification.packageType}
                </span>
              </h4>
              <span
                id="pkg-confidence-badge"
                className={`pkg-confidence-badge text-[10px] font-bold px-2 py-0.5 rounded border ${
                  isLoading
                    ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                    : isError
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : activeClassification.isLowConfidence
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}
              >
                {isLoading ? 'Analyzing...' : (activeClassification.confidenceText || (isError ? 'Retry Needed' : ''))}
              </span>
            </div>
            <p id="pkg-geometry-reasoning" className="pkg-geometry-reasoning text-slate-500 m-0 text-[11px]">
              {isLoading
                ? 'Evaluating visual geometry and packaging cues...'
                : (activeClassification.reasoning || (isError ? 'Could not connect to AI classification service.' : 'Analyzing visual container geometry…'))}
            </p>
          </div>
        </div>

        {isError && onRetryClassification && (
          <button
            type="button"
            id="btn-retry-classification"
            onClick={onRetryClassification}
            className="btn-retry-classification px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 rounded text-[11px] font-semibold cursor-pointer flex items-center space-x-1"
            title="Retry package classification"
          >
            <span>↻</span>
            <span>Retry Classification</span>
          </button>
        )}

        {!isLoading && !isError && activeClassification.isLowConfidence && (
          <span
            id="pkg-low-conf-badge"
            className="pkg-low-conf-badge text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-300"
          >
            General Mode
          </span>
        )}
      </div>

      {/* Low Confidence / Error Alert */}
      {(isError || (!isLoading && activeClassification.isLowConfidence)) && (
        <div
          id="pkg-low-conf-alert"
          className={`pkg-low-conf-alert border p-2.5 rounded my-2 flex items-center space-x-2 text-[11px] ${
            isError
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <span className="alert-icon" aria-hidden="true">{isError ? '⚠️' : 'ℹ️'}</span>
          <span>
            {isError
              ? 'Automatic package classification is temporarily unavailable. Please retry or continue with general package scanning.'
              : 'Package type could not be confidently identified. Continue with general package scanning.'}
          </span>
        </div>
      )}

      {/* Guidance Box */}
      <div
        className="pkg-guidance-box bg-white border border-slate-200 p-2.5 rounded my-3 flex items-start space-x-2"
        id="pkg-guidance-box"
      >
        <span className="guidance-bulb text-base" aria-hidden="true">💡</span>
        <div className="guidance-text-block text-[11.5px] leading-relaxed">
          <p id="pkg-guided-prompt" className="pkg-guided-prompt text-slate-800 font-medium m-0">
            {isLoading
              ? 'Evaluating packaging geometry and mandatory panel positions...'
              : (activeClassification.guidancePrompt || 'Automatic package classification is temporarily unavailable. Proceed with general package scanning.')}
          </p>
          {(isLoading || activeClassification.geometryTip) && (
            <p id="pkg-geometry-tip" className="pkg-geometry-tip text-slate-500 m-0 mt-0.5 text-[11px]">
              {isLoading
                ? 'Analyzing visual container geometry and surfaces...'
                : activeClassification.geometryTip}
            </p>
          )}
        </div>
      </div>

      {/* Multi-Panel Container */}
      <div className="pkg-panels-container mt-3">
        <div className="panels-container-header flex items-center justify-between mb-2">
          <span className="panels-heading font-bold text-slate-700 uppercase tracking-wider text-[11px]">
            Package Panels
          </span>
          <span className="panels-session-badge text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold" id="panels-session-badge">
            Session Active
          </span>
        </div>

        <div className="panels-slots-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2" id="panels-slots-grid">
          {panelConfigs.map((cfg) => {
            const data = panels[cfg.key];
            const effectiveDataUrl = data?.dataUrl || (cfg.key === 'front' ? previewSrc : null);
            const isFilled = Boolean(effectiveDataUrl);

            return (
              <div
                key={cfg.key}
                id={`slot-${cfg.suffix}`}
                className={`panel-slot-item flex flex-col justify-between p-2 rounded border transition-all h-[82px] min-w-0 overflow-hidden box-border ${
                  isFilled
                    ? 'bg-white border-blue-400 shadow-2xs slot-filled ring-1 ring-blue-100'
                    : 'bg-slate-50/90 border-slate-300 hover:border-slate-400 slot-empty'
                } ${cfg.key === 'front' ? 'slot-active' : ''}`}
              >
                {/* Panel Label & Status Header */}
                <div className="slot-header flex items-center justify-between gap-1 min-w-0 leading-tight">
                  <span className="slot-panel-tag font-bold text-slate-800 text-[11.5px] tracking-tight truncate min-w-0" title={cfg.label}>
                    {cfg.label}
                  </span>
                  {isFilled ? (
                    <span
                      className="slot-status-tag tag-primary text-emerald-700 font-bold text-[10px] flex-shrink-0 flex items-center space-x-0.5 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 leading-none"
                      title="Panel captured"
                    >
                      <span>&#10003;</span>
                      <span>Added</span>
                    </span>
                  ) : (
                    <span className="text-[9.5px] text-slate-400 font-medium flex-shrink-0 uppercase tracking-wide">
                      Optional
                    </span>
                  )}
                </div>

                {/* Panel Body / Action Controls */}
                <div className="slot-body flex items-center justify-between gap-1 mt-auto w-full h-7 min-w-0 overflow-hidden">
                  {isFilled ? (
                    <div className="flex items-center justify-between w-full min-w-0 h-full">
                      <div className="flex items-center space-x-1.5 overflow-hidden min-w-0 flex-1">
                        <img
                          id={`slot-thumb-${cfg.suffix}`}
                          className="slot-thumb w-7 h-7 object-cover rounded border border-slate-200 flex-shrink-0"
                          src={effectiveDataUrl!}
                          alt={`${cfg.label} preview`}
                        />
                        <span className="text-[11px] text-slate-600 font-medium truncate min-w-0" title={data?.name || (cfg.key === 'front' ? 'Primary Scan' : 'Captured')}>
                          {data?.name || (cfg.key === 'front' ? 'Primary Scan' : 'Captured')}
                        </span>
                      </div>
                      {cfg.key !== 'front' && (
                        <button
                          type="button"
                          id={`btn-remove-${cfg.suffix}`}
                          onClick={() => onPanelRemove(cfg.key)}
                          className="btn-slot-remove text-slate-400 hover:text-red-600 font-bold px-1 text-xs cursor-pointer rounded hover:bg-red-50 flex-shrink-0 leading-none ml-1"
                          title={`Remove ${cfg.label}`}
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 w-full min-w-0 h-full">
                      <label
                        htmlFor={`input-panel-${cfg.suffix}`}
                        className="slot-upload-trigger flex-1 min-w-0 h-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-1 rounded text-[10.5px] font-semibold cursor-pointer flex items-center justify-center gap-0.5 shadow-2xs transition-colors overflow-hidden"
                        title={`Upload ${cfg.label} Image`}
                      >
                        <span className="plus-icon font-bold text-slate-500 text-[11px] leading-none shrink-0">+</span>
                        <span className="add-text truncate leading-none">Upload</span>
                      </label>
                      <input
                        type="file"
                        id={`input-panel-${cfg.suffix}`}
                        accept="image/jpeg,image/png,image/jpg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onPanelUpload(cfg.key, file);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => onPanelCamera(cfg.key)}
                        className="slot-camera-trigger flex-1 min-w-0 h-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-1 rounded text-[10.5px] font-semibold cursor-pointer flex items-center justify-center gap-0.5 shadow-2xs transition-colors overflow-hidden"
                        data-panel={cfg.key}
                        title={`Scan ${cfg.label} with Camera`}
                      >
                        <span className="cam-icon text-[11px] leading-none shrink-0">📷</span>
                        <span className="cam-text truncate leading-none">Camera</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
