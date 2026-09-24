import { OcrResponseData, PanelOcrResult } from '../types/inspection';
import { PanelKey } from '../types/package';

const PANEL_ORDER: PanelKey[] = ['front', 'back', 'side', 'top_bottom'];

const PANEL_LABELS: Record<PanelKey, string> = {
  front: 'Front / Main',
  back: 'Back / Rear',
  side: 'Side / Other',
  top_bottom: 'Top / Bottom'
};

async function toBase64(imageSource: string | File | Blob): Promise<string> {
  if (typeof imageSource === 'string' && imageSource.startsWith('data:image/')) {
    return imageSource;
  }

  return new Promise((resolve, reject) => {
    if (!(imageSource instanceof File) && !(imageSource instanceof Blob)) {
      reject(new Error('Invalid image format. Expected File, Blob, or data-URL.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('FileReader failed to load image.'));
    reader.readAsDataURL(imageSource);
  });
}

export type ProgressCallback = (stage: string, progressPct: number, statusMsg: string) => void;

export const ocrService = {
  PANEL_ORDER,
  PANEL_LABELS,

  async processImage(
    imageSource: string | File | Blob,
    progressCallback?: ProgressCallback
  ): Promise<OcrResponseData> {
    if (progressCallback) progressCallback('preprocessing', 25, 'Processing image...');

    try {
      const base64Img = await toBase64(imageSource);
      if (progressCallback) progressCallback('recognizing', 60, 'Recognizing text via Gemini Vision...');

      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Img })
      });

      if (!response.ok) {
        let errMsg = `Backend OCR HTTP Error ${response.status}`;
        try {
          const errData = await response.json();
          if (errData?.error) errMsg = errData.error;
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (progressCallback) progressCallback('complete', 100, 'OCR text extraction complete');

      return {
        success: Boolean(data.success),
        text: data.text || 'Text could not be reliably read from this image',
        diagnostics: data.diagnostics || {
          engine: 'Gemini Vision (Server API)',
          quality: 'Standard',
          characterCount: (data.text || '').length,
          readable: Boolean(data.success)
        }
      };
    } catch (err: any) {
      console.error('[OcrService] Backend request failed:', err.message);
      if (progressCallback) progressCallback('complete', 100, 'OCR request encountered an error');

      const msg = err.message || '';
      const isConnErr =
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('Load failed');

      const friendlyError = isConnErr
        ? 'Cannot connect to Nirikshan Mitra backend server. Please make sure the server is running on http://localhost:3000.'
        : msg;

      return {
        success: false,
        text: 'Text could not be reliably read from this image',
        diagnostics: {
          engine: 'Gemini Vision (Server API)',
          quality: isConnErr ? 'Backend Server Offline' : 'Connection Error',
          characterCount: 0,
          readable: false
        },
        error: friendlyError,
        isConnectionError: isConnErr
      };
    }
  },

  async processPanels(
    panels: Array<{ key: PanelKey; label?: string; imageSource: string | File | Blob; name?: string }>,
    progressCallback?: ProgressCallback
  ): Promise<OcrResponseData> {
    if (!Array.isArray(panels) || panels.length === 0) {
      return {
        success: false,
        text: 'Text could not be reliably read from this image',
        error: 'No panel images provided for OCR inspection.',
        panels: [],
        diagnostics: {
          engine: 'Gemini Vision (Server API)',
          quality: 'No images',
          characterCount: 0,
          readable: false
        }
      };
    }

    if (panels.length === 1) {
      const single = panels[0];
      const singleLabel = single.label || PANEL_LABELS[single.key] || 'Front / Main';
      const res = await this.processImage(single.imageSource, progressCallback);
      const panelEntry: PanelOcrResult = {
        key: single.key,
        label: singleLabel,
        name: single.name || '',
        success: res.success,
        text: res.text,
        diagnostics: res.diagnostics,
        error: res.error || null
      };

      return {
        success: res.success,
        text: res.text,
        combinedText: res.text,
        panels: [panelEntry],
        successfulPanels: res.success ? [panelEntry] : [],
        failedPanels: res.success ? [] : [panelEntry],
        diagnostics: res.diagnostics,
        error: res.error
      };
    }

    if (progressCallback) {
      const labels = panels.map((p) => p.label || PANEL_LABELS[p.key] || p.key).join(', ');
      progressCallback('preprocessing', 20, `Analyzing ${panels.length} package panels (${labels})...`);
    }

    const promises = panels.map(async (panel) => {
      const panelLabel = panel.label || PANEL_LABELS[panel.key] || panel.key;
      const res = await this.processImage(panel.imageSource);
      const isSuccess = res.success && res.text && res.text !== 'Text could not be reliably read from this image';
      return {
        key: panel.key,
        label: panelLabel,
        name: panel.name || '',
        success: isSuccess,
        text: res.text,
        diagnostics: res.diagnostics,
        error: res.error || (isSuccess ? null : 'Text could not be reliably read from this image')
      } as PanelOcrResult;
    });

    const panelResults = await Promise.all(promises);

    panelResults.sort((a, b) => {
      const idxA = PANEL_ORDER.indexOf(a.key as PanelKey);
      const idxB = PANEL_ORDER.indexOf(b.key as PanelKey);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    const successful = panelResults.filter((p) => p.success);
    const failed = panelResults.filter((p) => !p.success);

    if (successful.length === 0) {
      if (progressCallback) progressCallback('complete', 100, 'OCR failed for all uploaded panels');
      const firstErr = failed[0]?.error || 'Text could not be reliably read from any uploaded panel.';
      return {
        success: false,
        text: 'Text could not be reliably read from this image',
        error: firstErr,
        panels: panelResults,
        successfulPanels: [],
        failedPanels: failed,
        diagnostics: {
          engine: 'Gemini Vision (Server API)',
          quality: `All ${panelResults.length} panels failed`,
          characterCount: 0,
          readable: false
        }
      };
    }

    const combinedSections: string[] = [];
    let totalChars = 0;

    panelResults.forEach((panel) => {
      if (panel.success && panel.text) {
        const cleanText = panel.text.trim();
        totalChars += cleanText.length;
        combinedSections.push(`=== PANEL: ${panel.label} ===\n${cleanText}`);
      } else {
        combinedSections.push(
          `=== PANEL: ${panel.label} (OCR FAILED) ===\n[OCR was unable to read text from this panel: ${panel.error || 'unreadable'}]`
        );
      }
    });

    const combinedOcrText = combinedSections.join('\n\n');
    const successLabels = successful.map((p) => p.label).join(', ');
    let statusMessage = `OCR complete: ${successLabels}`;
    if (failed.length > 0) {
      const failedLabels = failed.map((p) => p.label).join(', ');
      statusMessage += ` (${failedLabels} failed)`;
    }

    if (progressCallback) progressCallback('complete', 100, statusMessage);

    return {
      success: true,
      text: combinedOcrText,
      combinedText: combinedOcrText,
      panels: panelResults,
      successfulPanels: successful,
      failedPanels: failed,
      diagnostics: {
        engine: 'Gemini Vision (Server API)',
        quality: `${successful.length} of ${panelResults.length} panels read`,
        characterCount: totalChars,
        readable: true,
        panelCount: panelResults.length,
        successfulCount: successful.length,
        failedCount: failed.length
      }
    };
  }
};
