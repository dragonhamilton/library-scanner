import { ipcMain } from 'electron';
import { capturePhoto, importPhoto } from './camera';
import { detectSpines } from './claude-vision';
import { lookupBook } from './google-books';
import { cropSpine } from './image-processing';
import { testNotionConnection, createDatabase, uploadBooks } from './notion-client';
import { getConfig, saveConfig } from './config';

export function registerIpcHandlers() {
  ipcMain.handle('capturePhoto', () => capturePhoto());
  ipcMain.handle('importPhoto', (_e, filePath: string) => importPhoto(filePath));
  ipcMain.handle('detectSpines', (_e, imagePath: string) => detectSpines(imagePath));
  ipcMain.handle('lookupBook', (_e, title: string, author: string) => lookupBook(title, author));
  ipcMain.handle('cropSpine', (_e, imagePath: string, region: CropRegion) => cropSpine(imagePath, region));
  ipcMain.handle('testNotionConnection', (_e, token: string) => testNotionConnection(token));
  ipcMain.handle('createDatabase', (_e, token: string, parentPageUrl: string, name: string) => createDatabase(token, parentPageUrl, name));
  ipcMain.handle('uploadBooks', (_e, books: BookEntry[]) => uploadBooks(books));
  ipcMain.handle('getConfig', () => getConfig());
  ipcMain.handle('saveConfig', (_e, config: Partial<AppConfig>) => saveConfig(config));
}

// Type imports — defined here to avoid circular deps
export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BookEntry {
  id: string;
  selected: boolean;
  spineImagePath: string;
  titleOnSpine: string;
  title: string;
  author: string;
  isbn: string;
  notes: string;
  confidence: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
}

export interface AppConfig {
  notionParentPageUrl: string;
  databaseId: string;
  databaseName: string;
  defaultNotesTemplate: string;
}
