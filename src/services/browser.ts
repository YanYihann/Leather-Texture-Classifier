import type { LeatherMatch } from '../types';
export type InferenceProgress = { stage: 'download' | 'initialize' | 'inference'; received?: number; total?: number };
export const browserInference = import.meta.env.VITE_INFERENCE_MODE !== 'server';
export const browserSupported = () => typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
let worker: Worker | null = null;
export function classifyInBrowser(image: string, signal?: AbortSignal, progress?: (state: InferenceProgress) => void): Promise<{ matches: LeatherMatch[]; source: 'browser' }> {
  return new Promise((resolve, reject) => {
    if (!browserSupported()) { reject(new Error('Please use a current version of Chrome, Edge, Firefox or Safari for on-device classification.')); return; }
    if (signal?.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; }
    worker ||= new Worker(new URL('./browser.worker.ts', import.meta.url), { type: 'module' });
    const current = worker;
    const cleanup = () => { signal?.removeEventListener('abort', abort); current.onmessage = null; current.onerror = null; };
    const abort = () => { cleanup(); current.terminate(); worker = null; reject(new DOMException('Cancelled', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
    current.onerror = () => { cleanup(); current.terminate(); worker = null; reject(new Error('The model worker could not start. Please reload and try again.')); };
    current.onmessage = event => {
      if (event.data.type === 'progress') progress?.(event.data);
      if (event.data.type === 'result') { cleanup(); resolve({ matches: event.data.matches, source: 'browser' }); }
      if (event.data.type === 'error') { cleanup(); reject(new Error(event.data.message)); }
    };
    current.postMessage({ image });
  });
}
