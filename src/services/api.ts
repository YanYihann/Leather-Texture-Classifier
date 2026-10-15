import type { LeatherMatch } from '../types';
import { browserInference, classifyInBrowser, type InferenceProgress } from './browser';

export const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const apiUrl = (path: string) => `${apiBase}${path}`;
export const referenceUrl = (path?: string | null) => path?.startsWith('/') && !browserInference ? `${apiBase}${path}` : path;

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body) throw new Error(body?.error || `Service unavailable (${response.status}). Please try again.`);
  return body;
}

export async function classifyLeather(image: string, signal?: AbortSignal, progress?: (state: InferenceProgress) => void): Promise<{ matches: LeatherMatch[]; source?: 'local' | 'cloud' | 'browser' }> {
  if (browserInference) return classifyInBrowser(image, signal, progress);
  const result = await request<{ matches: LeatherMatch[]; source?: 'local' | 'cloud' }>('/api/classify', {
    method: 'POST', body: JSON.stringify({ image }), signal,
  });
  if (!Array.isArray(result.matches) || !result.matches.length || result.matches.some(match =>
    typeof match.label !== 'string' || !Number.isFinite(match.confidence) || match.confidence < 0 || match.confidence > 100
  )) throw new Error('The model returned an invalid result. Please try another image.');
  return { ...result, matches: [...result.matches].sort((a, b) => b.confidence - a.confidence).slice(0, 3) };
}
