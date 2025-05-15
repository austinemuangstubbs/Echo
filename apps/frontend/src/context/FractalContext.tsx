import { createContext, useContext, useState, useRef, useEffect } from 'react';
import type { ReactNode, Dispatch, SetStateAction } from 'react';
import type React from 'react';
import { getEmbeddings } from '../utils/embeddings';
import {
  renderFlameFractal,
  createFractalParamsFromEmbeddings,
  type FractalPoint,
} from '../utils/flameFractal';
import { resizeCanvas } from '../utils/canvas';
import { storePointCloud } from '../utils/backendApi';

export type GalleryItem = {
  src: string;
  w: number;
  h: number;
  text?: string;
  /** UUID returned by backend that references the stored point cloud */
  id: string;
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
  setGallery: Dispatch<SetStateAction<GalleryItem[]>>;
  currentFractalText: string;
  setCurrentFractalText: Dispatch<SetStateAction<string>>;
  handleGenerate: () => Promise<void>;
  handleDeleteItem: (idx: number, e: React.MouseEvent) => void;
  selectedForComparison: GalleryItem[];
  setSelectedForComparison: Dispatch<SetStateAction<GalleryItem[]>>;
  currentGalleryIndex: number;
  setCurrentGalleryIndex: Dispatch<SetStateAction<number>>;
  displayGalleryItem: (idx: number) => void;
}

const FractalContext = createContext<FractalContextType | undefined>(undefined);

export const useFractal = () => {
  const ctx = useContext(FractalContext);
  if (!ctx) throw new Error('useFractal must be used within a FractalProvider');
  return ctx;
};

export const FractalProvider = ({ children }: { children: ReactNode }) => {
  const [inputText, setInputText] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentFractalText, setCurrentFractalText] = useState('');

  const [selectedForComparison, setSelectedForComparison] = useState<GalleryItem[]>([]);

  const [gallery, setGallery] = useState<GalleryItem[]>(() => {
    const saved = localStorage.getItem('fractalGallery');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved) as any[];
      return parsed.map((it: any) => {
        return {
          src: it.src,
          w: it.w ?? 0,
          h: it.h ?? 0,
          text: it.text ?? '',
          id: it.id ?? '',
        } as GalleryItem;
      }).filter(item => item.src); // Filter out potentially invalid old items
    } catch {
      return [];
    }
  });

  // Add gallery navigation state
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState<number>(-1);

  // Helper to display a gallery item on the main canvas
  const displayGalleryItem = (idx: number) => {
    if (!canvasRef.current) return;
    if (idx < 0 || idx >= gallery.length) return;

    const item = gallery[idx];
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      const width = item.w || img.naturalWidth;
      const height = item.h || img.naturalHeight;
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
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

    resizeCanvas(canvas);

    const handleResize = () => resizeCanvas(canvas);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

      let fractalPoints: FractalPoint[] = [];

      if (canvasRef.current) {
        resizeCanvas(canvasRef.current);
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

          // Persist point cloud to backend and obtain UUID
          let id = '';
          try {
            id = await storePointCloud(
              fractalPoints.map((p) => [p.x, p.y, p.count]),
            );
          } catch (err) {
            console.error('Failed to store point cloud:', err);
            setError('Failed to store point cloud');
            id = 'local'; // fallback marker
          }

          const dataUrl = canvasRef.current.toDataURL('image/png');
          const newItem: GalleryItem = {
            src: dataUrl,
            w: canvasRef.current!.width,
            h: canvasRef.current!.height,
            text: inputText,
            id,
          };

          setGallery((prev) => {
            const newGallery = [newItem, ...prev];
            const galleryToStore = newGallery.map(({ src, w, h, text, id }) => ({ src, w, h, text, id }));
            localStorage.setItem('fractalGallery', JSON.stringify(galleryToStore));
            return newGallery;
          });

          // Set navigation index to the newest item
          setCurrentGalleryIndex(0);
        }
      }
    } catch (err) {
      console.error('Error generating fractal:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setGallery((prev) => {
      const newGallery = [...prev];
      newGallery.splice(idx, 1);
      // Persist lightweight gallery to localStorage
      const galleryToStore = newGallery.map(({ src, w, h, text, id }) => ({ src, w, h, text, id }));
      localStorage.setItem('fractalGallery', JSON.stringify(galleryToStore));
      return newGallery;
    });

    // Update the selected index if needed
    if (idx === currentGalleryIndex) {
      // If the deleted item was selected, clear selection
      setCurrentGalleryIndex(-1);
    } else if (idx < currentGalleryIndex) {
      // If a fractal before the current selection was deleted, adjust the index
      setCurrentGalleryIndex(currentGalleryIndex - 1);
    }
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
    setGallery,
    currentFractalText,
    setCurrentFractalText,
    handleGenerate,
    handleDeleteItem,
    selectedForComparison,
    setSelectedForComparison,
    currentGalleryIndex,
    setCurrentGalleryIndex,
    displayGalleryItem,
  };

  return (
    <FractalContext.Provider value={value}>{children}</FractalContext.Provider>
  );
}; 