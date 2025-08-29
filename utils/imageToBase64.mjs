import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const dirname = new URL('.', import.meta.url).pathname;

function convertImageToBase64(imagePath) {
  const imageData = readFileSync(imagePath);
  const base64Image = imageData.toString('base64');
  const ext = extname(imagePath).slice(1);
  const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  return `data:${mimeType};base64,${base64Image}`;
}

const imagePath = resolve(dirname, '../assets/banner.webp');
const base64DataUrl = convertImageToBase64(imagePath);

console.log(base64DataUrl);
