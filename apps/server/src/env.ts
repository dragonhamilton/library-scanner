import path from 'node:path';

/** Repository root (apps/server/src → ../../..). */
export const repoRoot = path.resolve(import.meta.dirname, '../../..');

export type OcrEngineName = 'tesseract' | 'rapidocr';

function ocrEngineFromEnv(): OcrEngineName {
  const value = (process.env.OCR_ENGINE ?? 'tesseract').toLowerCase();
  if (value !== 'tesseract' && value !== 'rapidocr') {
    throw new Error(`OCR_ENGINE must be "tesseract" or "rapidocr", got "${value}"`);
  }
  return value;
}

export const env = {
  host: process.env.HOST ?? '127.0.0.1',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://scanner:scanner@127.0.0.1:5432/library_scanner',
  dataDir: path.resolve(repoRoot, process.env.DATA_DIR ?? './data'),
  ocrEngine: ocrEngineFromEnv(),
  webDist: path.join(repoRoot, 'apps/web/dist'),
  migrationsDir: path.join(repoRoot, 'db/migrations'),
};
