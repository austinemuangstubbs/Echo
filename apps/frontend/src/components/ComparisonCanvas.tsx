import { useEffect, useRef, useState } from 'react';
import type { GalleryItem } from '../context/FractalContext';
import { resizeCanvas } from '../utils/canvas';
import { comparePointClouds } from '../utils/backendApi';

interface ComparisonCanvasProps {
  fractalA: GalleryItem | null;
  fractalB: GalleryItem | null;
  width: number;
  height: number;
}

export default function ComparisonCanvas({
  fractalA,
  fractalB,
  width,
  height,
}: ComparisonCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointsCache = useRef<{ position: { x: number; y: number }; intensity: number }[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const drawPoints = (points: { position: { x: number; y: number }; intensity: number }[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const dpr = window.devicePixelRatio || 1;
    for (const pt of points) {
      const { x, y } = pt.position;
      ctx.fillStyle = `rgba(255,0,0,${pt.intensity})`;
      ctx.beginPath();
      ctx.arc(x / dpr, y / dpr, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Resize canvas when container dims change and redraw if we have cached points
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resizeCanvas(canvas, false);
    if (pointsCache.current) {
      drawPoints(pointsCache.current);
    }
  }, [width, height]);

  // Main draw effect – runs only when selected fractals change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!fractalA || !fractalB) {
      return;
    }

    if (!fractalA.id || !fractalB.id) {
      setError('Missing point cloud IDs for selected Echoes');
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    comparePointClouds(fractalA.id, fractalB.id)
      .then((data) => {
        if (cancelled) return;
        const { points } = data.renderingData;
        if (!points || points.length === 0) {
          setError('No overlap detected');
          return;
        }

        pointsCache.current = points;
        drawPoints(points);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('comparePointClouds error:', err);
        setError((err as Error).message || 'Failed to compare');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fractalA?.id, fractalB?.id]);

  return (
    <div className="comparison-canvas-container glass-panel" style={{ marginTop: '1rem' }}>
      <h3>Echoes Overlap</h3>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block', backgroundColor: 'black' }} />
      {isLoading && <p style={{ color: '#aaa', textAlign: 'center' }}>Loading…</p>}
      {error && <p style={{ color: '#ff8888', textAlign: 'center' }}>{error}</p>}
      {(!fractalA || !fractalB) && !isLoading && (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '1rem' }}>
          Select two Echoes above to see their overlap.
        </p>
      )}
    </div>
  );
} 