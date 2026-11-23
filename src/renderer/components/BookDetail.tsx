import React from 'react';
import type { BookEntry } from '../hooks/useBooks';
import SpineCropper from './SpineCropper';

interface Props {
  book: BookEntry;
  onChange: (patch: Partial<BookEntry>) => void;
}

export default function BookDetail({ book, onChange }: Props) {
  const [showCropper, setShowCropper] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  async function relookup() {
    setLookingUp(true);
    try {
      const { metadata, confidence } = await window.api.lookupBook(book.title, book.author);
      if (metadata) {
        onChange({
          title: metadata.title,
          author: metadata.authors.join(', '),
          isbn: metadata.isbn13 ?? metadata.isbn10 ?? book.isbn,
          confidence,
        });
      }
    } finally {
      setLookingUp(false);
    }
  }

  return (
    <div style={{ padding: 20, overflowY: 'auto', borderBottom: '1px solid #3a3a3a', gridColumn: 2, gridRow: 1 }}>
      <h3 style={{ marginBottom: 16, color: '#aaa', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
        Book Detail
      </h3>

      <Field label="Title">
        <input value={book.title} onChange={e => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Author">
        <input value={book.author} onChange={e => onChange({ author: e.target.value })} />
      </Field>
      <Field label="ISBN">
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={book.isbn} onChange={e => onChange({ isbn: e.target.value })} />
          <button onClick={relookup} disabled={lookingUp} style={{ whiteSpace: 'nowrap' }}>
            {lookingUp ? '…' : '🔍 Re-lookup'}
          </button>
        </div>
      </Field>
      <Field label="Notes">
        <textarea
          value={book.notes}
          onChange={e => onChange({ notes: e.target.value })}
          rows={3}
        />
      </Field>
      <Field label="Spine">
        {book.spineImagePath ? (
          <div>
            <img
              src={`local-file://${book.spineImagePath}`}
              alt="Spine"
              style={{ maxHeight: 120, borderRadius: 4, cursor: 'pointer', border: '1px solid #444' }}
              onClick={() => setShowCropper(true)}
            />
            <p style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Click to recrop</p>
          </div>
        ) : (
          <span style={{ color: '#666', fontSize: 12 }}>No spine image</span>
        )}
      </Field>

      {showCropper && book.spineImagePath && (
        <SpineCropper
          imagePath={book.spineImagePath}
          onCrop={async (region) => {
            const newPath = await window.api.cropSpine(book.spineImagePath, region);
            onChange({ spineImagePath: newPath });
            setShowCropper(false);
          }}
          onClose={() => setShowCropper(false)}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// useState import needed
import { useState } from 'react';
