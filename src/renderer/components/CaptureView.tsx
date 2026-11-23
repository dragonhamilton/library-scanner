import React, { useRef, useState } from 'react';
import type { BookEntry } from '../hooks/useBooks';

interface Props {
  onBooksDetected: (books: BookEntry[]) => void;
}

export default function CaptureView({ onBooksDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      setStreaming(true);
    }
  }

  async function capture() {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
    await processImage(base64, 'capture');
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImage(file.path, 'import');
  }

  async function processImage(imageData: string, mode: 'capture' | 'import') {
    setProcessing(true);
    try {
      setStatus('Saving image…');
      const { path: imagePath } = mode === 'capture'
        ? await window.api.capturePhoto(imageData)
        : await window.api.importPhoto(imageData);

      setStatus('Detecting book spines via Claude Vision…');
      const spines = await window.api.detectSpines(imagePath);

      setStatus(`Found ${spines.length} spines. Cropping spine images…`);
      const spinePaths = await window.api.sliceSpines(imagePath, spines.length);

      setStatus(`Found ${spines.length} spines. Looking up metadata…`);
      const books: BookEntry[] = [];
      for (let i = 0; i < spines.length; i++) {
        const spine = spines[i];
        setStatus(`Looking up ${i + 1}/${spines.length}: ${spine.title_on_spine}`);
        const { metadata, confidence } = await window.api.lookupBook(
          spine.title_on_spine,
          spine.author_on_spine ?? ''
        );
        books.push({
          id: crypto.randomUUID(),
          selected: spine.title_on_spine !== '[UNREADABLE]',
          spineImagePath: spinePaths[i] ?? imagePath,
          titleOnSpine: spine.title_on_spine,
          title: metadata?.title ?? spine.title_on_spine,
          author: metadata?.authors.join(', ') ?? spine.author_on_spine ?? '',
          isbn: metadata?.isbn13 ?? metadata?.isbn10 ?? '',
          notes: '',
          confidence,
          status: 'pending',
        });
      }
      onBooksDetected(books);
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={startCamera} disabled={streaming}>Start Camera</button>
        <label style={{ cursor: 'pointer' }}>
          <input type="file" accept="image/*" onChange={handleFileImport} style={{ display: 'none' }} />
          <span style={{ padding: '6px 14px', border: '1px solid #555', borderRadius: 6, background: '#333' }}>
            Import Photo
          </span>
        </label>
      </div>

      {streaming && (
        <div style={{ position: 'relative', maxWidth: 640 }}>
          <video ref={videoRef} style={{ width: '100%', borderRadius: 8 }} />
          <button
            onClick={capture}
            disabled={processing}
            style={{ marginTop: 12, width: '100%', padding: '10px', fontSize: 15 }}
          >
            {processing ? 'Processing…' : 'Capture'}
          </button>
        </div>
      )}

      {status && <p style={{ color: '#aaa', fontSize: 13 }}>{status}</p>}
    </div>
  );
}
