import { useEffect, useRef } from 'react';
import { useFractal } from '../context/FractalContext';
import { resizeCanvas } from '../utils/canvas';
import {
  createFractalParamsFromEmbeddings,
  renderFlameFractal,
} from '../utils/flameFractal';

export default function CommonCoreFractal() {
  const { selectedForComparison } = useFractal();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute the shared embedding vector and render whenever the selection changes
  useEffect(() => {
    if (selectedForComparison.length !== 2) return;
    const [a, b] = selectedForComparison;

    if (!a.embeddings || !b.embeddings) return;
    if (a.embeddings.length !== b.embeddings.length) return;

    // Build the "common core" vector: keep components that share a sign, pick the smaller magnitude.
    const common = a.embeddings.map((v1, i) => {
      const v2 = b.embeddings![i];
      if (Math.sign(v1) === Math.sign(v2)) {
        // Preserve shared sign, use min abs value
        const magnitude = Math.min(Math.abs(v1), Math.abs(v2));
        return Math.sign(v1) * magnitude;
      }
      // Opposite signs cancel out
      return 0;
    });

    const params = createFractalParamsFromEmbeddings(common);
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Ensure canvas matches its container
    resizeCanvas(canvas, true, 2);

    // Clear before rendering
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Fire and forget; we don't track the promise here
    renderFlameFractal(canvas, params).catch(console.error);
  }, [selectedForComparison]);

  // Only render section when exactly two fractals are selected
  if (selectedForComparison.length !== 2) return null;

  return (
    <div
      className="glass-panel"
      style={{ marginTop: '1rem', padding: '1rem' }}
    >
      <h3 style={{ marginBottom: '1rem' }}>Common Core</h3>
      <div style={{ width: '100%', aspectRatio: '1 / 1', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
} 