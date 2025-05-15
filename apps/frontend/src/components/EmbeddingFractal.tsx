import { FractalProvider } from '../context/FractalContext';
import FractalControls from './FractalControls';
import FractalCanvas from './FractalCanvas';
import FractalGallery from './FractalGallery';
import SelectedFractals from './SelectedFractals';
import './EmbeddingFractal.css';
import ComparisonCanvas from './ComparisonCanvas';
import { useFractal } from '../context/FractalContext';
import { useEffect } from 'react';

// Inner component that uses the context
function FractalLayout() {
  const {
    selectedForComparison,
    canvasRef,
    gallery,
    currentGalleryIndex,
    displayGalleryItem,
  } = useFractal();

  // Attach arrow key navigation for gallery items
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea/contentEditable element
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        return;
      }

      if (gallery.length === 0) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const newIdx = currentGalleryIndex <= 0 ? gallery.length - 1 : currentGalleryIndex - 1;
        displayGalleryItem(newIdx);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const newIdx = (currentGalleryIndex + 1) % gallery.length;
        displayGalleryItem(newIdx);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gallery.length, currentGalleryIndex, displayGalleryItem]);

  // Determine dimensions for the comparison canvas
  // Default or use dimensions from the main canvas if available
  const mainCanvasWidth = canvasRef.current?.width ?? 512;
  const mainCanvasHeight = canvasRef.current?.height ?? 512;

  return (
    <div className="embedding-fractal">
      <div className="fractal-main">
        <FractalControls />
        <FractalCanvas />
      </div>
      <FractalGallery />
      <SelectedFractals />
      <ComparisonCanvas
        fractalA={selectedForComparison[0] ?? null}
        fractalB={selectedForComparison[1] ?? null}
        width={mainCanvasWidth}
        height={mainCanvasHeight}
      />
    </div>
  );
}

export default function EmbeddingFractal() {
  return (
    <FractalProvider>
      <FractalLayout />
    </FractalProvider>
  );
} 