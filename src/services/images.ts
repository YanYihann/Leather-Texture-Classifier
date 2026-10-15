export async function resizeImage(source: Blob | string, maxSide = 1536, quality = .88): Promise<string> {
  const blob = typeof source === 'string' ? await (await fetch(source)).blob() : source;
  const image = await createImageBitmap(blob);
  try {
    if (!image.width || !image.height || image.width * image.height > 60_000_000) throw new Error('This image is too large. Choose an image below 60 megapixels.');
    const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is unavailable in this browser.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally { image.close(); }
}

export function downloadJson(value: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
