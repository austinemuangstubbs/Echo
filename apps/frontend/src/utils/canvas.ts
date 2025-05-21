/**
 * Resize a canvas to match its displayed size
 * @param canvas The canvas element to resize
 * @param highdpi Whether to enable high DPI rendering
 * @param scaleMultiplier The scale multiplier for the canvas
 */
export function resizeCanvas(canvas: HTMLCanvasElement, highdpi = true, scaleMultiplier = 1): void {
  const container = canvas.parentElement;
  if (!container) return;
  
  // Get the display size of the container
  const rect = container.getBoundingClientRect();
  const width = Math.floor(rect.width);
  const height = Math.floor(rect.height);
  
  // Set canvas size for high DPI displays
  const dpr = (highdpi ? window.devicePixelRatio || 1 : 1) * scaleMultiplier;
  
  // Only resize if dimensions have changed
  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    // Set display size (CSS pixels)
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    // NOTE: We intentionally do NOT call ctx.scale(dpr, dpr) here.
    // The renderFlameFractal() function fully resets and then sets its own
    // transform matrix.  Scaling here would be wiped out, but the canvas
    // pixel dimensions would still be multiplied by dpr, leading to every
    // subsequent translation/scale in renderFlameFractal being off by the
    // same factor (everything would appear squished into the top-left
    // quadrant on high-DPI/Retina screens).  By skipping the extra
    // context-scale we keep a 1-to-1 mapping between logical pixels and the
    // enlarged backing store, which fixes the offset while still retaining
    // full resolution clarity.
  }
} 