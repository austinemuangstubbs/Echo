import { useFractal } from '../context/FractalContext';
import type { GalleryItem } from '../context/FractalContext';

export default function SelectedFractals() {
  const { gallery, selectedForComparison, setSelectedForComparison } = useFractal();

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const idxStr = e.dataTransfer.getData('text/plain');
    const idx = parseInt(idxStr, 10);
    if (isNaN(idx)) return;

    // Avoid duplicates & limit to 2
    setSelectedForComparison((prev) => {
      if (prev.length >= 2 || prev.some((item) => gallery[idx] && item.src === gallery[idx].src)) {
        return prev;
      }
      const item = gallery[idx];
      return item ? [...prev, item] : prev;
    });
  };

  const handleRemove = (src: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForComparison((prev) => prev.filter((it) => it.src !== src));
  };

  return (
    <div
      className="gallery-section glass-panel"
      style={{ marginTop: '1rem' }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <h3>Compare Echoes (max 2)</h3>
      {selectedForComparison.length === 0 && (
        <p style={{ color: '#bbb', fontSize: '0.9rem' }}>
          Drag up to two Echoes here
        </p>
      )}
      <div className="gallery">
        {selectedForComparison.map((item) => (
          <div key={item.src} className="gallery-item">
            <img src={item.src} alt="Selected fractal" />
            <button
              className="delete-button"
              onClick={(e) => handleRemove(item.src, e)}
              aria-label="Remove fractal"
            >
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 