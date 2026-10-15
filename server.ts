import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import dotenv from 'dotenv';
import type { ScanResult } from './src/types';

const root = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(root, '.env.local'), quiet: true });
dotenv.config({ path: path.join(root, '.env'), quiet: true });
const app = express();
const port = Number(process.env.PORT || 3000);
const python = process.env.PYTHON_EXECUTABLE || (process.platform === 'win32' ? 'python' : 'python3');
const modelPath = process.env.MODEL_PATH || path.join(root, 'best_leather_model_val.pth');
const datasetDir = process.env.DATASET_DIR || path.join(root, 'dataset_train');
const historyPath = process.env.HISTORY_FILE || path.join(root, 'shared_history.json');
const historyLimit = Math.max(1, Math.min(1000, Number(process.env.HISTORY_LIMIT) || 1000));
app.disable('x-powered-by');
app.use(express.json({ limit: '6mb' }));
app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

let worker: ChildProcessWithoutNullStreams | null = null;
let ready = false;
let starting: Promise<void> | null = null;
let pending: { resolve: (data: any) => void; reject: (error: Error) => void } | null = null;
let inferBusy = false;
function startWorker(): Promise<void> {
  if (ready) return Promise.resolve();
  if (starting) return starting;
  if (!fs.existsSync(modelPath)) return Promise.reject(new Error('Model weights are unavailable.'));
  const processWorker = spawn(python, ['-u', path.join(root, 'inference.py'), '--serve'], {
    cwd: root, windowsHide: true, env: { ...process.env, MODEL_PATH: modelPath, DATASET_DIR: datasetDir },
  });
  worker = processWorker;
  starting = new Promise<void>((resolve, reject) => {
    let diagnostics = '';
    const startupTimeout = setTimeout(() => { reject(new Error('Model initialization timed out.')); processWorker.kill(); }, 60000);
    processWorker.stderr.on('data', chunk => { diagnostics = (diagnostics + chunk.toString()).slice(-2000); });
    createInterface({ input: processWorker.stdout }).on('line', line => {
      try {
        const data = JSON.parse(line);
        if (data.ready) { ready = true; clearTimeout(startupTimeout); resolve(); }
        else if (pending) { const current = pending; pending = null; data.error ? current.reject(new Error('The model could not process this image.')) : current.resolve(data); }
      } catch { /* Ignore non-JSON model diagnostics. */ }
    });
    const fail = () => { clearTimeout(startupTimeout); ready = false; starting = null; worker = null; const error = new Error('The local model runtime is unavailable.'); pending?.reject(error); pending = null; reject(error); if (diagnostics) console.error('Model runtime:', diagnostics); };
    processWorker.once('error', fail);
    processWorker.once('exit', fail);
    processWorker.stdin.on('error', () => { pending?.reject(new Error('Model connection closed.')); pending = null; });
  });
  return starting;
}
async function localInference(image: string): Promise<any> {
  await startWorker();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending = null; worker?.kill(); reject(new Error('Model inference timed out.')); }, 60000);
    pending = { resolve: data => { clearTimeout(timer); resolve(data); }, reject: error => { clearTimeout(timer); reject(error); } };
    worker!.stdin.write(JSON.stringify({ image }) + '\n');
  });
}
async function cloudInference(image: string) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') throw new Error('No inference provider is currently available.');
  const { GoogleGenAI, Type } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', contents: [{ parts: [{ text: 'Identify the leather texture. Return three common material-type candidates with confidence from 0 to 100 and a short description. Do not claim a dataset class identifier.' }, { inlineData: { mimeType: 'image/jpeg', data: image.split(',')[1] } }] }], config: { responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: { matches: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, confidence: { type: Type.NUMBER }, description: { type: Type.STRING } }, required: ['label', 'confidence'] } } }, required: ['matches'] } } });
  return JSON.parse(response.text || '{}');
}

