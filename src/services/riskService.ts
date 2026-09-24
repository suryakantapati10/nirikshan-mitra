import { authFetch } from './api';
import { BrandInfo, RiskProfile, ViolationRecord } from '../types/risk';

export interface BrandViolationsResponse {
  success: boolean;
  brand: BrandInfo;
  violations: ViolationRecord[];
  error?: string;
}

export const riskService = {
  async getBrandViolations(brandIdentifier: string): Promise<BrandViolationsResponse> {
    const res = await authFetch(`/api/brands/${encodeURIComponent(brandIdentifier)}/violations`);
    return await res.json();
  },

  async getBrandRisk(brandIdentifier: string): Promise<RiskProfile & { success: boolean }> {
    const res = await authFetch(`/api/brands/${encodeURIComponent(brandIdentifier)}/risk`);
    return await res.json();
  }
};
