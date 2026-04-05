import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  capturePhoto: (base64Jpeg: string) => ipcRenderer.invoke('capturePhoto', base64Jpeg),
  importPhoto: (filePath: string) => ipcRenderer.invoke('importPhoto', filePath),
  detectSpines: (imagePath: string) => ipcRenderer.invoke('detectSpines', imagePath),
  lookupBook: (title: string, author: string) => ipcRenderer.invoke('lookupBook', title, author),
  cropSpine: (imagePath: string, region: object) => ipcRenderer.invoke('cropSpine', imagePath, region),
  testNotionConnection: (token: string) => ipcRenderer.invoke('testNotionConnection', token),
  createDatabase: (token: string, parentPageUrl: string, name: string) =>
    ipcRenderer.invoke('createDatabase', token, parentPageUrl, name),
  uploadBooks: (books: unknown[]) => ipcRenderer.invoke('uploadBooks', books),
  getConfig: () => ipcRenderer.invoke('getConfig'),
  saveConfig: (config: object) => ipcRenderer.invoke('saveConfig', config),
});

// Extend Window type
declare global {
  interface Window {
    api: {
      capturePhoto(base64Jpeg: string): Promise<{ path: string; thumbnail: string }>;
      importPhoto(filePath: string): Promise<{ path: string; thumbnail: string }>;
      detectSpines(imagePath: string): Promise<unknown[]>;
      lookupBook(title: string, author: string): Promise<{ metadata: unknown; confidence: number }>;
      cropSpine(imagePath: string, region: object): Promise<string>;
      testNotionConnection(token: string): Promise<boolean>;
      createDatabase(token: string, parentPageUrl: string, name: string): Promise<string>;
      uploadBooks(books: unknown[]): Promise<{ id: string; status: string }[]>;
      getConfig(): Promise<Record<string, string>>;
      saveConfig(config: object): Promise<void>;
    };
  }
}
