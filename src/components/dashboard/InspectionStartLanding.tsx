import React from 'react';

interface InspectionStartLandingProps {
  onStartUpload: () => void;
  onStartCamera: () => void;
}

export const InspectionStartLanding: React.FC<InspectionStartLandingProps> = ({
  onStartUpload,
  onStartCamera
}) => {
  return (
    <div id="dashboard-home" className="dashboard-home py-12 px-4 max-w-4xl mx-auto">
      <div className="dashboard-home-hero text-center mb-10">
        <div className="gov-seal-icon-sm inline-block mb-3 text-[#133766]" aria-hidden="true">
          <svg viewBox="0 0 48 48" width="44" height="44" role="img" aria-label="State Emblem">
            <circle cx="24" cy="24" r="21" fill="none" stroke="#133766" strokeWidth="1.8" />
            <circle cx="24" cy="24" r="13" fill="none" stroke="#133766" strokeWidth="1.2" />
            <line x1="24" y1="10" x2="24" y2="38" stroke="#133766" strokeWidth="1.2" />
            <line x1="10" y1="24" x2="38" y2="24" stroke="#133766" strokeWidth="1.2" />
            <line x1="14" y1="14" x2="34" y2="34" stroke="#133766" strokeWidth="0.8" />
            <line x1="34" y1="14" x2="14" y2="34" stroke="#133766" strokeWidth="0.8" />
            <circle cx="24" cy="24" r="2" fill="#133766" />
          </svg>
        </div>
        <h2 className="dashboard-home-title text-2xl font-bold text-[#0B1F33]">
          Start Product Inspection
        </h2>
        <p className="dashboard-home-sub text-sm text-slate-500 font-medium mt-1">
          Choose how you want to capture the product label.
        </p>
      </div>

      <div className="inspection-start-container flex flex-col md:flex-row items-center justify-center gap-6 max-w-2xl mx-auto">
        {/* Option 1: Upload Image */}
        <button
          type="button"
          id="btn-start-upload"
          onClick={onStartUpload}
          className="inspection-start-card flex-1 w-full bg-white border border-slate-200 hover:border-[#0056A6] hover:shadow-md p-8 rounded-md text-center transition-all cursor-pointer group"
          aria-label="Upload Image: Choose an image from your device"
        >
          <div className="start-card-icon text-4xl mb-3 transform group-hover:scale-110 transition-transform" aria-hidden="true">
            📁
          </div>
          <h3 className="start-card-title text-lg font-bold text-slate-900 group-hover:text-[#0056A6] transition-colors mb-1">
            Upload Image
          </h3>
          <p className="start-card-desc text-xs text-slate-500 m-0">
            Choose an image from your device
          </p>
        </button>

        {/* Restrained OR Divider */}
        <div className="inspection-divider-or flex items-center justify-center text-xs font-bold text-slate-400 my-2 md:my-0" aria-hidden="true">
          <span className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">OR</span>
        </div>

        {/* Option 2: Scan with Camera */}
        <button
          type="button"
          id="btn-start-camera"
          onClick={onStartCamera}
          className="inspection-start-card flex-1 w-full bg-white border border-slate-200 hover:border-[#0056A6] hover:shadow-md p-8 rounded-md text-center transition-all cursor-pointer group"
          aria-label="Scan with Camera: Capture the label using your camera"
        >
          <div className="start-card-icon text-4xl mb-3 transform group-hover:scale-110 transition-transform" aria-hidden="true">
            📷
          </div>
          <h3 className="start-card-title text-lg font-bold text-slate-900 group-hover:text-[#0056A6] transition-colors mb-1">
            Scan with Camera
          </h3>
          <p className="start-card-desc text-xs text-slate-500 m-0">
            Capture the label using your camera
          </p>
        </button>
      </div>

      <div className="dashboard-home-footer-note text-center text-xs text-slate-500 mt-12 pt-6 border-t border-slate-200 max-w-xl mx-auto">
        <span>Official Legal Metrology compliance inspection portal &middot; Department of Consumer Affairs, Government of India.</span>
      </div>
    </div>
  );
};
