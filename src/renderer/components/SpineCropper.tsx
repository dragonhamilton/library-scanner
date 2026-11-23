import React, { useRef, useState, useEffect } from 'react';

interface CropRegion { x: number; y: number; width: number; height: number; }

interface Props {
  imagePath: string;
  onCrop: (region: CropRegion) => void;
  onClose: () => void;
}

export default function SpineCropper({ imagePath, onCrop, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [rect, setRect] = useState<CropRegion | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const img = new Image();
    img.src = `local-file://${imagePath}`;
    img.onload = () => {
      const maxW = window.innerWidth * 0.8;
      const maxH = window.innerHeight * 0.8;
      const s = Math.min(maxW / img.width, maxH / img.height, 1);
      setScale(s);
      setImgSize({ w: img.width, h: img.height });
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')!;
        canvasRef.current.width = img.width * s;
        canvasRef.current.height = img.height * s;
        ctx.drawImage(img, 0, 0, img.width * s, img.height * s);
      }
    };
  }, [imagePath]);

  function draw(r: CropRegion | null) {
    if (!canvasRef.current) return;
    const img = new Image();
    img.src = `local-file://${imagePath}`;
    img.onload = () => {
      const ctx = canvasRef.current!.getContext('2d')!;
      ctx.drawImage(img, 0, 0, imgSize.w * scale, imgSize.h * scale);
      if (r) {
        ctx.strokeStyle = '#6a9fb5';
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x, r.y, r.width, r.height);
        ctx.fillStyle = 'rgba(106,159,181,0.15)';
        ctx.fillRect(r.x, r.y, r.width, r.height);
      }
    };
  }

  function toImageCoords(canvasX: number, canvasY: number) {
    return { x: Math.round(canvasX / scale), y: Math.round(canvasY / scale) };
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const b = canvasRef.current!.getBoundingClientRect();
    setStart({ x: e.clientX - b.left, y: e.clientY - b.top });
    setRect(null);
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!start) return;
    const b = canvasRef.current!.getBoundingClientRect();
    const cur = { x: e.clientX - b.left, y: e.clientY - b.top };
    const r = {
      x: Math.min(start.x, cur.x),
      y: Math.min(start.y, cur.y),
      width: Math.abs(cur.x - start.x),
      height: Math.abs(cur.y - start.y),
    };
    setRect(r);
    draw(r);
  }

  function onMouseUp() {
    setStart(null);
  }

  function applyCrop() {
    if (!rect) return;
    const img = toImageCoords(rect.x, rect.y);
    onCrop({
      x: img.x,
      y: img.y,
      width: Math.round(rect.width / scale),
      height: Math.round(rect.height / scale),
    });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <p style={{ color: '#aaa', marginBottom: 12, fontSize: 13 }}>Drag to select the spine region</p>
      <canvas
        ref={canvasRef}
        style={{ cursor: 'crosshair', borderRadius: 4 }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      />
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button onClick={applyCrop} disabled={!rect}>Apply Crop</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
