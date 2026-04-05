import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { convertToJpeg } from './image-processing';

const TEMP_DIR = path.join(app.getPath('temp'), 'library-scanner');

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Live capture is triggered from the renderer via getUserMedia.
// This handler receives the base64 JPEG the renderer captured and saves it.
export async function capturePhoto(base64Jpeg: string): Promise<{ path: string; thumbnail: string }> {
  ensureTempDir();
  const filePath = path.join(TEMP_DIR, `capture_${Date.now()}.jpg`);
  fs.writeFileSync(filePath, Buffer.from(base64Jpeg, 'base64'));
  const thumbnail = await makeThumbnail(filePath);
  return { path: filePath, thumbnail };
}

export async function importPhoto(filePath: string): Promise<{ path: string; thumbnail: string }> {
  ensureTempDir();
  const jpegPath = await convertToJpeg(filePath, TEMP_DIR);
  const thumbnail = await makeThumbnail(jpegPath);
  return { path: jpegPath, thumbnail };
}

async function makeThumbnail(filePath: string): Promise<string> {
  const sharp = (await import('sharp')).default;
  const buf = await sharp(filePath).resize(300).jpeg({ quality: 70 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}
