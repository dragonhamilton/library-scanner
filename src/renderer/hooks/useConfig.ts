import { useState, useEffect } from 'react';

export interface AppConfig {
  notionParentPageUrl: string;
  databaseId: string;
  databaseName: string;
  unknownDatabaseId: string;
  unknownDatabaseName: string;
  defaultNotesTemplate: string;
}

const DEFAULTS: AppConfig = {
  notionParentPageUrl: '',
  databaseId: '',
  databaseName: "Phoenix's Library",
  unknownDatabaseId: '',
  unknownDatabaseName: 'Unknown Books',
  defaultNotesTemplate: '',
};

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(DEFAULTS);
  const [isFirstRun, setIsFirstRun] = useState(false);

  useEffect(() => {
    window.api.getConfig().then((cfg) => {
      setConfig({ ...DEFAULTS, ...cfg });
      const needsSetup = !cfg.notionParentPageUrl;
      setIsFirstRun(needsSetup);
    });
  }, []);

  const save = async (partial: Partial<AppConfig>) => {
    await window.api.saveConfig(partial);
    setConfig(prev => ({ ...prev, ...partial }));
  };

  return { config, save, isFirstRun };
}
