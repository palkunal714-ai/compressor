import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Download,
  Eraser,
  Paintbrush,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Eye,
  RotateCcw,
  Sparkles,
  Check,
  Hand,
  Sliders,
  Layers,
  HelpCircle,
  Loader2,
  Info,
  Wand2,
} from 'lucide-react';
import { ImageItem, CompressionSettings } from '../types';
import { removeImageBackground } from '../utils/bgRemover';
import { formatBytes } from '../utils/formatters';

interface ImageTouchUpModalProps {
  item: ImageItem | null;
  onClose: () => void;
  onSave: (itemId: string, updatedBlob: Blob) => void;
  onDownloadSingle?: (item: ImageItem) => void;
  settings?: CompressionSettings;
}

type ToolMode = 'restore' | 'erase' | 'smart' | 'pan';
type BackdropMode = 'checker-dark' | 'checker-light' | 'black' | 'white' | 'green';
type SmartSensitivity = 'soft' | 'balanced' | 'sharp';

export const ImageTouchUpModal: React.FC<ImageTouchUpModalProps> = ({
  item,
  onClose,
  onSave,
  onDownloadSingle,
  settings,
}) => {
  // --- Canvas references ---
  const viewportRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);

  // Offscreen memory canvases for high performance
  const origCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Direct typed-array pixel memory for instant 60fps color analysis
  const origPixelsRef = useRef<Uint8ClampedArray | null>(null);
  const globalBgSamplesRef = useRef<[number, number, number][]>([]);
  const globalFgSamplesRef = useRef<[number, number, number][]>([]);
  const localBgSamplesRef = useRef<[number, number, number][]>([]);
  const localFgSamplesRef = useRef<[number, number, number][]>([]);

  // --- States ---
  const [isReady, setIsReady] = useState(false);
  const [tool, setTool] = useState<ToolMode>('smart');
  const [brushSize, setBrushSize] = useState<number>(36);
  const [brushHardness, setBrushHardness] = useState<number>(0.85); // 0 = soft gradient, 1 = hard edge
  const [brushOpacity, setBrushOpacity] = useState<number>(1);
  const [smartSensitivity, setSmartSensitivity] = useState<SmartSensitivity>('balanced');
  const [backdrop, setBackdrop] = useState<BackdropMode>('checker-dark');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPeekingOriginal, setIsPeekingOriginal] = useState(false);
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isInsideCanvas, setIsInsideCanvas] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isSpaceActive, setIsSpaceActive] = useState(false);

  // History state for Undo/Redo (stored as ImageData arrays)
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);

  // Interaction refs
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isSpacePressedRef = useRef(false);

  // Sample global background & foreground palettes for the Smart Brush
  const refreshColorSamples = useCallback(() => {
    const mask = maskCanvasRef.current;
    const orig = origCanvasRef.current;
    if (!mask || !orig) return;
    const maskCtx = mask.getContext('2d', { willReadFrequently: true });
    if (!maskCtx) return;

    const width = mask.width;
    const height = mask.height;
    const origData = origPixelsRef.current;
    if (!origData) return;

    const maskData = maskCtx.getImageData(0, 0, width, height).data;

    const bgSamples: [number, number, number][] = [];
    const fgSamples: [number, number, number][] = [];

    // 1. Sample 16 perimeter points along the outer borders
    // Perimeter points are background in practically all product & portrait photos
    const perimeterPoints: [number, number][] = [
      [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
      [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
      [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)],
      [Math.floor(width / 4), 0], [Math.floor((3 * width) / 4), 0],
      [Math.floor(width / 4), height - 1], [Math.floor((3 * width) / 4), height - 1],
      [0, Math.floor(height / 4)], [0, Math.floor((3 * height) / 4)],
      [width - 1, Math.floor(height / 4)], [width - 1, Math.floor((3 * height) / 4)],
    ];

    for (const [px, py] of perimeterPoints) {
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const idx = (py * width + px) * 4;
        bgSamples.push([origData[idx], origData[idx + 1], origData[idx + 2]]);
      }
    }

    // 2. Subsample on a 32x32 grid (sub-millisecond scan)
    const stepX = Math.max(1, Math.floor(width / 32));
    const stepY = Math.max(1, Math.floor(height / 32));

    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const idx = (y * width + x) * 4;
        const alpha = maskData[idx + 3];
        const r = origData[idx];
        const g = origData[idx + 1];
        const b = origData[idx + 2];

        if (alpha < 30) {
          if (bgSamples.length < 48) {
            bgSamples.push([r, g, b]);
          }
        } else if (alpha > 220) {
          if (fgSamples.length < 48) {
            fgSamples.push([r, g, b]);
          }
        }
      }
    }

    // Fallback if foreground was not yet isolated: sample center region
    if (fgSamples.length === 0) {
      const cx = Math.floor(width / 2);
      const cy = Math.floor(height / 2);
      const idx = (cy * width + cx) * 4;
      fgSamples.push([origData[idx], origData[idx + 1], origData[idx + 2]]);
    }

    globalBgSamplesRef.current = bgSamples;
    globalFgSamplesRef.current = fgSamples;
  }, []);

  // Sample local neighborhood around the cursor for ultra-high local edge discrimination
  const sampleLocalNeighborhood = useCallback((cx: number, cy: number, radius: number) => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const maskCtx = mask.getContext('2d', { willReadFrequently: true });
    if (!maskCtx) return;

    const width = mask.width;
    const height = mask.height;
    const origData = origPixelsRef.current;
    if (!origData) return;

    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(width - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(height - 1, Math.ceil(cy + radius));
    const regionW = maxX - minX + 1;
    const regionH = maxY - minY + 1;
    if (regionW <= 0 || regionH <= 0) return;

    const maskData = maskCtx.getImageData(minX, minY, regionW, regionH).data;

    const localBg: [number, number, number][] = [];
    const localFg: [number, number, number][] = [];

    const step = Math.max(1, Math.floor(radius / 8));
    for (let y = minY; y <= maxY; y += step) {
      const rowOffset = (y - minY) * regionW;
      for (let x = minX; x <= maxX; x += step) {
        const maskIdx = (rowOffset + (x - minX)) * 4;
        const origIdx = (y * width + x) * 4;
        const alpha = maskData[maskIdx + 3];

        if (alpha < 35 && localBg.length < 24) {
          localBg.push([origData[origIdx], origData[origIdx + 1], origData[origIdx + 2]]);
        } else if (alpha > 220 && localFg.length < 24) {
          localFg.push([origData[origIdx], origData[origIdx + 1], origData[origIdx + 2]]);
        }
      }
    }

    localBgSamplesRef.current = localBg;
    localFgSamplesRef.current = localFg;
  }, []);

  // Composite render: draws original image clipped by mask canvas
  const renderComposite = useCallback(() => {
    const main = mainCanvasRef.current;
    const orig = origCanvasRef.current;
    const mask = maskCanvasRef.current;
    if (!main || !orig || !mask) return;

    const ctx = main.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, main.width, main.height);

    if (isPeekingOriginal) {
      // User is holding 'Peek Original' -> show unaltered full original photo
      ctx.drawImage(orig, 0, 0);
      return;
    }

    // Normal mode: original photo masked by the transparency mask
    ctx.drawImage(orig, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }, [isPeekingOriginal]);

  // Push snapshot to undo history
  const pushHistory = useCallback(() => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const snapshot = ctx.getImageData(0, 0, mask.width, mask.height);
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);

    // Limit history to 25 states to balance RAM and undo depth
    if (newHistory.length >= 25) {
      newHistory.shift();
    }
    newHistory.push(snapshot);
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;

    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  // Undo action
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    ctx.putImageData(snapshot, 0, 0);
    renderComposite();
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    setHasUnsavedChanges(true);
    refreshColorSamples();
  }, [renderComposite, refreshColorSamples]);

  // Redo action
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    ctx.putImageData(snapshot, 0, 0);
    renderComposite();
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    setHasUnsavedChanges(true);
    refreshColorSamples();
  }, [renderComposite, refreshColorSamples]);

  // Auto-fit zoom to viewport
  const handleFitZoom = useCallback(() => {
    if (viewportRef.current && origCanvasRef.current) {
      const vpRect = viewportRef.current.getBoundingClientRect();
      const padding = 60;
      const fitZoom = Math.min(
        1,
        Math.max(
          0.05,
          Math.min(
            (vpRect.width - padding) / origCanvasRef.current.width,
            (vpRect.height - padding) / origCanvasRef.current.height
          )
        )
      );
      setZoom(fitZoom);
      setPan({ x: 0, y: 0 });
    }
  }, []);

  // Initialize and load image onto offscreen canvases
  useEffect(() => {
    if (!item) return;

    let isMounted = true;
    setIsReady(false);
    setHasUnsavedChanges(false);
    historyRef.current = [];
    historyIndexRef.current = -1;
    setCanUndo(false);
    setCanRedo(false);

    const origImg = new Image();
    origImg.crossOrigin = 'anonymous';
    const origUrl = URL.createObjectURL(item.file);
    origImg.src = origUrl;

    origImg.onload = async () => {
      if (!isMounted) return;
      const width = origImg.naturalWidth;
      const height = origImg.naturalHeight;

      // 1. Create Offscreen Original Canvas
      const origCanvas = document.createElement('canvas');
      origCanvas.width = width;
      origCanvas.height = height;
      const origCtx = origCanvas.getContext('2d', { willReadFrequently: true });
      if (origCtx) {
        origCtx.drawImage(origImg, 0, 0);
        origPixelsRef.current = origCtx.getImageData(0, 0, width, height).data;
      }
      origCanvasRef.current = origCanvas;

      // 2. Create Offscreen Mask Canvas
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
      if (!maskCtx) return;

      // Check if we have an existing cutout blob / bg-removed result
      const isCutout = Boolean(item.isBgRemoved || item.hasTouchUp || (item.compressedFormat === 'PNG' && item.compressedBlob));
      const cutoutBlob = isCutout ? item.compressedBlob : null;

      if (cutoutBlob) {
        const cutoutImg = new Image();
        cutoutImg.crossOrigin = 'anonymous';
        const cutoutUrl = URL.createObjectURL(cutoutBlob);
        cutoutImg.src = cutoutUrl;
        await new Promise((resolve) => {
          cutoutImg.onload = () => {
            maskCtx.clearRect(0, 0, width, height);
            maskCtx.drawImage(cutoutImg, 0, 0, width, height);
            try {
              const imgData = maskCtx.getImageData(0, 0, width, height);
              const data = imgData.data;
              let hasTransparency = false;
              for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 250) {
                  hasTransparency = true;
                }
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
              }
              if (hasTransparency) {
                maskCtx.putImageData(imgData, 0, 0);
              } else {
                // If it was completely opaque, make mask 100% white
                maskCtx.fillStyle = '#ffffff';
                maskCtx.fillRect(0, 0, width, height);
              }
            } catch {
              maskCtx.fillStyle = '#ffffff';
              maskCtx.fillRect(0, 0, width, height);
            }
            URL.revokeObjectURL(cutoutUrl);
            resolve(true);
          };
          cutoutImg.onerror = () => {
            maskCtx.fillStyle = '#ffffff';
            maskCtx.fillRect(0, 0, width, height);
            URL.revokeObjectURL(cutoutUrl);
            resolve(true);
          };
        });
      } else {
        // No cutout exists yet: initialize full mask as white (original visible)
        maskCtx.fillStyle = '#ffffff';
        maskCtx.fillRect(0, 0, width, height);
      }

      maskCanvasRef.current = maskCanvas;

      // 3. Set Main Display Canvas dimensions
      const main = mainCanvasRef.current;
      if (main) {
        main.width = width;
        main.height = height;
        const ctx = main.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(origCanvas, 0, 0);
          ctx.globalCompositeOperation = 'destination-in';
          ctx.drawImage(maskCanvas, 0, 0);
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      // Initial color analysis for Smart Brush
      refreshColorSamples();

      // Push initial history snapshot
      pushHistory();

      // Auto-fit zoom to viewport
      if (viewportRef.current) {
        const vpRect = viewportRef.current.getBoundingClientRect();
        const padding = 60;
        const availableW = Math.max(200, vpRect.width - padding);
        const availableH = Math.max(200, vpRect.height - padding);
        const scaleW = availableW / width;
        const scaleH = availableH / height;
        const initialZoom = Math.min(1, Math.max(0.05, Math.min(scaleW, scaleH)));
        setZoom(initialZoom);
        setPan({ x: 0, y: 0 });
      }

      setIsReady(true);
      URL.revokeObjectURL(origUrl);
    };

    return () => {
      isMounted = false;
      URL.revokeObjectURL(origUrl);
    };
  }, [item, pushHistory, refreshColorSamples]);

  useEffect(() => {
    if (isReady && mainCanvasRef.current && origCanvasRef.current && maskCanvasRef.current) {
      const main = mainCanvasRef.current;
      const orig = origCanvasRef.current;
      if (main.width !== orig.width || main.height !== orig.height) {
        main.width = orig.width;
        main.height = orig.height;
      }
      renderComposite();
    }
  }, [isReady, renderComposite]);

  useEffect(() => {
    renderComposite();
  }, [renderComposite, isPeekingOriginal]);

  // SMART BRUSH: Evaluates pixels under the brush and automatically detects
  // whether each pixel belongs to the foreground subject (RESTORES it) or background (REMOVES it)
  const drawSmartBrushPoint = useCallback(
    (cx: number, cy: number) => {
      const mask = maskCanvasRef.current;
      const orig = origCanvasRef.current;
      if (!mask || !orig) return;
      const maskCtx = mask.getContext('2d', { willReadFrequently: true });
      if (!maskCtx) return;

      const width = mask.width;
      const height = mask.height;
      const radius = Math.max(1, Math.round(brushSize / 2));
      const radiusSq = radius * radius;

      const minX = Math.max(0, Math.floor(cx - radius));
      const maxX = Math.min(width - 1, Math.ceil(cx + radius));
      const minY = Math.max(0, Math.floor(cy - radius));
      const maxY = Math.min(height - 1, Math.ceil(cy + radius));
      const regionW = maxX - minX + 1;
      const regionH = maxY - minY + 1;
      if (regionW <= 0 || regionH <= 0) return;

      const origData = origPixelsRef.current;
      if (!origData) return;

      const maskImgData = maskCtx.getImageData(minX, minY, regionW, regionH);
      const maskData = maskImgData.data;

      const bgSamples = globalBgSamplesRef.current;
      const fgSamples = globalFgSamplesRef.current;
      const localBg = localBgSamplesRef.current;
      const localFg = localFgSamplesRef.current;

      // Sensitivity tuning: controls how aggressively edges snap or feather
      const edgeThreshold = smartSensitivity === 'sharp' ? 1.08 : smartSensitivity === 'soft' ? 1.25 : 1.15;
      const falloffStart = brushHardness * radius;

      let changed = false;

      for (let y = minY; y <= maxY; y++) {
        const dy = y - cy;
        const rowOffset = (y - minY) * regionW;

        for (let x = minX; x <= maxX; x++) {
          const dx = x - cx;
          const distSq = dx * dx + dy * dy;
          if (distSq > radiusSq) continue;

          const maskIdx = (rowOffset + (x - minX)) * 4;
          const origIdx = (y * width + x) * 4;

          const pr = origData[origIdx];
          const pg = origData[origIdx + 1];
          const pb = origData[origIdx + 2];
          const currentAlpha = maskData[maskIdx + 3];

          // Compute distance to background samples (local samples weighted 0.8 to give local precedence)
          let minBgDistSq = Infinity;
          for (let i = 0; i < localBg.length; i++) {
            const s = localBg[i];
            const dr = pr - s[0];
            const dg = pg - s[1];
            const db = pb - s[2];
            const d = (2 * dr * dr + 4 * dg * dg + 3 * db * db) * 0.8;
            if (d < minBgDistSq) minBgDistSq = d;
          }
          for (let i = 0; i < bgSamples.length; i++) {
            const s = bgSamples[i];
            const dr = pr - s[0];
            const dg = pg - s[1];
            const db = pb - s[2];
            const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
            if (d < minBgDistSq) minBgDistSq = d;
          }

          // Compute distance to foreground samples
          let minFgDistSq = Infinity;
          for (let i = 0; i < localFg.length; i++) {
            const s = localFg[i];
            const dr = pr - s[0];
            const dg = pg - s[1];
            const db = pb - s[2];
            const d = (2 * dr * dr + 4 * dg * dg + 3 * db * db) * 0.8;
            if (d < minFgDistSq) minFgDistSq = d;
          }
          for (let i = 0; i < fgSamples.length; i++) {
            const s = fgSamples[i];
            const dr = pr - s[0];
            const dg = pg - s[1];
            const db = pb - s[2];
            const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
            if (d < minFgDistSq) minFgDistSq = d;
          }

          const distBg = Math.sqrt(minBgDistSq);
          const distFg = Math.sqrt(minFgDistSq);

          let targetAlpha: number;
          if (distBg > distFg * edgeThreshold) {
            // Pixel matches foreground subject -> RESTORE
            targetAlpha = 255;
          } else if (distFg > distBg * edgeThreshold) {
            // Pixel matches background -> REMOVE
            targetAlpha = 0;
          } else {
            // Transition boundary / soft feather
            const factor = (distBg - distFg) / (distBg + distFg + 0.0001); // -1 to 1
            targetAlpha = Math.round(128 + factor * 180);
            targetAlpha = Math.max(0, Math.min(255, targetAlpha));
          }

          // Radial feather falloff according to brush edge hardness
          const dist = Math.sqrt(distSq);
          let radialWeight = 1;
          if (dist > falloffStart && radius > falloffStart) {
            radialWeight = 1 - (dist - falloffStart) / (radius - falloffStart);
            radialWeight = Math.max(0, Math.min(1, radialWeight));
          }

          const finalAlpha = Math.round(currentAlpha * (1 - radialWeight) + targetAlpha * radialWeight);
          if (maskData[maskIdx + 3] !== finalAlpha) {
            maskData[maskIdx] = 255;
            maskData[maskIdx + 1] = 255;
            maskData[maskIdx + 2] = 255;
            maskData[maskIdx + 3] = finalAlpha;
            changed = true;
          }
        }
      }

      if (changed) {
        maskCtx.putImageData(maskImgData, minX, minY);
      }
    },
    [brushSize, brushHardness, smartSensitivity]
  );

  // Standard Erase or Restore Brush Point
  const drawStandardBrushPoint = useCallback(
    (x: number, y: number) => {
      const mask = maskCanvasRef.current;
      if (!mask) return;
      const ctx = mask.getContext('2d');
      if (!ctx) return;

      const radius = brushSize / 2;
      ctx.save();

      if (tool === 'erase') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        // restore
        ctx.globalCompositeOperation = 'source-over';
      }

      if (brushHardness >= 0.95) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${brushOpacity})`;
        ctx.fill();
      } else {
        const grad = ctx.createRadialGradient(x, y, radius * brushHardness, x, y, radius);
        grad.addColorStop(0, `rgba(255, 255, 255, ${brushOpacity})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },
    [brushSize, brushHardness, brushOpacity, tool]
  );

  // Dispatch brush stamp depending on tool mode
  const drawBrushPoint = useCallback(
    (x: number, y: number) => {
      if (tool === 'smart') {
        drawSmartBrushPoint(x, y);
      } else {
        drawStandardBrushPoint(x, y);
      }
    },
    [tool, drawSmartBrushPoint, drawStandardBrushPoint]
  );

  // Interpolate brush line between lastPoint and currentPoint for silky-smooth continuous strokes
  const drawBrushStroke = useCallback(
    (x1: number, y1: number, x2: number, y2: number) => {
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const step = tool === 'smart'
        ? Math.max(2, (brushSize / 2) * 0.35)
        : Math.max(1, (brushSize / 2) * (1 - brushHardness * 0.5) * 0.4);

      if (dist === 0) {
        drawBrushPoint(x2, y2);
        return;
      }

      const steps = Math.ceil(dist / step);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const interpX = x1 + (x2 - x1) * t;
        const interpY = y1 + (y2 - y1) * t;
        drawBrushPoint(interpX, interpY);
      }
    },
    [brushSize, brushHardness, tool, drawBrushPoint]
  );

  // Coordinate mapper from screen pointer event to canvas pixel coordinates
  const getCanvasCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x, y };
  }, []);

  // Save changes
  const handleSave = useCallback(() => {
    const main = mainCanvasRef.current;
    if (!main || !item) return;

    main.toBlob((blob) => {
      if (blob) {
        onSave(item.id, blob);
        setHasUnsavedChanges(false);
        onClose();
      }
    }, 'image/png');
  }, [item, onSave, onClose]);

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // If middle click or space pressed or Pan tool active -> start panning
    if (e.button === 1 || isSpacePressedRef.current || tool === 'pan') {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      return;
    }

    if (e.button !== 0) return; // Only primary button for brush

    isDrawingRef.current = true;
    const { x, y } = getCanvasCoords(e);
    lastPointRef.current = { x, y };

    if (tool === 'smart') {
      sampleLocalNeighborhood(x, y, brushSize * 1.6);
    }

    drawBrushPoint(x, y);
    renderComposite();

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setCursorPos({ x: e.clientX, y: e.clientY });

    if (isPanningRef.current) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    if (!isDrawingRef.current) return;

    const { x, y } = getCanvasCoords(e);
    if (lastPointRef.current) {
      drawBrushStroke(lastPointRef.current.x, lastPointRef.current.y, x, y);
    } else {
      drawBrushPoint(x, y);
    }
    lastPointRef.current = { x, y };

    renderComposite();
    setHasUnsavedChanges(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      return;
    }

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      pushHistory();
      refreshColorSamples();
    }
  };

  // Global window pointerup to catch mouse releases outside the canvas
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
      }
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        lastPointRef.current = null;
        pushHistory();
        refreshColorSamples();
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [pushHistory, refreshColorSamples]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.min(5, Math.max(0.15, prev * zoomFactor)));
  };

  // Ref-based handlers to prevent any stale closures for key listeners
  const handlersRef = useRef({
    handleUndo,
    handleRedo,
    handleSave,
    onClose,
    setTool,
    setBrushSize,
    setIsPeekingOriginal,
    handleFitZoom,
  });

  useEffect(() => {
    handlersRef.current = {
      handleUndo,
      handleRedo,
      handleSave,
      onClose,
      setTool,
      setBrushSize,
      setIsPeekingOriginal,
      handleFitZoom,
    };
  });

  // Keyboard shortcuts - Robust layout-independent implementation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only block shortcuts if the user is typing into an editable text field
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.isContentEditable ||
          target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button', 'color'].includes((target as HTMLInputElement).type)));
      if (isEditable) return;

      const key = e.key ? e.key.toLowerCase() : '';
      const code = e.code;
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // Undo: Ctrl+Z / Cmd+Z
      if (isCtrlOrMeta && (key === 'z' || code === 'KeyZ')) {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          handlersRef.current.handleRedo();
        } else {
          handlersRef.current.handleUndo();
        }
        return;
      }

      // Redo: Ctrl+Y / Cmd+Y
      if (isCtrlOrMeta && (key === 'y' || code === 'KeyY')) {
        e.preventDefault();
        e.stopPropagation();
        handlersRef.current.handleRedo();
        return;
      }

      // Save: Ctrl+S / Cmd+S
      if (isCtrlOrMeta && (key === 's' || code === 'KeyS')) {
        e.preventDefault();
        e.stopPropagation();
        handlersRef.current.handleSave();
        return;
      }

      // Spacebar for temporary pan
      if (code === 'Space' || key === ' ') {
        e.preventDefault();
        if (!isSpacePressedRef.current) {
          isSpacePressedRef.current = true;
          setIsSpaceActive(true);
        }
        return;
      }

      // Tool switches (when Ctrl/Cmd is not held)
      if (!isCtrlOrMeta) {
        if (key === 's' || code === 'KeyS' || key === 'b' || code === 'KeyB' || key === '3') {
          handlersRef.current.setTool('smart');
          return;
        }
        if (key === 'r' || code === 'KeyR' || key === '1') {
          handlersRef.current.setTool('restore');
          return;
        }
        if (key === 'e' || code === 'KeyE' || key === '2') {
          handlersRef.current.setTool('erase');
          return;
        }
        if (key === 'h' || code === 'KeyH' || key === '4') {
          handlersRef.current.setTool('pan');
          return;
        }
        if (key === 'o' || code === 'KeyO') {
          handlersRef.current.setIsPeekingOriginal((p) => !p);
          return;
        }
        if (key === 'f' || code === 'KeyF' || key === '0') {
          e.preventDefault();
          handlersRef.current.handleFitZoom();
          return;
        }
      }

      // Brush sizing: [ and ] or - and +
      if (key === '[' || key === '{' || key === '-') {
        e.preventDefault();
        handlersRef.current.setBrushSize((s) => Math.max(2, s - (e.shiftKey ? 15 : 5)));
        return;
      }
      if (key === ']' || key === '}' || key === '=' || key === '+') {
        e.preventDefault();
        handlersRef.current.setBrushSize((s) => Math.min(200, s + (e.shiftKey ? 15 : 5)));
        return;
      }

      // Close modal: Escape
      if (key === 'escape' || code === 'Escape') {
        e.preventDefault();
        handlersRef.current.onClose();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        isSpacePressedRef.current = false;
        setIsSpaceActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, []);

  // Reset actions
  const handleRestoreAll = () => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, mask.width, mask.height);
    renderComposite();
    pushHistory();
    refreshColorSamples();
    setHasUnsavedChanges(true);
  };

  const handleClearAll = () => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, mask.width, mask.height);
    renderComposite();
    pushHistory();
    refreshColorSamples();
    setHasUnsavedChanges(true);
  };

  const handleInvertMask = () => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, mask.width, mask.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i + 3] = 255 - data[i + 3];
    }
    ctx.putImageData(imgData, 0, 0);
    renderComposite();
    pushHistory();
    refreshColorSamples();
    setHasUnsavedChanges(true);
  };

  // Re-run auto background removal inside the modal
  const handleReRunAutoBg = async (engine: 'studio' | 'ai') => {
    if (!item || isAutoProcessing) return;
    setIsAutoProcessing(true);

    try {
      const blob = await removeImageBackground(item.file, {
        engine,
        tolerance: settings?.bgTolerance ?? 32,
        feather: settings?.bgFeather ?? 1.5,
        aiModel: settings?.bgAiModel ?? 'small',
        aiDevice: settings?.bgAiDevice ?? 'gpu',
      });

      const cutoutImg = new Image();
      const cutoutUrl = URL.createObjectURL(blob);
      cutoutImg.src = cutoutUrl;
      await new Promise((resolve) => {
        cutoutImg.onload = () => {
          const mask = maskCanvasRef.current;
          if (mask) {
            const maskCtx = mask.getContext('2d');
            if (maskCtx) {
              maskCtx.clearRect(0, 0, mask.width, mask.height);
              maskCtx.drawImage(cutoutImg, 0, 0, mask.width, mask.height);
              maskCtx.globalCompositeOperation = 'source-in';
              maskCtx.fillStyle = '#ffffff';
              maskCtx.fillRect(0, 0, mask.width, mask.height);
              maskCtx.globalCompositeOperation = 'source-over';
              renderComposite();
              pushHistory();
              refreshColorSamples();
              setHasUnsavedChanges(true);
            }
          }
          URL.revokeObjectURL(cutoutUrl);
          resolve(true);
        };
        cutoutImg.onerror = () => {
          URL.revokeObjectURL(cutoutUrl);
          resolve(true);
        };
      });
    } catch (err: any) {
      console.error('Auto BG re-run failed:', err);
    } finally {
      setIsAutoProcessing(false);
    }
  };

  // Direct download PNG now
  const handleDownloadNow = () => {
    const main = mainCanvasRef.current;
    if (!main || !item) return;

    main.toBlob((blob) => {
      if (blob) {
        const link = document.createElement('a');
        const filename = (item.outputFilename || item.name).replace(/\.[^/.]+$/, '') + '-cutout.png';
        link.download = filename;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      }
    }, 'image/png');
  };

  if (!item) return null;

  // Compute cursor ring dimensions in screen pixels
  const getScreenBrushSize = () => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return brushSize;
    const rect = canvas.getBoundingClientRect();
    const ratio = rect.width / canvas.width;
    return Math.max(4, brushSize * ratio);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md select-none animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0c0c0c] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-6xl h-[95vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 bg-slate-50 dark:bg-[#080808] shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500/20 via-purple-500/20 to-indigo-500/20 border border-fuchsia-500/30 text-fuchsia-500 flex items-center justify-center shrink-0">
              <Wand2 className="w-4 h-4 text-fuchsia-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  Cutout Touch-Up: {item.outputFilename || item.name}
                </h3>
                {hasUnsavedChanges && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-500/30">
                    Modified
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-white/40 truncate hidden sm:block">
                Use <strong className="text-fuchsia-500 dark:text-fuchsia-400">Smart Brush</strong> to auto-detect what to restore & remove, or manual{' '}
                <strong className="text-emerald-500">Restore</strong> and <strong className="text-red-500">Erase</strong>.
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Hold to Peek Original */}
            <button
              type="button"
              onMouseDown={() => setIsPeekingOriginal(true)}
              onMouseUp={() => setIsPeekingOriginal(false)}
              onMouseLeave={() => setIsPeekingOriginal(false)}
              onTouchStart={() => setIsPeekingOriginal(true)}
              onTouchEnd={() => setIsPeekingOriginal(false)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isPeekingOriginal
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 border-slate-300 dark:border-white/10'
              }`}
              title="Hold to view original photo (or hold O)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Peek Original</span>
            </button>

            {/* Direct Download PNG */}
            <button
              type="button"
              onClick={handleDownloadNow}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 border border-slate-300 dark:border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download current cutout as PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Download PNG</span>
            </button>

            {/* Apply & Save Button */}
            <button
              type="button"
              onClick={handleSave}
              className="px-3 sm:px-4 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 active:opacity-90 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-fuchsia-600/25 cursor-pointer"
              title="Apply changes (Ctrl+S)"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Changes</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Secondary Control Bar (Tool selection, brush sizing, undo/redo, backdrop) */}
        <div className="px-3 sm:px-4 py-2 border-b border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-[#111] flex items-center justify-between gap-3 overflow-x-auto shrink-0 text-xs">
          {/* Tool Modes */}
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-white/5 p-1 rounded-xl border border-slate-300/80 dark:border-white/10">
            {/* Smart Brush Button */}
            <button
              type="button"
              onClick={() => setTool('smart')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                tool === 'smart'
                  ? 'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 text-white shadow-md shadow-fuchsia-600/30'
                  : 'text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
              }`}
              title="Smart AI Brush (S or 3): Detects what to restore & what to remove automatically in one stroke"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Smart Brush</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-white/20 text-white uppercase font-black tracking-wider">AI</span>
            </button>

            {/* Restore Brush Button */}
            <button
              type="button"
              onClick={() => setTool('restore')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                tool === 'restore'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
              }`}
              title="Restore Subject Brush (R or 1): Paints back original photo pixels"
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>Restore</span>
            </button>

            {/* Erase Brush Button */}
            <button
              type="button"
              onClick={() => setTool('erase')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                tool === 'erase'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
              }`}
              title="Erase Background Brush (E or 2): Removes background to transparent"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Erase</span>
            </button>

            {/* Pan Hand Tool Button */}
            <button
              type="button"
              onClick={() => setTool('pan')}
              className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                tool === 'pan'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
              }`}
              title="Pan Tool (H, 4, or Spacebar+Drag)"
            >
              <Hand className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pan</span>
            </button>
          </div>

          {/* Brush Settings: Size & Mode/Edge */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {/* Size Slider */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-white/50 font-medium">Size:</span>
              <input
                type="range"
                min="2"
                max="160"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                onPointerUp={(e) => (e.target as HTMLElement).blur()}
                className="w-20 sm:w-28 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full appearance-none cursor-pointer accent-fuchsia-600 dark:accent-fuchsia-500"
              />
              <span className="font-mono font-bold text-fuchsia-600 dark:text-fuchsia-400 w-8 text-right">
                {brushSize}px
              </span>
            </div>

            {/* Smart Sensitivity Pills (When Smart Brush active) */}
            {tool === 'smart' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-white/50 font-medium hidden sm:inline">Smart Mode:</span>
                <div className="flex items-center bg-slate-200/80 dark:bg-white/10 rounded-lg p-0.5 border border-slate-300/80 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setSmartSensitivity('soft')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      smartSensitivity === 'soft'
                        ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Soft feathering for hair, fur, transparent lace & complex textiles"
                  >
                    Soft / Hair
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmartSensitivity('balanced')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      smartSensitivity === 'balanced'
                        ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Balanced detection for products, clothes, and portraits"
                  >
                    Balanced
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmartSensitivity('sharp')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      smartSensitivity === 'sharp'
                        ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Crisp edge snapping for hard objects, jewelry, gadgets"
                  >
                    Sharp
                  </button>
                </div>
              </div>
            ) : (
              /* Hardness / Feather for Manual Brushes */
              <div className="hidden md:flex items-center gap-2">
                <span className="text-slate-500 dark:text-white/50 font-medium">Edge:</span>
                <button
                  type="button"
                  onClick={() => setBrushHardness(0.2)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer border ${
                    brushHardness < 0.5
                      ? 'bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/30'
                      : 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-white/60 border-transparent'
                  }`}
                  title="Soft feathered edge"
                >
                  Soft
                </button>
                <button
                  type="button"
                  onClick={() => setBrushHardness(0.85)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer border ${
                    brushHardness >= 0.5 && brushHardness < 0.95
                      ? 'bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/30'
                      : 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-white/60 border-transparent'
                  }`}
                  title="Balanced anti-aliased edge"
                >
                  Balanced
                </button>
                <button
                  type="button"
                  onClick={() => setBrushHardness(1)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer border ${
                    brushHardness >= 0.95
                      ? 'bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/30'
                      : 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-white/60 border-transparent'
                  }`}
                  title="Crisp hard edge"
                >
                  Hard
                </button>
              </div>
            )}
          </div>

          {/* Undo, Redo, Zoom & Backdrop Mode */}
          <div className="flex items-center gap-2">
            {/* Undo / Redo */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!canUndo}
                onClick={handleUndo}
                className="p-1.5 rounded-lg bg-slate-200/80 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-white/70 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={!canRedo}
                onClick={handleRedo}
                className="p-1.5 rounded-lg bg-slate-200/80 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-white/70 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-4 w-[1px] bg-slate-300 dark:bg-white/10 hidden sm:block" />

            {/* Backdrop Color Swatches */}
            <div className="flex items-center gap-1" title="Stage background preview color">
              <button
                type="button"
                onClick={() => setBackdrop('checker-dark')}
                className={`w-5 h-5 rounded-full border bg-transparency-grid cursor-pointer ${
                  backdrop === 'checker-dark' ? 'ring-2 ring-fuchsia-500 border-white' : 'border-slate-300 dark:border-white/20'
                }`}
                title="Dark Checkerboard"
              />
              <button
                type="button"
                onClick={() => setBackdrop('checker-light')}
                className={`w-5 h-5 rounded-full border bg-transparency-grid-light cursor-pointer ${
                  backdrop === 'checker-light' ? 'ring-2 ring-fuchsia-500 border-slate-900' : 'border-slate-300 dark:border-white/20'
                }`}
                title="Light Checkerboard"
              />
              <button
                type="button"
                onClick={() => setBackdrop('black')}
                className={`w-5 h-5 rounded-full border bg-black cursor-pointer ${
                  backdrop === 'black' ? 'ring-2 ring-fuchsia-500 border-white' : 'border-slate-300 dark:border-white/20'
                }`}
                title="Solid Black (reveals white halos)"
              />
              <button
                type="button"
                onClick={() => setBackdrop('white')}
                className={`w-5 h-5 rounded-full border bg-white cursor-pointer ${
                  backdrop === 'white' ? 'ring-2 ring-fuchsia-500 border-slate-900' : 'border-slate-300 dark:border-white/20'
                }`}
                title="Solid White (reveals dark artifacts)"
              />
              <button
                type="button"
                onClick={() => setBackdrop('green')}
                className={`w-5 h-5 rounded-full border bg-[#00ff40] cursor-pointer ${
                  backdrop === 'green' ? 'ring-2 ring-fuchsia-500 border-white' : 'border-slate-300 dark:border-white/20'
                }`}
                title="Chroma Green"
              />
            </div>

            <div className="h-4 w-[1px] bg-slate-300 dark:bg-white/10 hidden sm:block" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-white/5 p-0.5 rounded-lg border border-slate-300/80 dark:border-white/10">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.05, z - 0.2))}
                className="p-1 rounded hover:bg-white/50 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="px-1 text-[10px] font-mono text-slate-700 dark:text-white/70 hover:underline cursor-pointer"
                title="Reset zoom to 100%"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={handleFitZoom}
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-700 dark:text-white/70 hover:bg-white/50 dark:hover:bg-white/10 cursor-pointer"
                title="Fit image to screen (F or 0)"
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(5, z + 0.2))}
                className="p-1 rounded hover:bg-white/50 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Interactive Canvas Area */}
        <div
          ref={viewportRef}
          onWheel={handleWheel}
          className={`relative flex-1 w-full h-full overflow-hidden flex items-center justify-center transition-colors ${
            isSpaceActive || tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
          } ${
            backdrop === 'checker-dark'
              ? 'bg-transparency-grid'
              : backdrop === 'checker-light'
              ? 'bg-transparency-grid-light'
              : backdrop === 'black'
              ? 'bg-black'
              : backdrop === 'white'
              ? 'bg-white'
              : 'bg-[#00ff40]'
          }`}
          onPointerEnter={() => setIsInsideCanvas(true)}
          onPointerLeave={() => {
            setIsInsideCanvas(false);
            setCursorPos(null);
          }}
        >
          {/* Always mounted canvas wrapper */}
          <div
            className="relative transition-transform duration-75 select-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              visibility: isReady ? 'visible' : 'hidden',
            }}
          >
            <canvas
              ref={mainCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="block shadow-2xl rounded-xs touch-none"
            />
          </div>

          {!isReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-xs text-slate-300 z-10 pointer-events-none">
              <Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" />
              <span className="text-xs font-medium">Preparing smart cutout canvas...</span>
            </div>
          )}

          {/* Dynamic Brush Ring Follower */}
          {isInsideCanvas && cursorPos && tool !== 'pan' && !isSpaceActive && (
            <div
              className="fixed pointer-events-none -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-transform duration-0 z-50 flex items-center justify-center"
              style={{
                left: `${cursorPos.x}px`,
                top: `${cursorPos.y}px`,
                width: `${getScreenBrushSize()}px`,
                height: `${getScreenBrushSize()}px`,
                borderColor:
                  tool === 'smart'
                    ? 'rgba(217, 70, 239, 0.95)' // Fuchsia for Smart Brush
                    : tool === 'erase'
                    ? 'rgba(239, 68, 68, 0.9)' // Red for Erase
                    : 'rgba(16, 185, 129, 0.9)', // Emerald for Restore
                backgroundColor:
                  tool === 'smart'
                    ? 'rgba(168, 85, 247, 0.15)'
                    : tool === 'erase'
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(16, 185, 129, 0.12)',
                boxShadow:
                  tool === 'smart'
                    ? '0 0 12px rgba(217, 70, 239, 0.6), inset 0 0 6px rgba(168, 85, 247, 0.4)'
                    : tool === 'erase'
                    ? '0 0 8px rgba(239, 68, 68, 0.5)'
                    : '0 0 8px rgba(16, 185, 129, 0.5)',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    tool === 'smart'
                      ? '#d946ef'
                      : tool === 'erase'
                      ? '#ef4444'
                      : '#10b981',
                }}
              />
            </div>
          )}

          {/* Quick Actions Floating Overlay */}
          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-black/75 backdrop-blur-md p-1.5 rounded-xl border border-white/10 text-white z-20">
            <button
              type="button"
              onClick={handleRestoreAll}
              className="px-2.5 py-1 rounded-lg hover:bg-white/10 text-[11px] font-semibold text-white/90 hover:text-white transition-colors cursor-pointer"
              title="Reveal 100% of original photo"
            >
              Restore All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1 rounded-lg hover:bg-white/10 text-[11px] font-semibold text-white/90 hover:text-white transition-colors cursor-pointer"
              title="Erase all pixels to transparent"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={handleInvertMask}
              className="px-2.5 py-1 rounded-lg hover:bg-white/10 text-[11px] font-semibold text-white/90 hover:text-white transition-colors cursor-pointer"
              title="Invert background and subject"
            >
              Invert
            </button>

            <div className="h-3.5 w-[1px] bg-white/20 mx-0.5" />

            {/* Quick Auto BG Re-run */}
            <button
              type="button"
              disabled={isAutoProcessing}
              onClick={() => handleReRunAutoBg('studio')}
              className="px-2.5 py-1 rounded-lg bg-fuchsia-600/30 hover:bg-fuchsia-600/50 text-fuchsia-300 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40"
              title="Re-run fast Studio perimeter flood removal"
            >
              {isAutoProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              <span>Auto Studio</span>
            </button>

            <button
              type="button"
              disabled={isAutoProcessing}
              onClick={() => handleReRunAutoBg('ai')}
              className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40"
              title="Re-run deep learning neural model removal"
            >
              {isAutoProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              <span>Auto AI</span>
            </button>
          </div>

          {/* Quick Help & Shortcuts Toggle */}
          <div className="absolute bottom-4 right-4 z-20">
            <button
              type="button"
              onClick={() => setShowShortcuts((s) => !s)}
              className="p-2 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-black/90 transition-colors cursor-pointer"
              title="Keyboard Shortcuts & Tips"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {showShortcuts && (
              <div className="absolute bottom-11 right-0 w-80 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl p-3.5 text-white text-xs shadow-2xl animate-fade-in">
                <div className="font-bold mb-2.5 text-fuchsia-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>Touch-Up Shortcuts</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-white/80">
                  <div className="flex justify-between items-center">
                    <span className="text-fuchsia-300 font-semibold">Smart Brush (AI Auto):</span>
                    <kbd className="font-mono bg-fuchsia-500/25 text-fuchsia-200 px-1.5 py-0.5 rounded text-[10px]">S or 3</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Restore Subject:</span>
                    <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">R or 1</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Erase Background:</span>
                    <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">E or 2</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Pan Hand Tool:</span>
                    <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">H, 4, or Space+Drag</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Brush Size:</span>
                    <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">[ ] or - +</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Peek Original:</span>
                    <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Hold O or Peek</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-300 font-semibold">Undo / Redo:</span>
                    <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Ctrl+Z / Ctrl+Y</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Save & Apply:</span>
                    <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Ctrl+S</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Fit to Screen:</span>
                    <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">F or 0</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Zoom In / Out:</span>
                    <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Mouse Wheel</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Close Editor:</span>
                    <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Escape</kbd>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
