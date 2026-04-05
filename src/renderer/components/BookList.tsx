import React from 'react';
import type { BookEntry } from '../hooks/useBooks';

interface Props {
  books: BookEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onRescan: () => void;
  onAddManual: () => void;
}

function ConfidenceDot({ score }: { score: number }) {
  const cls = score >= 0.7 ? 'high' : score >= 0.4 ? 'medium' : 'low';
  return <span className={`confidence-dot confidence-${cls}`} title={`${Math.round(score * 100)}% match`} />;
}

export default function BookList({ books, selectedId, onSelect, onToggle, onRescan, onAddManual }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid #3a3a3a' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #3a3a3a', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ flex: 1, color: '#aaa' }}>Detected: {books.length} books</span>
        <button onClick={onRescan}>Re-scan</button>
        <button onClick={onAddManual}>+ Add Book</button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#2a2a2a', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', width: 32 }} />
              <th style={{ padding: '8px 12px' }}>Title</th>
              <th style={{ padding: '8px 12px' }}>Author</th>
              <th style={{ padding: '8px 12px' }}>ISBN</th>
              <th style={{ padding: '8px 12px', width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {books.map(book => (
              <tr
                key={book.id}
                onClick={() => onSelect(book.id)}
                style={{
                  background: selectedId === book.id ? '#2d3f4f' : 'transparent',
                  borderBottom: '1px solid #2a2a2a',
                  cursor: 'pointer',
                }}
              >
                <td style={{ padding: '8px 12px' }}>
                  <input
                    type="checkbox"
                    checked={book.selected}
                    onChange={() => onToggle(book.id)}
                    onClick={e => e.stopPropagation()}
                  />
                </td>
                <td style={{ padding: '8px 12px', color: book.title ? '#e0e0e0' : '#888' }}>
                  {book.title || book.titleOnSpine || '(untitled)'}
                </td>
                <td style={{ padding: '8px 12px', color: '#bbb' }}>{book.author}</td>
                <td style={{ padding: '8px 12px', color: '#888', fontFamily: 'monospace', fontSize: 12 }}>{book.isbn}</td>
                <td style={{ padding: '8px 12px' }}>
                  <ConfidenceDot score={book.confidence} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
