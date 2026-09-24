import { authFetch, getStoredToken } from './api';

export const reportService = {
  async generateReport(
    inspectionId: string
  ): Promise<{ success: boolean; report_reference?: string; download_url?: string; error?: string }> {
    const res = await authFetch(`/api/inspections/${encodeURIComponent(inspectionId)}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await res.json();
  },

  getDownloadUrl(inspectionId: string, customDownloadUrl?: string): string {
    const baseUrl = customDownloadUrl || `/api/inspections/${encodeURIComponent(inspectionId)}/report/download`;
    const token = getStoredToken();
    return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
  },

  async triggerDownload(inspectionId: string): Promise<void> {
    const data = await this.generateReport(inspectionId);
    if (!data.success) {
      throw new Error(data.error || 'Report generation failed');
    }

    const downloadUrl = this.getDownloadUrl(inspectionId, data.download_url);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${data.report_reference || `inspection_${inspectionId}`}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
