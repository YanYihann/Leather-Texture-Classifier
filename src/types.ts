export interface LeatherMatch {
  label: string;
  confidence: number;
  description?: string;
  referenceUrl?: string | null;
}

export interface ScanResult {
  id: string;
  timestamp: number;
  imageUrl: string;
  matches: LeatherMatch[];
  device?: string;
  note?: string;
  source?: 'local' | 'cloud' | 'browser';
}

export const LEATHER_CATEGORIES = 203;

export const MOCK_SCANS: ScanResult[] = [];
