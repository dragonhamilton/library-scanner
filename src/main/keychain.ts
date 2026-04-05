import { safeStorage } from 'electron';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

const KEYS_PATH = path.join(app.getPath('userData'), 'keys.bin.json');

type KeyName = 'anthropicApiKey' | 'notionToken' | 'googleBooksApiKey';

function loadRaw(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(KEYS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveRaw(data: Record<string, string>) {
  fs.writeFileSync(KEYS_PATH, JSON.stringify(data), 'utf-8');
}

export function setKey(name: KeyName, value: string): void {
  const encrypted = safeStorage.encryptString(value).toString('base64');
  const raw = loadRaw();
  raw[name] = encrypted;
  saveRaw(raw);
}

export function getKey(name: KeyName): string | null {
  const raw = loadRaw();
  if (!raw[name]) return null;
  try {
    return safeStorage.decryptString(Buffer.from(raw[name], 'base64'));
  } catch {
    return null;
  }
}
