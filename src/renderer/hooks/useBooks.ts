import { useState, useCallback } from 'react';

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
  status: 'pending' | 'uploading' | 'uploaded' | 'error' | 'duplicate';
}

export function useBooks() {
  const [books, setBooks] = useState<BookEntry[]>([]);

  const updateBook = useCallback((id: string, patch: Partial<BookEntry>) => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, selected: !b.selected } : b));
  }, []);

  return { books, setBooks, updateBook, toggleSelected };
}
