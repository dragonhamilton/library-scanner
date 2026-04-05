import path from 'path';
import type { CropRegion } from './ipc-handlers';

const MAX_DIMENSION = 2048;

export async function convertToJpeg(inputPath: string, outputDir: string): Promise<string> {
  const sharp = (await import('sharp')).default;
  const outputPath = path.join(outputDir, `${path.basename(inputPath, path.extname(inputPath))}.jpg`);
  await sharp(inputPath).jpeg({ quality: 90 }).toFile(outputPath);
  return outputPath;
}

export async function resizeForClaude(inputPath: string): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  const meta = await sharp(inputPath).metadata();
  const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
  const pipeline = sharp(inputPath);
  if (longest > MAX_DIMENSION) {
    pipeline.resize(
      (meta.width ?? 0) > (meta.height ?? 0) ? MAX_DIMENSION : undefined,
      (meta.height ?? 0) >= (meta.width ?? 0) ? MAX_DIMENSION : undefined,
      { fit: 'inside' }
    );
  }
  return pipeline.jpeg({ quality: 85 }).toBuffer();
}

export async function cropSpine(imagePath: string, region: CropRegion): Promise<string> {
  const sharp = (await import('sharp')).default;
  const outputPath = imagePath.replace(/\.jpg$/, `_crop_${Date.now()}.jpg`);
  await sharp(imagePath)
    .extract({ left: region.x, top: region.y, width: region.width, height: region.height })
    .jpeg({ quality: 90 })
    .toFile(outputPath);
  return outputPath;
}

export async function autoSliceSpines(
  imagePath: string,
  spineCount: number,
  outputDir: string
): Promise<string[]> {
  const sharp = (await import('sharp')).default;
  const meta = await sharp(imagePath).metadata();
  const imgWidth = meta.width ?? 0;
  const imgHeight = meta.height ?? 0;
  const sliceWidth = Math.floor(imgWidth / spineCount);
  const overlap = Math.floor(sliceWidth * 0.1);

  const paths: string[] = [];
  for (let i = 0; i < spineCount; i++) {
    const left = Math.max(0, i * sliceWidth - overlap);
    const right = Math.min(imgWidth, (i + 1) * sliceWidth + overlap);
    const outputPath = path.join(outputDir, `spine_${String(i + 1).padStart(3, '0')}.jpg`);
    await sharp(imagePath)
      .extract({ left, top: 0, width: right - left, height: imgHeight })
      .jpeg({ quality: 90 })
      .toFile(outputPath);
    paths.push(outputPath);
  }
  return paths;
}
