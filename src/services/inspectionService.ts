import { authFetch } from './api';
import { InspectionRecord, SaveInspectionPayload } from '../types/inspection';

export const inspectionService = {
  async getAllInspections(): Promise<{ success: boolean; inspections: InspectionRecord[]; error?: string }> {
    const res = await authFetch('/api/inspections');
    return await res.json();
  },

  async getInspectionById(
    id: string
  ): Promise<{ success: boolean; inspection: InspectionRecord; error?: string }> {
    const res = await authFetch(`/api/inspections/${encodeURIComponent(id)}`);
    return await res.json();
  },

  async saveInspection(payload: SaveInspectionPayload): Promise<{ success: boolean; inspection_id: string; error?: string }> {
    const res = await authFetch('/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  }
};
