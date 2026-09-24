import React, { useRef, useState, useEffect } from 'react';
import { PanelKey } from '../../types/package';

interface CameraModalProps {
  isOpen: boolean;
  panelKey: PanelKey;
  onClose: () => void;
  onCaptureComplete: (panelKey: PanelKey, file: File, dataUrl: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  panelKey,
  onClose,
  onCaptureComplete
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const panelNames: Record<PanelKey, string> = {
    front: 'Front / Main',
    back: 'Back / Rear',
    side: 'Side / Other',
    top_bottom: 'Top / Bottom'
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    setError(null);
    setCapturedDataUrl(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera unavailable. Please use Upload Image.');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      // Fallback
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        setError('Camera unavailable. Please use Upload Image.');
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedDataUrl(dataUrl);
    }
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
  };

  const handleUsePhoto = () => {
    if (!capturedDataUrl || !canvasRef.current) return;

    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          const filename = `${panelKey}_camera_${Date.now()}.jpg`;
          const file = new File([blob], filename, { type: 'image/jpeg', lastModified: Date.now() });
          stopStream();
          onCaptureComplete(panelKey, file, capturedDataUrl);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  return (
    <div
      id="camera-modal"
      className="modal-backdrop camera-modal-backdrop fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
    >
      <div className="camera-modal-dialog bg-white rounded-lg max-w-xl w-full overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="camera-modal-header p-4 bg-[#0B1F33] text-white flex items-center justify-between">
          <div className="camera-title-group flex items-center space-x-2">
            <h3 id="camera-modal-title" className="camera-modal-title text-base font-bold m-0 text-white">
              Scan Package Panel
            </h3>
            <span
              id="camera-panel-badge"
              className="badge-panel-indicator text-xs bg-blue-500/30 text-blue-200 border border-blue-400/40 px-2 py-0.5 rounded font-semibold"
            >
              {panelNames[panelKey] || panelKey}
            </span>
          </div>
          <button
            type="button"
            className="modal-close text-white hover:text-red-300 text-xl font-bold p-1 cursor-pointer leading-none"
            id="btn-camera-close"
            onClick={handleClose}
            aria-label="Close Camera"
          >
            &times;
          </button>
        </div>

        <p className="camera-hint-text text-xs text-slate-500 py-2 px-4 bg-slate-50 border-b border-slate-200 m-0">
          Position product label inside the frame. Ensure good lighting and legible text.
        </p>

        {/* Viewfinder Container */}
        <div className="camera-viewfinder-container relative bg-black aspect-video flex items-center justify-center overflow-hidden">
          {capturedDataUrl ? (
            <img
              id="camera-preview-img"
              src={capturedDataUrl}
              alt="Captured label preview"
              className="camera-preview-img w-full h-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              id="camera-video"
              className="camera-video-feed w-full h-full object-cover"
              playsInline
              autoPlay
              muted
            />
          )}

          <canvas ref={canvasRef} id="camera-canvas" className="hidden" />

          {!capturedDataUrl && !error && (
            <div
              className="camera-framing-box absolute inset-10 border-2 border-white/40 pointer-events-none rounded"
              id="camera-framing-box"
              aria-hidden="true"
            >
              <span className="framing-corner top-left"></span>
              <span className="framing-corner top-right"></span>
              <span className="framing-corner bottom-left"></span>
              <span className="framing-corner bottom-right"></span>
            </div>
          )}

          {error && (
            <div
              id="camera-error-banner"
              className="error-banner camera-error-banner absolute inset-4 bg-red-950/90 border border-red-700 text-red-200 p-4 rounded flex items-center justify-center text-center text-xs font-semibold"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="camera-controls-bar p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-center">
          {!capturedDataUrl ? (
            <div id="camera-live-controls" className="camera-btn-group flex items-center space-x-3">
              <button
                type="button"
                id="btn-camera-capture"
                onClick={handleCapture}
                disabled={Boolean(error)}
                className="btn btn-primary btn-camera-capture bg-[#0056A6] hover:bg-[#004482] text-white px-5 py-2 rounded text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                📸 Capture Photo
              </button>
              <button
                type="button"
                id="btn-camera-cancel"
                onClick={handleClose}
                className="btn btn-secondary border border-slate-300 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div id="camera-review-controls" className="camera-btn-group flex items-center space-x-3">
              <button
                type="button"
                id="btn-camera-retake"
                onClick={handleRetake}
                className="btn btn-secondary border border-slate-300 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-xs font-semibold cursor-pointer"
              >
                🔄 Retake Photo
              </button>
              <button
                type="button"
                id="btn-camera-use"
                onClick={handleUsePhoto}
                className="btn btn-primary btn-camera-use bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded text-xs font-bold shadow-xs cursor-pointer"
              >
                ✓ Use Photo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
