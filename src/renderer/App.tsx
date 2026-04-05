import React, { useState } from 'react';
import CaptureView from './components/CaptureView';
import BookList from './components/BookList';
import BookDetail from './components/BookDetail';
import UploadProgress from './components/UploadProgress';
import SettingsPanel from './components/SettingsPanel';
import { useBooks } from './hooks/useBooks';
import { useConfig } from './hooks/useConfig';

type View = 'capture' | 'review' | 'settings';

export default function App() {
  const [view, setView] = useState<View>('capture');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const { books, setBooks, updateBook, toggleSelected } = useBooks();
  const { config, isFirstRun } = useConfig();

  React.useEffect(() => {
    if (isFirstRun) setView('settings');
  }, [isFirstRun]);

  const selectedBook = books.find(b => b.id === selectedBookId) ?? null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Bookshelf Scanner</h1>
        <button onClick={() => setView('settings')}>Settings ⚙</button>
      </header>

      {view === 'settings' && (
        <SettingsPanel onClose={() => setView('capture')} />
      )}

      {view === 'capture' && (
        <CaptureView
          onBooksDetected={(detected) => {
            setBooks(detected);
            setView('review');
          }}
        />
      )}

      {view === 'review' && (
        <div className="review-layout">
          <BookList
            books={books}
            selectedId={selectedBookId}
            onSelect={setSelectedBookId}
            onToggle={toggleSelected}
            onRescan={() => setView('capture')}
            onAddManual={() => {
              const id = crypto.randomUUID();
              setBooks(prev => [...prev, {
                id,
                selected: true,
                spineImagePath: '',
                titleOnSpine: '',
                title: '',
                author: '',
                isbn: '',
                notes: config.defaultNotesTemplate,
                confidence: 0,
                status: 'pending',
              }]);
              setSelectedBookId(id);
            }}
          />
          {selectedBook && (
            <BookDetail
              book={selectedBook}
              onChange={(patch) => updateBook(selectedBook.id, patch)}
            />
          )}
          <UploadProgress books={books} onUpdateBook={updateBook} />
        </div>
      )}
    </div>
  );
}
