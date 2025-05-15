/**
 * Resize a canvas to match its displayed size
 * @param canvas The canvas element to resize
 * @param highdpi Whether to enable high DPI rendering
 */
export function resizeCanvas(canvas: HTMLCanvasElement, highdpi = true): void {
  const container = canvas.parentElement;
  if (!container) return;
  
  // Get the display size of the container
  const rect = container.getBoundingClientRect();
  const width = Math.floor(rect.width);
  const height = Math.floor(rect.height);
  
  // Set canvas size for high DPI displays
  const dpr = highdpi ? window.devicePixelRatio || 1 : 1;
  
  // Only resize if dimensions have changed
  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    // Set display size (CSS pixels)
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    // Scale rendering for high DPI devices
    const ctx = canvas.getContext('2d');
    if (ctx && dpr !== 1) {
      ctx.scale(dpr, dpr);
    }
  }
} 