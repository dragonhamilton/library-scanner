import React, { useState } from 'react';
import { useConfig } from '../hooks/useConfig';

interface Props {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: Props) {
  const { config, save } = useConfig();
  const [anthropicKey, setAnthropicKey] = useState('');
  const [notionToken, setNotionToken] = useState('');
  const [googleBooksKey, setGoogleBooksKey] = useState('');
  const [storedNotionToken, setStoredNotionToken] = useState<string | null>(null);
  const [hasGoogleBooksKey, setHasGoogleBooksKey] = useState(false);

  React.useEffect(() => {
    window.api.getKey('notionToken').then(t => setStoredNotionToken(t));
    window.api.getKey('googleBooksApiKey').then(k => setHasGoogleBooksKey(!!k));
  }, []);
  const [parentPageUrl, setParentPageUrl] = useState(config.notionParentPageUrl);
  const [dbName, setDbName] = useState(config.databaseName);
  const [defaultNotes, setDefaultNotes] = useState(config.defaultNotesTemplate);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [creatingDb, setCreatingDb] = useState(false);

  const activeToken = notionToken || storedNotionToken || '';

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await window.api.testNotionConnection(activeToken);
      setTestResult(ok ? '✓ Connected' : '✗ Invalid token');
    } finally {
      setTesting(false);
    }
  }

  async function setupDatabase() {
    setCreatingDb(true);
    try {
      const dbId = await window.api.createDatabase(activeToken, parentPageUrl, dbName);
      await save({ notionParentPageUrl: parentPageUrl, databaseId: dbId, databaseName: dbName, defaultNotesTemplate: defaultNotes });
      setTestResult(`✓ Database created (${dbId.slice(0, 8)}…)`);
    } catch (err) {
      setTestResult(`✗ ${(err as Error).message}`);
    } finally {
      setCreatingDb(false);
    }
  }

  async function handleSave() {
    if (anthropicKey) await window.api.setKey('anthropicApiKey', anthropicKey);
    if (notionToken) await window.api.setKey('notionToken', notionToken);
    if (googleBooksKey) await window.api.setKey('googleBooksApiKey', googleBooksKey);
    await save({ notionParentPageUrl: parentPageUrl, databaseName: dbName, defaultNotesTemplate: defaultNotes });
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#2a2a2a', borderRadius: 12, padding: 32, width: 480, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #3a3a3a' }}>
        <h2 style={{ marginBottom: 24, fontSize: 18 }}>Settings</h2>

        <Section title="Anthropic API Key">
          <input
            type="password"
            placeholder="sk-ant-… (leave blank to keep existing)"
            value={anthropicKey}
            onChange={e => setAnthropicKey(e.target.value)}
          />
        </Section>

        <Section title="Google Books API Key">
          <input
            type="password"
            placeholder={hasGoogleBooksKey ? '(saved — leave blank to keep)' : 'AIza… (optional, improves ISBN lookup)'}
            value={googleBooksKey}
            onChange={e => setGoogleBooksKey(e.target.value)}
          />
          <p style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
            Get a free key at console.cloud.google.com → Books API
          </p>
        </Section>

        <Section title="Notion Integration Token">
          <input
            type="password"
            placeholder="ntn_… (leave blank to keep existing)"
            value={notionToken}
            onChange={e => setNotionToken(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <button onClick={testConnection} disabled={testing || !activeToken}>
              {testing ? 'Testing…' : 'Test Connection'}
            </button>
            {testResult && <span style={{ fontSize: 13, color: testResult.startsWith('✓') ? '#4caf50' : '#f44336' }}>{testResult}</span>}
          </div>
        </Section>

        <Section title="Notion Parent Page URL">
          <input
            placeholder="https://www.notion.so/your-page-id"
            value={parentPageUrl}
            onChange={e => setParentPageUrl(e.target.value)}
          />
        </Section>

        <Section title="Database Name">
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={dbName} onChange={e => setDbName(e.target.value)} />
            <button onClick={setupDatabase} disabled={creatingDb || !activeToken || !parentPageUrl}>
              {creatingDb ? 'Creating…' : config.databaseId ? 'Recreate DB' : 'Create DB'}
            </button>
          </div>
          {config.databaseId && <p style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Current DB: {config.databaseId.slice(0, 12)}…</p>}
        </Section>

        <Section title="Default Notes Template">
          <input
            placeholder="e.g. Shelf: Living Room"
            value={defaultNotes}
            onChange={e => setDefaultNotes(e.target.value)}
          />
        </Section>

        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave} style={{ background: '#6a9fb5', borderColor: '#6a9fb5', color: '#fff' }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </label>
      {children}
    </div>
  );
}
