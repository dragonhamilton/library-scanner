import React, { useState } from 'react';
import type { BookEntry } from '../hooks/useBooks';

interface Props {
  books: BookEntry[];
  onUpdateBook: (id: string, patch: Partial<BookEntry>) => void;
}

export default function UploadProgress({ books, onUpdateBook }: Props) {
  const [uploading, setUploading] = useState(false);

  const selected = books.filter(b => b.selected);
  const uploadedCount = books.filter(b => b.status === 'uploaded').length;
  const errorCount = books.filter(b => b.status === 'error').length;
  const duplicateCount = books.filter(b => b.status === 'duplicate').length;

  async function startUpload() {
    setUploading(true);
    try {
      const results = await window.api.uploadBooks(selected);
      for (const r of results) {
        onUpdateBook(r.id, { status: r.status });
      }
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  }

  const progress = selected.length > 0 ? Math.round((uploadedCount / selected.length) * 100) : 0;

  return (
    <div style={{
      gridColumn: '1 / -1', padding: '12px 16px',
      borderTop: '1px solid #3a3a3a', display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <button onClick={startUpload} disabled={uploading || selected.length === 0} style={{ whiteSpace: 'nowrap' }}>
        {uploading ? 'Uploading…' : `Upload ${selected.length} Selected to Notion →`}
      </button>

      {uploading && (
        <div style={{ flex: 1, height: 6, background: '#333', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#6a9fb5', transition: 'width 0.3s' }} />
        </div>
      )}

      {uploadedCount > 0 && <span style={{ color: '#4caf50', fontSize: 13 }}>{uploadedCount} uploaded</span>}
      {duplicateCount > 0 && <span style={{ color: '#ff9800', fontSize: 13 }}>{duplicateCount} skipped (duplicate)</span>}
      {errorCount > 0 && <span style={{ color: '#f44336', fontSize: 13 }}>{errorCount} errors</span>}
    </div>
  );
}
