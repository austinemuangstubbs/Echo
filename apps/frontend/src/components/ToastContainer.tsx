import { useFractal } from '../context/FractalContext';

export default function ToastContainer() {
  const { toasts } = useFractal();
  if (!toasts.length) return null;

  return (
    <div
      className="toast-container"
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        zIndex: 1000,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            fontSize: '0.85rem',
          }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
} 