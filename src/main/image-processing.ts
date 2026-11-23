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

// Smooth an array with a simple moving average
function smoothArray(arr: Float32Array, windowSize: number): Float32Array {
  const result = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    let sum = 0, count = 0;
    for (let j = Math.max(0, i - windowSize); j <= Math.min(arr.length - 1, i + windowSize); j++) {
      sum += arr[j];
      count++;
    }
    result[i] = sum / count;
  }
  return result;
}

// Find the N strongest peaks with a minimum spacing between them
function findTopNPeaks(arr: Float32Array, n: number, minSpacing: number): number[] {
  const peaks: { pos: number; val: number }[] = [];
  for (let i = 1; i < arr.length - 1; i++) {
    if (arr[i] > arr[i - 1] && arr[i] >= arr[i + 1]) {
      peaks.push({ pos: i, val: arr[i] });
    }
  }
  peaks.sort((a, b) => b.val - a.val);
  const selected: number[] = [];
  for (const peak of peaks) {
    if (selected.length >= n) break;
    if (!selected.some(p => Math.abs(p - peak.pos) < minSpacing)) {
      selected.push(peak.pos);
    }
  }
  return selected;
}

// Detect spine boundaries by finding columns with the strongest horizontal
// intensity gradient, then slice the image at those boundaries.
// Falls back to equal-width slicing if not enough peaks are found.
export async function autoSliceSpines(
  imagePath: string,
  spineCount: number,
  outputDir: string
): Promise<string[]> {
  const sharp = (await import('sharp')).default;

  // Downsample to a fixed height for fast pixel analysis
  const ANALYSIS_HEIGHT = 200;
  const { data, info } = await sharp(imagePath)
    .resize({ height: ANALYSIS_HEIGHT, fit: 'contain' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: analysisWidth } = info;

  // Compute per-column horizontal gradient (sum of |col[x] - col[x-1]| over all rows)
  const gradient = new Float32Array(analysisWidth);
  for (let x = 1; x < analysisWidth; x++) {
    let sum = 0;
    for (let y = 0; y < ANALYSIS_HEIGHT; y++) {
      sum += Math.abs(data[y * analysisWidth + x] - data[y * analysisWidth + x - 1]);
    }
    gradient[x] = sum;
  }

  // Smooth to reduce noise from texture within spines
  const smoothWindow = Math.max(3, Math.floor(analysisWidth / (spineCount * 4)));
  const smoothed = smoothArray(gradient, smoothWindow);

  // Find N-1 boundary peaks (N spines need N-1 cuts)
  const minSpacing = Math.floor(analysisWidth / (spineCount * 2));
  const boundaryPixels = findTopNPeaks(smoothed, spineCount - 1, minSpacing);

  // Scale boundary positions back to full-resolution image coordinates
  const fullMeta = await sharp(imagePath).metadata();
  const fullWidth = fullMeta.width ?? analysisWidth;
  const fullHeight = fullMeta.height ?? ANALYSIS_HEIGHT;
  const scale = fullWidth / analysisWidth;

  let cuts: number[];
  if (boundaryPixels.length === spineCount - 1) {
    const scaled = boundaryPixels.map(p => Math.round(p * scale)).sort((a, b) => a - b);
    cuts = [0, ...scaled, fullWidth];
  } else {
    // Fallback: equal-width slices
    const sliceWidth = Math.floor(fullWidth / spineCount);
    cuts = Array.from({ length: spineCount + 1 }, (_, i) => i * sliceWidth);
    cuts[spineCount] = fullWidth;
  }

  // Slice the full-resolution image at the detected boundaries
  const paths: string[] = [];
  for (let i = 0; i < spineCount; i++) {
    const left = cuts[i];
    const width = cuts[i + 1] - left;
    const outputPath = path.join(outputDir, `spine_${String(i + 1).padStart(3, '0')}.jpg`);
    await sharp(imagePath)
      .extract({ left, top: 0, width, height: fullHeight })
      .jpeg({ quality: 90 })
      .toFile(outputPath);
    paths.push(outputPath);
  }
  return paths;
}
