import * as ort from 'onnxruntime-web/wasm';
import materials from '../data/materials';
import { publicAsset } from './assets';

ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = publicAsset('/runtime/');
let session: ort.InferenceSession | null = null;
const modelUrl = publicAsset('/models/leather-resnet50-v1.onnx');

async function loadModel() {
  if (session) return session;
  const cache = await caches.open('leathermind-model-v1').catch(() => null);
  let response = await cache?.match(modelUrl);
  if (!response) response = await fetch(modelUrl);
  if (!response.ok) throw new Error('The model could not be downloaded. Check your connection and retry.');
  const total = 95614159;
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Model download is unsupported in this browser.');
  const chunks: Uint8Array[] = []; let received = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value); received += value.length;
    self.postMessage({ type: 'progress', stage: 'download', received, total });
  }
  const bytes = new Uint8Array(received); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  chunks.length = 0;
  if (received !== total) { await cache?.delete(modelUrl); throw new Error('The model download was incomplete. Please retry.'); }
  if (cache) await cache.put(modelUrl, new Response(bytes.slice(), { headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(received) } })).catch(() => {});
  self.postMessage({ type: 'progress', stage: 'initialize' });
  session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  return session;
}

// Pillow-compatible antialiased bilinear sampling; retain the original Resize(256),
// CenterCrop(224), ImageNet normalization. Compute only the central crop to bound memory.
function coefficients(length: number, resized: number, crop: number) {
  const scale = length / resized, support = Math.max(1, scale);
  return Array.from({ length: 224 }, (_, output) => {
    const center = (output + crop + .5) * scale;
    const start = Math.max(0, Math.floor(center - support + .5));
    const end = Math.min(length, Math.floor(center + support + .5));
    const values = Array.from({ length: end - start }, (_, index) => Math.max(0, 1 - Math.abs((start + index + .5 - center) / support)));
    const sum = values.reduce((a, b) => a + b, 0);
    return { start, weights: values.map(value => Math.round(value / sum * 4194304)) };
  });
}
function roundEven(number: number) { const floor = Math.floor(number); return number - floor === .5 ? floor + floor % 2 : Math.round(number); }
async function tensorFromImage(image: string) {
  const bitmap = await createImageBitmap(await (await fetch(image)).blob(), { colorSpaceConversion: 'none' });
  const { width, height } = bitmap;
  const canvas = new OffscreenCanvas(width, height); const context = canvas.getContext('2d');
  if (!context) throw new Error('Image processing is unavailable in this browser.');
  context.fillStyle = '#fff'; context.fillRect(0, 0, width, height); context.drawImage(bitmap, 0, 0); bitmap.close();
  const pixels = context.getImageData(0, 0, width, height).data;
  const resizedWidth = width <= height ? 256 : Math.floor(256 * width / height);
  const resizedHeight = height <= width ? 256 : Math.floor(256 * height / width);
  const xCoeffs = coefficients(width, resizedWidth, roundEven((resizedWidth - 224) / 2));
  const yCoeffs = coefficients(height, resizedHeight, roundEven((resizedHeight - 224) / 2));
  const intermediate = new Uint8Array(height * 224 * 3);
  for (let y = 0; y < height; y++) for (let x = 0; x < 224; x++) for (let channel = 0; channel < 3; channel++) {
    const coeff = xCoeffs[x]; let sum = 2097152;
    coeff.weights.forEach((weight, index) => sum += pixels[(y * width + coeff.start + index) * 4 + channel] * weight);
    intermediate[(y * 224 + x) * 3 + channel] = Math.min(255, Math.max(0, Math.floor(sum / 4194304)));
  }
  const tensor = new Float32Array(3 * 224 * 224), mean = [.485, .456, .406], std = [.229, .224, .225];
  for (let y = 0; y < 224; y++) for (let x = 0; x < 224; x++) for (let channel = 0; channel < 3; channel++) {
    const coeff = yCoeffs[y]; let sum = 2097152;
    coeff.weights.forEach((weight, index) => sum += intermediate[((coeff.start + index) * 224 + x) * 3 + channel] * weight);
    const pixel = Math.min(255, Math.max(0, Math.floor(sum / 4194304)));
    tensor[channel * 224 * 224 + y * 224 + x] = (pixel / 255 - mean[channel]) / std[channel];
  }
  return new ort.Tensor('float32', tensor, [1, 3, 224, 224]);
}
self.onmessage = async (event: MessageEvent<{ image: string }>) => {
  try {
    const model = await loadModel(); self.postMessage({ type: 'progress', stage: 'inference' });
    const input = await tensorFromImage(event.data.image);
    const output = await model.run({ image: input }); input.dispose();
    const logits = Array.from(output.logits.data as Float32Array); output.logits.dispose();
    const max = Math.max(...logits), exps = logits.map(value => Math.exp(value - max)), sum = exps.reduce((a, b) => a + b, 0);
    const matches = exps.map((value, index) => ({ label: materials[index].id, confidence: Number((value / sum * 100).toFixed(2)), referenceUrl: materials[index].image })).sort((a, b) => b.confidence - a.confidence).slice(0, 3);
    self.postMessage({ type: 'result', matches });
  } catch (error) { self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Inference failed. Please retry.' }); }
};