app.get('/api/health', async (_req, res) => {
  await Promise.race([startWorker().catch(() => {}), new Promise(resolve => setTimeout(resolve, 8000))]);
  const cloud = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';
  res.json({ modelAvailable: ready || cloud, provider: ready ? 'local' : cloud ? 'cloud' : null, classes: 203 });
});
app.post('/api/classify', async (req, res) => {
  const image = req.body?.image;
  if (typeof image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) return res.status(400).json({ error: 'Upload a valid JPG, PNG or WebP image.' });
  if (inferBusy) return res.status(429).json({ error: 'The model is analyzing another sample. Please retry shortly.' });
  inferBusy = true;
  try {
    let result, source: 'local' | 'cloud' = 'local';
    try { result = await localInference(image); }
    catch { result = await cloudInference(image); source = 'cloud'; }
    if (!Array.isArray(result.matches) || !result.matches.length || result.matches.some((match: any) => typeof match.label !== 'string' || !Number.isFinite(match.confidence) || match.confidence < 0 || match.confidence > 100)) throw new Error('The model returned an invalid result.');
    const matches = result.matches.slice(0, 3).map((match: any) => ({ label: match.label, confidence: match.confidence, ...(match.description ? { description: match.description } : {}), referenceUrl: source === 'local' && match.referencePath ? `/dataset_train/${match.referencePath.split('/').map(encodeURIComponent).join('/')}` : null }));
    return res.json({ matches, source });
  } catch (error) { return res.status(503).json({ error: error instanceof Error ? error.message : 'Inference is unavailable. Please retry.' }); }
  finally { inferBusy = false; }
});

async function readHistory(): Promise<ScanResult[]> {
  try { const value = JSON.parse(await fsp.readFile(historyPath, 'utf8')); return Array.isArray(value) ? value : []; }
  catch (error: any) { if (error?.code === 'ENOENT') return []; throw error; }
}
let historyQueue: Promise<unknown> = Promise.resolve();
function mutateHistory(update: (history: ScanResult[]) => ScanResult[]) {
  const operation = historyQueue.then(async () => {
    const next = update(await readHistory()).slice(0, historyLimit);
    await fsp.mkdir(path.dirname(historyPath), { recursive: true });
    const temporary = `${historyPath}.tmp`;
    await fsp.writeFile(temporary, JSON.stringify(next, null, 2), 'utf8');
    await fsp.rename(temporary, historyPath);
  });
  historyQueue = operation.catch(() => {}); return operation;
}
app.get('/api/history', async (_req, res) => {
  try { res.json({ history: await readHistory() }); } catch { res.status(500).json({ error: 'Shared history cannot be read.' }); }
});
app.post('/api/history', async (req, res) => {
  const scan = req.body?.scan;
  if (!scan || typeof scan.id !== 'string' || scan.id.length > 120 || !Number.isFinite(scan.timestamp) || typeof scan.imageUrl !== 'string' || !scan.imageUrl.startsWith('data:image/') || scan.imageUrl.length > 2_000_000 || !Array.isArray(scan.matches) || !scan.matches.length || scan.matches.some((match: any) => typeof match.label !== 'string' || !Number.isFinite(match.confidence))) return res.status(400).json({ error: 'Invalid classification record.' });
  const record: ScanResult = { id: scan.id, timestamp: scan.timestamp, imageUrl: scan.imageUrl, matches: scan.matches.slice(0, 3), note: String(scan.note || '').slice(0, 300), device: String(scan.device || '').slice(0, 40), source: scan.source === 'cloud' ? 'cloud' : 'local' };
  try { await mutateHistory(items => [record, ...items.filter(item => item.id !== record.id)]); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'Shared history could not be saved.' }); }
});
app.patch('/api/history/:id', async (req, res) => {
  const note = String(req.body?.note || '').trim().slice(0, 300);
  try { await mutateHistory(items => items.map(item => item.id === req.params.id ? { ...item, note } : item)); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'The note could not be saved.' }); }
});
app.delete('/api/history/:id', async (req, res) => {
  try { await mutateHistory(items => items.filter(item => item.id !== req.params.id)); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'The record could not be deleted.' }); }
});
app.delete('/api/history', async (_req, res) => {
  try { await mutateHistory(() => []); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'History could not be cleared.' }); }
});
app.use('/dataset_train', express.static(datasetDir, { maxAge: '1d' }));

async function start() {
  if (process.env.NODE_ENV !== 'production') { const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' }); app.use(vite.middlewares); }
  else { const dist = path.join(root, 'dist'); app.use(express.static(dist)); app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html'))); }
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => { res.status(error.status || 500).json({ error: error.type === 'entity.too.large' ? 'The upload is too large.' : 'The request could not be processed.' }); });
  app.listen(port, '0.0.0.0', () => console.log(`LeatherMind listening on http://localhost:${port}`));
  void startWorker().catch(error => console.warn(error.message));
}
process.on('SIGINT', () => { worker?.kill(); process.exit(0); });
process.on('SIGTERM', () => { worker?.kill(); process.exit(0); });
void start();
