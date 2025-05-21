import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import type { ReactNode, Dispatch, SetStateAction } from 'react';
import type React from 'react';
import { getEmbeddings } from '../utils/embeddings';
import {
  renderFlameFractal,
  createFractalParamsFromEmbeddings,
  type FractalPoint,
  type FractalParams,
} from '../utils/flameFractal';
import { resizeCanvas } from '../utils/canvas';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type FractalEntity } from '../db/fractalDB';

export type GalleryItem = {
  src: string;
  w: number;
  h: number;
  text?: string;
  /** UUID returned by backend that references the stored point cloud */
  id: string;
  /** Embedding vector used to generate this fractal */
  embeddings?: number[];
};

interface FractalContextType {
  inputText: string;
  setInputText: Dispatch<SetStateAction<string>>;
  apiKey: string;
  setApiKey: Dispatch<SetStateAction<string>>;
  isLoading: boolean;
  progress: number;
  error: string | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  gallery: GalleryItem[];
  currentFractalText: string;
  setCurrentFractalText: Dispatch<SetStateAction<string>>;
  handleGenerate: () => Promise<void>;
  handleDeleteItem: (idx: number, e: React.MouseEvent) => Promise<void>;
  selectedForComparison: GalleryItem[];
  setSelectedForComparison: Dispatch<SetStateAction<GalleryItem[]>>;
  currentGalleryIndex: number;
  setCurrentGalleryIndex: Dispatch<SetStateAction<number>>;
  displayGalleryItem: (idx: number) => void;
  downloadFractal: (multiplier?: number) => Promise<void>;
  isDownloading: boolean;
  downloadProgress: number;
  toasts: { id: number; msg: string }[];
  addToast: (msg: string) => void;
}

const FractalContext = createContext<FractalContextType | undefined>(undefined);

export const useFractal = () => {
  const ctx = useContext(FractalContext);
  if (!ctx) throw new Error('useFractal must be used within a FractalProvider');
  return ctx;
};

// Display and download resolution multipliers
const DISPLAY_SCALE = 2; // 2× current fidelity on-screen
const DOWNLOAD_SCALE = 2; // 4× container size (2× over display) for saved PNG

