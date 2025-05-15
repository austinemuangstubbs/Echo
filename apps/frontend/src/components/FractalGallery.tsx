import { useFractal } from '../context/FractalContext';

export default function FractalGallery() {
  const { gallery, handleDeleteItem, displayGalleryItem, currentGalleryIndex } = useFractal();

  if (gallery.length === 0) return null;

  return (
    <div className="gallery-section glass-panel">
      <h3>Your Echo Gallery</h3>
      <div className="gallery">
        {gallery.map((item, idx) => (
          <div key={idx} className={`gallery-item ${idx === currentGalleryIndex ? 'selected' : ''}`}>
            <img
              src={item.src}
              alt={`Fractal ${idx}`}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', idx.toString())}
              onClick={() => displayGalleryItem(idx)}
            />
            {item.text && <div className="gallery-text-overlay">{item.text}</div>}
            <button
              className="delete-button"
              onClick={(e) => handleDeleteItem(idx, e)}
              aria-label="Delete fractal"
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