/**
 * ocrService.js — Client Interface for Nirikshan Mitra Server-Side OCR Engine
 *
 * Sends uploaded product-label images to the secure server-side endpoint (/api/ocr)
 * which invokes the Gemini Multimodal Vision model on the backend.
 *
 * NO API KEYS are stored or transmitted from the frontend.
 * All secrets are managed server-side via .env / environment variables.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OcrService = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PANEL_ORDER = ['front', 'back', 'side', 'top_bottom'];

  var PANEL_LABELS = {
    front: 'Front / Main',
    back: 'Back / Rear',
    side: 'Side / Other',
    top_bottom: 'Top / Bottom'
  };

  /**
   * Helper to convert imageSource into a base64 data-URL
   */
  function toBase64(imageSource) {
    if (typeof imageSource === 'string' && imageSource.indexOf('data:image/') === 0) {
      return Promise.resolve(imageSource);
    }
    // Node.js Buffer support
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(imageSource)) {
      return Promise.resolve('data:image/jpeg;base64,' + imageSource.toString('base64'));
    }
    // Browser FileReader support for File/Blob
    return new Promise(function (res, rej) {
      if (typeof File !== 'undefined' && typeof Blob !== 'undefined' && typeof FileReader !== 'undefined') {
        if (!(imageSource instanceof File) && !(imageSource instanceof Blob)) {
          rej(new Error('Invalid image format. Expected File, Blob, or data-URL.'));
          return;
        }
        var reader = new FileReader();
        reader.onload  = function (e) { res(e.target.result); };
        reader.onerror = function ()  { rej(new Error('FileReader failed to load image.')); };
        reader.readAsDataURL(imageSource);
        return;
      }
      rej(new Error('Unsupported image format or runtime environment.'));
    });
  }

  /**
   * Resolves OCR backend endpoints based on execution environment
   */
  function getCandidateUrls() {
    var win = (typeof window !== 'undefined') ? window : {};
    var loc = win.location || null;

    if (!loc) {
      // Node.js or non-browser testing
      return ['http://localhost:3000/api/ocr', 'http://127.0.0.1:3000/api/ocr'];
    }

    var protocol = loc.protocol || 'http:';
    var hostname = loc.hostname || '';
    var port = loc.port || '';
    var isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '' || protocol === 'file:';

    var candidateUrls = [];
    if (isLocal) {
      if (protocol === 'file:') {
        candidateUrls.push('http://localhost:3000/api/ocr');
        candidateUrls.push('http://127.0.0.1:3000/api/ocr');
      } else if (port === '3000') {
        candidateUrls.push('/api/ocr');
        candidateUrls.push('http://localhost:3000/api/ocr');
        candidateUrls.push('http://127.0.0.1:3000/api/ocr');
      } else {
        // Live Server (port 5500 / other local development)
        candidateUrls.push('http://localhost:3000/api/ocr');
        candidateUrls.push('http://127.0.0.1:3000/api/ocr');
        candidateUrls.push('/api/ocr');
      }
    } else {
      // Production/remote deployment (e.g. Netlify)
      candidateUrls.push('/api/ocr');
    }
    return candidateUrls;
  }

  var OcrService = {

    PANEL_ORDER: PANEL_ORDER,
    PANEL_LABELS: PANEL_LABELS,

    /**
     * Sends a single uploaded image to the backend Gemini Vision OCR service.
     *
     * @param {string|File|Blob} imageSource      - Uploaded label image (File/Blob or data-URL string)
     * @param {function}         progressCallback - Called with (stage, progressPct, statusMsg) at key steps
     * @returns {Promise<{ success: boolean, text: string, diagnostics: object }>}
     */
    processImage: function (imageSource, progressCallback) {
      return new Promise(function (resolve) {
        if (progressCallback) progressCallback('preprocessing', 25, 'Processing image...');

        toBase64(imageSource)
          .then(function (base64Img) {
            if (progressCallback) progressCallback('recognizing', 60, 'Recognizing text via Gemini Vision...');

            var candidateUrls = getCandidateUrls();
            var requestBody = JSON.stringify({ image: base64Img });

            function tryFetch(urls) {
              var targetUrl = urls[0];
              return fetch(targetUrl, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    requestBody
              }).catch(function (fetchErr) {
                if (urls.length > 1) {
                  console.warn('[OcrService] Failed to reach ' + targetUrl + ' (' + fetchErr.message + '), trying next candidate endpoint...');
                  return tryFetch(urls.slice(1));
                }
                throw fetchErr;
              });
            }

            return tryFetch(candidateUrls);
          })
          .then(function (response) {
            if (!response.ok) {
              return response.json()
                .catch(function () { return {}; })
                .then(function (errData) {
                  var msg = (errData && errData.error) || ('Backend OCR HTTP Error ' + response.status);
                  throw new Error(msg);
                });
            }
            return response.json();
          })
          .then(function (data) {
            if (progressCallback) progressCallback('complete', 100, 'OCR text extraction complete');

            resolve({
              success:     Boolean(data.success),
              text:        data.text || 'Text could not be reliably read from this image',
              diagnostics: data.diagnostics || {
                engine:         'Gemini Vision (Server API)',
                quality:        'Standard',
                characterCount: (data.text || '').length,
                readable:       Boolean(data.success)
              }
            });
          })
          .catch(function (err) {
            console.error('[OcrService] Backend request failed:', err.message);
            if (progressCallback) progressCallback('complete', 100, 'OCR request encountered an error');

            var isConnErr = !err.message || 
                            err.message.indexOf('Failed to fetch') !== -1 ||
                            err.message.indexOf('NetworkError') !== -1 ||
                            err.message.indexOf('ECONNREFUSED') !== -1 ||
                            err.message.indexOf('Load failed') !== -1;

            var friendlyError = isConnErr
              ? 'Cannot connect to Nirikshan Mitra backend server. Please make sure the server is running on http://localhost:3000 (run "npm start" or "node server.js").'
              : err.message;

            resolve({
              success: false,
              text: 'Text could not be reliably read from this image',
              diagnostics: {
                engine:         'Gemini Vision (Server API)',
                quality:        isConnErr ? 'Backend Server Offline' : 'Connection Error',
                characterCount: 0,
                readable:       false
              },
              error: friendlyError,
              isConnectionError: isConnErr
            });
          });
      });
    },

    /**
     * Sends multiple package panel images to OCR, retaining panel identities
     * and combining results deterministically.
     *
     * @param {Array<{key: string, label?: string, imageSource: any, name?: string}>} panels
     * @param {function} progressCallback
     * @returns {Promise<{
     *   success: boolean,
     *   text: string,
     *   combinedText: string,
     *   panels: Array<object>,
     *   successfulPanels: Array<object>,
     *   failedPanels: Array<object>,
     *   diagnostics: object,
     *   error?: string
     * }>}
     */
    processPanels: function (panels, progressCallback) {
      var self = this;
      return new Promise(function (resolve) {
        if (!Array.isArray(panels) || panels.length === 0) {
          resolve({
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
          });
          return;
        }

        // Single panel case: preserve identical single-image flow
        if (panels.length === 1) {
          var singlePanel = panels[0];
          var singleLabel = singlePanel.label || PANEL_LABELS[singlePanel.key] || 'Front / Main';
          self.processImage(singlePanel.imageSource, progressCallback)
            .then(function (res) {
              var panelEntry = {
                key: singlePanel.key || 'front',
                label: singleLabel,
                name: singlePanel.name || '',
                success: res.success,
                text: res.text,
                diagnostics: res.diagnostics,
                error: res.error || null
              };

              resolve({
                success: res.success,
                text: res.text,
                combinedText: res.text,
                panels: [panelEntry],
                successfulPanels: res.success ? [panelEntry] : [],
                failedPanels: res.success ? [] : [panelEntry],
                diagnostics: res.diagnostics,
                error: res.error
              });
            });
          return;
        }

        // Multi-panel case: process all available panels concurrently
        if (progressCallback) {
          var labels = panels.map(function (p) { return p.label || PANEL_LABELS[p.key] || p.key; }).join(', ');
          progressCallback('preprocessing', 20, 'Analyzing ' + panels.length + ' package panels (' + labels + ')...');
        }

        var promises = panels.map(function (panel) {
          var panelLabel = panel.label || PANEL_LABELS[panel.key] || panel.key;
          return self.processImage(panel.imageSource).then(function (res) {
            return {
              key: panel.key,
              label: panelLabel,
              name: panel.name || '',
              success: res.success && res.text && res.text !== 'Text could not be reliably read from this image',
              text: res.text,
              diagnostics: res.diagnostics,
              error: res.error || (res.success ? null : 'Text could not be reliably read from this image')
            };
          });
        });

        Promise.all(promises).then(function (panelResults) {
          // Sort results in canonical deterministic order: Front -> Back -> Side -> Top/Bottom
          panelResults.sort(function (a, b) {
            var idxA = PANEL_ORDER.indexOf(a.key);
            var idxB = PANEL_ORDER.indexOf(b.key);
            if (idxA === -1) idxA = 99;
            if (idxB === -1) idxB = 99;
            return idxA - idxB;
          });

          var successful = panelResults.filter(function (p) { return p.success; });
          var failed = panelResults.filter(function (p) { return !p.success; });

          // If ALL panel OCR calls fail
          if (successful.length === 0) {
            if (progressCallback) progressCallback('complete', 100, 'OCR failed for all uploaded panels');
            var firstErr = (failed[0] && failed[0].error) || 'Text could not be reliably read from any uploaded panel.';
            resolve({
              success: false,
              text: 'Text could not be reliably read from this image',
              error: firstErr,
              panels: panelResults,
              successfulPanels: [],
              failedPanels: failed,
              diagnostics: {
                engine: 'Gemini Vision (Server API)',
                quality: 'All ' + panelResults.length + ' panels failed',
                characterCount: 0,
                readable: false
              }
            });
            return;
          }

          // Build deterministic combined OCR text
          var combinedSections = [];
          var totalChars = 0;

          panelResults.forEach(function (panel) {
            if (panel.success && panel.text) {
              var cleanText = panel.text.trim();
              totalChars += cleanText.length;
              combinedSections.push(
                '=== PANEL: ' + panel.label + ' ===\n' + cleanText
              );
            } else {
              combinedSections.push(
                '=== PANEL: ' + panel.label + ' (OCR FAILED) ===\n[OCR was unable to read text from this panel: ' + (panel.error || 'unreadable') + ']'
              );
            }
          });

          var combinedOcrText = combinedSections.join('\n\n');

          var successLabels = successful.map(function (p) { return p.label; }).join(', ');
          var statusMessage = 'OCR complete: ' + successLabels;
          if (failed.length > 0) {
            var failedLabels = failed.map(function (p) { return p.label; }).join(', ');
            statusMessage += ' (' + failedLabels + ' failed)';
          }

          if (progressCallback) progressCallback('complete', 100, statusMessage);

          resolve({
            success: true,
            text: combinedOcrText,
            combinedText: combinedOcrText,
            panels: panelResults,
            successfulPanels: successful,
            failedPanels: failed,
            diagnostics: {
              engine: 'Gemini Vision (Server API)',
              quality: successful.length + ' of ' + panelResults.length + ' panels read',
              characterCount: totalChars,
              readable: true,
              panelCount: panelResults.length,
              successfulCount: successful.length,
              failedCount: failed.length
            }
          });
        });
      });
    }

  };

  return OcrService;
}));