export const FractalProvider = ({ children }: { children: ReactNode }) => {
  const [inputText, setInputText] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fractalParamsRef = useRef<FractalParams | null>(null);
  const [currentFractalText, setCurrentFractalText] = useState('');

  const [selectedForComparison, setSelectedForComparison] = useState<GalleryItem[]>([]);

  // Toast state
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const addToast = useCallback((msg: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Live gallery from IndexedDB
  const liveGallery = useLiveQuery(async () => {
    const rows = await db.fractals.orderBy('createdAt').reverse().toArray();
    return rows.map((row: FractalEntity) => ({
      src: URL.createObjectURL(row.blob),
      w: row.w,
      h: row.h,
      text: row.text,
      id: row.id,
      embeddings: row.embeddings,
    })) as GalleryItem[];
  }, []);

  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  // Keep gallery in sync with live data, revoke old object URLs to avoid leaks
  useEffect(() => {
    if (!liveGallery) return;
    gallery.forEach((g) => URL.revokeObjectURL(g.src));
    setGallery(liveGallery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveGallery]);

  // Add gallery navigation state
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState<number>(-1);

  // Helper to display a gallery item on the main canvas
  const displayGalleryItem = (idx: number) => {
    // Prevent switching the canvas while a new fractal is still rendering
    if (isLoading) return;
    if (!canvasRef.current) return;
    if (idx < 0 || idx >= gallery.length) return;

    const item = gallery[idx];
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;

      // Ensure the canvas always matches its (square) container
      resizeCanvas(canvas, true, DISPLAY_SCALE);
      const cw = canvas.width;
      const ch = canvas.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      // Calculate scale (never upscale)
      const scale = Math.min(1, cw / img.naturalWidth, ch / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);

      setCurrentFractalText(item.text ?? '');
      setCurrentGalleryIndex(idx);
    };
    img.src = item.src;
  };

  // Reset error when inputs change
  useEffect(() => {
    if (error) setError(null);
  }, [inputText, apiKey]);

  // Canvas resize effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas(canvas, true, DISPLAY_SCALE);

    const handleResize = () => resizeCanvas(canvas, true, DISPLAY_SCALE);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Soft limits
  const BYTE_LIMIT = 75 * 1024 * 1024; // 75 MB
  const COUNT_LIMIT = 30;
  const BYTE_WARN_THRESHOLD = BYTE_LIMIT * 0.9;
  const COUNT_WARN_THRESHOLD = Math.floor(COUNT_LIMIT * 0.9);

  // generate handler
  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text');
      return;
    }

    if (!apiKey.trim()) {
      setError('Please enter your OpenAI API key');
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setError(null);
    setCurrentFractalText(inputText);
    let renderComplete = false;

    try {
      // Clear canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }

      const embeddings = await getEmbeddings(inputText, apiKey);
      const fractalParams = createFractalParamsFromEmbeddings(embeddings);
      fractalParamsRef.current = fractalParams;

      let fractalPoints: FractalPoint[] = [];

      if (canvasRef.current) {
        resizeCanvas(canvasRef.current, true, DISPLAY_SCALE);
        fractalPoints = await renderFlameFractal(
          canvasRef.current,
          fractalParams,
          (p) => {
            setProgress(p);
          }
        );
        console.log('[handleGenerate] fractalPoints received from renderFlameFractal, length:', fractalPoints?.length);
        if (fractalPoints && fractalPoints.length > 0 && fractalPoints.length < 10) {
          console.log('[handleGenerate] Sample fractalPoints:', fractalPoints.slice(0, 5));
        }

        // Image generation and gallery update should happen after points are generated
        if (!renderComplete && canvasRef.current) {
          renderComplete = true; // Ensure this block runs only once after completion

          canvasRef.current.toBlob(async (blob) => {
            if (!blob) return;

            // Check limits
            const rowsAll = await db.fractals.toArray();
            const totalBytes = rowsAll.reduce((acc: number, cur: FractalEntity) => acc + cur.blob.size, 0);
            const count = await db.fractals.count();

            const newTotal = totalBytes + blob.size;
            const newCount = count + 1;

            if (newTotal >= BYTE_LIMIT || newCount > COUNT_LIMIT) {
              const proceed = window.confirm('You are at the storage limit. Saving this Echo will exceed the limit. Continue?');
              if (!proceed) {
                setIsLoading(false);
                return;
              }
            } else if (newTotal >= BYTE_WARN_THRESHOLD || newCount >= COUNT_WARN_THRESHOLD) {
              addToast('Storage almost full – consider deleting some Echoes.');
            }

            const id = crypto.randomUUID();
            await db.fractals.put({
              id,
              blob,
              w: canvasRef.current!.width,
              h: canvasRef.current!.height,
              text: inputText,
              embeddings,
              createdAt: Date.now(),
            });

            // Set navigation index to the newest item (0 because liveGallery is reversed)
            setCurrentGalleryIndex(0);
            setIsLoading(false);
          }, 'image/png');
        }
      }
    } catch (err) {
      console.error('Error generating fractal:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const item = gallery[idx];
    if (!item) return;
    await db.fractals.delete(item.id);
    URL.revokeObjectURL(item.src);

    if (idx === currentGalleryIndex) {
      setCurrentGalleryIndex(-1);
    } else if (idx < currentGalleryIndex) {
      setCurrentGalleryIndex(currentGalleryIndex - 1);
    }
  };

  // High-resolution download of the current fractal
  const downloadFractal = async (multiplier: number = DOWNLOAD_SCALE) => {
    if (isDownloading) return;
    if (!canvasRef.current) return;

    setIsDownloading(true);
    setDownloadProgress(0);

    // If we don't have params for the current fractal, fallback to simple export
    if (!fractalParamsRef.current) {
      const link = document.createElement('a');
      link.href = canvasRef.current.toDataURL('image/png');
      link.download = 'fractal.png';
      link.click();
      setIsDownloading(false);
      setDownloadProgress(0);
      return;
    }

    const offCanvas = document.createElement('canvas');
    offCanvas.width = canvasRef.current.width * multiplier;
    offCanvas.height = canvasRef.current.height * multiplier;

    // Render at high res (iterations scaled by area)
    const baseIterations = 1_000_000;
    const iterations = baseIterations * multiplier * multiplier;
    await renderFlameFractal(offCanvas, fractalParamsRef.current, (p) => setDownloadProgress(p), iterations);

    const link = document.createElement('a');
    link.href = offCanvas.toDataURL('image/png');
    const safeName = (currentFractalText || 'fractal').replace(/[^a-z0-9\-_.]/gi, '_');
    link.download = `${safeName}.png`;
    link.click();

    setIsDownloading(false);
    setDownloadProgress(0);
  };

  const value: FractalContextType = {
    inputText,
    setInputText,
    apiKey,
    setApiKey,
    isLoading,
    progress,
    error,
    canvasRef,
    gallery,
    currentFractalText,
    setCurrentFractalText,
    handleGenerate,
    handleDeleteItem,
    selectedForComparison,
    setSelectedForComparison,
    currentGalleryIndex,
    setCurrentGalleryIndex,
    displayGalleryItem,
    downloadFractal,
    isDownloading,
    downloadProgress,
    toasts,
    addToast,
  };

  return (
    <FractalContext.Provider value={value}>{children}</FractalContext.Provider>
  );
}; 