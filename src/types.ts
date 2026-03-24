export interface LeatherMatch {
  label: string;
  confidence: number;
  description?: string;
}

export interface ScanResult {
  id: string;
  timestamp: number;
  imageUrl: string;
  matches: LeatherMatch[];
  device?: string;
}

export const LEATHER_CATEGORIES = 203;
export const AVG_PRECISION = 99.2;

export const MOCK_SCANS: ScanResult[] = [];
