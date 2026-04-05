import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import type { AppConfig } from './ipc-handlers';

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

const DEFAULTS: AppConfig = {
  notionParentPageUrl: '',
  databaseId: '',
  databaseName: 'Book Library',
  defaultNotesTemplate: '',
};

export function getConfig(): AppConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveConfig(partial: Partial<AppConfig>): void {
  const current = getConfig();
  const updated = { ...current, ...partial };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8');
}
