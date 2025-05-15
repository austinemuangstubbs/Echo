import { useFractal } from '../context/FractalContext';

export default function FractalCanvas() {
  const { canvasRef, currentFractalText } = useFractal();

  return (
    <div className="canvas-container glass-panel">
      <canvas ref={canvasRef} id="fractal-canvas"></canvas>
      {currentFractalText && <div className="canvas-overlay">{currentFractalText}</div>}
    </div>
  );
} 