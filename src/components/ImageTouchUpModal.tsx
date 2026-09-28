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

type ToolMode = 'restore' | 'erase' | 'pan';
type BackdropMode = 'checker-dark' | 'checker-light' | 'black' | 'white' | 'green';
type SmartSensitivity = 'soft' | 'balanced' | 'sharp';

// High-accuracy perceptual Redmean color distance (0 = identical, 765 = maximum contrast)
const getPerceptualColorDist = (
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number => {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  const rMean = (r1 + r2) * 0.5;
  const wR = 2 + rMean / 256;
  const wG = 4.0;
  const wB = 2 + (255 - rMean) / 256;
  return Math.sqrt(wR * dr * dr + wG * dg * dg + wB * db * db);
};

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
  const strokeSeedColorRef = useRef<[number, number, number] | null>(null);
  const recentEraseColorsRef = useRef<[number, number, number][]>([]);
  const recentRestoreColorsRef = useRef<[number, number, number][]>([]);

  // --- States ---
  const [isReady, setIsReady] = useState(false);
  const [tool, setTool] = useState<ToolMode>('restore');
  const [isSmartAi, setIsSmartAi] = useState<boolean>(true);
  const [isMagicWand, setIsMagicWand] = useState<boolean>(false);
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

  // Sample smoothed 3x3 RGB color from original photo at canvas coordinates
  const sampleColorAt = useCallback((canvasX: number, canvasY: number): [number, number, number] | null => {
    const origData = origPixelsRef.current;
    const origCanvas = origCanvasRef.current;
    if (!origData || !origCanvas) return null;
    const w = origCanvas.width;
    const h = origCanvas.height;
    const px = Math.min(w - 1, Math.max(0, Math.round(canvasX)));
    const py = Math.min(h - 1, Math.max(0, Math.round(canvasY)));

    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = py + dy;
      if (ny < 0 || ny >= h) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx;
        if (nx < 0 || nx >= w) continue;
        const idx = (ny * w + nx) * 4;
        rSum += origData[idx];
        gSum += origData[idx + 1];
        bSum += origData[idx + 2];
        count++;
      }
    }
    return count > 0 ? [Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count)] : null;
  }, []);

  // Sample global background palettes from verified transparent pixels and corners
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

    // 1. Subsample any pixels that have ALREADY been erased to transparent (alpha < 35)
    // These are 100% verified background colors chosen by AI or user erasure
    const stepX = Math.max(1, Math.floor(width / 32));
    const stepY = Math.max(1, Math.floor(height / 32));

    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const idx = (y * width + x) * 4;
        const alpha = maskData[idx + 3];
        if (alpha < 35 && bgSamples.length < 64) {
          bgSamples.push([origData[idx], origData[idx + 1], origData[idx + 2]]);
        }
      }
    }

    // 2. Only if the image has verified transparent background, we can safely sample transparent perimeter pixels
    // If the image is 100% opaque (not done by AI yet), we do NOT guess perimeter points because they can hit shoes, hair, hands
    if (bgSamples.length > 0) {
      const cornerPoints: [number, number][] = [
        [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]
      ];
      for (const [px, py] of cornerPoints) {
        const idx = (py * width + px) * 4;
        if (maskData[idx + 3] < 35) {
          bgSamples.push([origData[idx], origData[idx + 1], origData[idx + 2]]);
        }
      }
    }

    globalBgSamplesRef.current = bgSamples;
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
        setTool('erase');
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

        // Set initial brush size that feels like ~42px on screen regardless of image resolution
        const initialBrush = Math.max(16, Math.min(300, Math.round(42 / initialZoom)));
        setBrushSize(initialBrush);
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

  // High-speed, high-precision Magic Wand Flood Fill (Edge-aware contour barrier)
  const executeMagicWand = useCallback(
    (startX: number, startY: number, mode: 'restore' | 'erase') => {
      const mask = maskCanvasRef.current;
      const orig = origCanvasRef.current;
      if (!mask || !orig) return;
      const maskCtx = mask.getContext('2d', { willReadFrequently: true });
      if (!maskCtx) return;

      const width = mask.width;
      const height = mask.height;
      const origData = origPixelsRef.current;
      if (!origData) return;

      const px = Math.min(width - 1, Math.max(0, Math.round(startX)));
      const py = Math.min(height - 1, Math.max(0, Math.round(startY)));
      const startIdx = (py * width + px) * 4;

      // Exact clicked pixel color from original photo
      const targetR = origData[startIdx];
      const targetG = origData[startIdx + 1];
      const targetB = origData[startIdx + 2];

      // Precise tolerance calibration:
      // Sharp: 20 (strict outline retention)
      // Balanced: 32 (clean subject/background separation without bleeding)
      // Soft: 48 (accommodates subtle gradients and shadows)
      const tolerance = smartSensitivity === 'sharp' ? 20 : smartSensitivity === 'soft' ? 48 : 32;
      const edgeMultiplier = 1.35;

      const maskImgData = maskCtx.getImageData(0, 0, width, height);
      const maskData = maskImgData.data;

      const totalPixels = width * height;
      const visited = new Uint8Array(totalPixels);
      const queue = new Int32Array(totalPixels);
      let head = 0;
      let tail = 0;

      const startPos = py * width + px;
      visited[startPos] = 1;
      queue[tail++] = startPos;

      const bgSamples = globalBgSamplesRef.current;

      while (head < tail) {
        const curr = queue[head++];
        const cx = curr % width;
        const cy = (curr / width) | 0;
        const idx = curr * 4;

        const pr = origData[idx];
        const pg = origData[idx + 1];
        const pb = origData[idx + 2];

        // Apply action to current pixel
        if (mode === 'erase') {
          maskData[idx + 3] = 0;
        } else {
          maskData[idx] = 255;
          maskData[idx + 1] = 255;
          maskData[idx + 2] = 255;
          maskData[idx + 3] = 255;
        }

        // Test neighbor for flood expansion with edge-barrier protection
        const checkNeighbor = (nPos: number) => {
          if (visited[nPos]) return;
          const nIdx = nPos * 4;
          const nr = origData[nIdx];
          const ng = origData[nIdx + 1];
          const nb = origData[nIdx + 2];

          // 1. Edge-barrier: if local contrast jump between current pixel and neighbor is sharp (> 44),
          // this is an object contour boundary: stop flood fill to prevent leaking into subject!
          const localJump = getPerceptualColorDist(pr, pg, pb, nr, ng, nb);
          if (localJump > 44) return;

          // 2. Global distance to clicked target color
          const distToTarget = getPerceptualColorDist(nr, ng, nb, targetR, targetG, targetB);

          // 3. If Smart AI is ON, protect against leaking into known background during restore
          if (isSmartAi && mode === 'restore' && bgSamples.length > 0) {
            let minBgDist = Infinity;
            for (let i = 0; i < bgSamples.length; i++) {
              const bg = bgSamples[i];
              const d = getPerceptualColorDist(nr, ng, nb, bg[0], bg[1], bg[2]);
              if (d < minBgDist) minBgDist = d;
            }
            if (minBgDist < 20 && minBgDist < distToTarget) {
              return; // Do not leak into background
            }
          }

          if (distToTarget <= tolerance) {
            visited[nPos] = 1;
            queue[tail++] = nPos;
          } else if (distToTarget < tolerance * edgeMultiplier) {
            // Anti-aliased boundary feathering
            visited[nPos] = 1;
            const factor = (distToTarget - tolerance) / (tolerance * (edgeMultiplier - 1));
            if (mode === 'erase') {
              maskData[nIdx + 3] = Math.min(maskData[nIdx + 3], Math.round(255 * factor));
            } else {
              const restoreAlpha = Math.round(255 * (1 - factor));
              maskData[nIdx] = 255;
              maskData[nIdx + 1] = 255;
              maskData[nIdx + 2] = 255;
              maskData[nIdx + 3] = Math.max(maskData[nIdx + 3], restoreAlpha);
            }
          }
        };

        if (cx > 0) checkNeighbor(curr - 1);
        if (cx < width - 1) checkNeighbor(curr + 1);
        if (cy > 0) checkNeighbor(curr - width);
        if (cy < height - 1) checkNeighbor(curr + width);
      }

      maskCtx.putImageData(maskImgData, 0, 0);
      renderComposite();
      pushHistory();
      refreshColorSamples();
      setHasUnsavedChanges(true);
    },
    [isSmartAi, smartSensitivity, renderComposite, pushHistory, refreshColorSamples]
  );

  // SMART AI BRUSH: Intelligently distinguishes foreground subject from background
  // When currentTool === 'erase': selectively eliminates background matching the clicked color, while strictly preserving high-contrast subject edges
  // When currentTool === 'restore': restores foreground subject details while preventing background from bleeding in
  const drawSmartBrushPoint = useCallback(
    (cx: number, cy: number, currentTool: 'restore' | 'erase') => {
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

      // Seed & Target colors for this stroke
      let seed = strokeSeedColorRef.current;
      const centerColor = sampleColorAt(cx, cy);
      if (!seed && centerColor) {
        strokeSeedColorRef.current = centerColor;
        seed = centerColor;
      }

      // Sensitivity tuning:
      // Sharp: lower tolerance, stricter edge retention
      // Balanced: optimal for products, portraits, walls
      // Soft: wider tolerance for hair, soft shadows, lace
      const tolerance = smartSensitivity === 'sharp' ? 32 : smartSensitivity === 'soft' ? 70 : 48;
      const edgeMultiplier = smartSensitivity === 'sharp' ? 1.35 : smartSensitivity === 'soft' ? 2.0 : 1.6;
      const falloffStart = brushHardness * radius;

      // In Smart Erase, anchor to the clicked background color (seed).
      // Only adapt to centerColor if it's within tolerance of seed (smooth gradient in background).
      // If centerColor deviates strongly from seed, the cursor has moved over the subject edge!
      // In that case, keep activeTarget = seed so we NEVER erase the subject!
      let activeTarget = seed || centerColor;
      if (seed && centerColor) {
        const dCenterToSeed = getPerceptualColorDist(seed[0], seed[1], seed[2], centerColor[0], centerColor[1], centerColor[2]);
        if (dCenterToSeed <= tolerance * 1.15) {
          activeTarget = centerColor;
        } else {
          activeTarget = seed; // Firmly lock to background!
        }
      }

      const bgSamples = globalBgSamplesRef.current;

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

          const dist = Math.sqrt(distSq);
          const distRatio = radius > 0 ? dist / radius : 0;

          let targetAlpha: number;

          if (currentTool === 'erase') {
            // SMART ERASING:
            // Calculate distance to active background color, stroke seed, and verified background samples
            let minEraseDist = Infinity;
            if (activeTarget) {
              minEraseDist = getPerceptualColorDist(pr, pg, pb, activeTarget[0], activeTarget[1], activeTarget[2]);
            }
            if (seed && seed !== activeTarget) {
              const dSeed = getPerceptualColorDist(pr, pg, pb, seed[0], seed[1], seed[2]);
              if (dSeed < minEraseDist) minEraseDist = dSeed;
            }
            for (let i = 0; i < bgSamples.length; i++) {
              const s = bgSamples[i];
              const d = getPerceptualColorDist(pr, pg, pb, s[0], s[1], s[2]);
              if (d < minEraseDist) minEraseDist = d;
            }

            if (minEraseDist <= tolerance) {
              // Matches background -> ERASE completely!
              targetAlpha = 0;
            } else if (minEraseDist >= tolerance * edgeMultiplier) {
              // High contrast edge of foreground subject -> PROTECT!
              targetAlpha = currentAlpha;
            } else {
              // Anti-aliased transition edge
              const t = (minEraseDist - tolerance) / (tolerance * (edgeMultiplier - 1));
              targetAlpha = Math.round(currentAlpha * Math.max(0, Math.min(1, t)));
            }
          } else {
            // SMART RESTORING:
            // If inside the inner core of the brush (distRatio <= 0.48), restore solidly to 255.
            // This guarantees numbers, logos, hands, text, and details on subjects restore 100% without streaks or holes.
            if (distRatio <= 0.48 || currentAlpha >= 25) {
              targetAlpha = 255;
            } else {
              // On the outer rim of the brush, prevent spilling over into exterior background
              let minSubjectDist = Infinity;
              if (activeTarget) {
                minSubjectDist = getPerceptualColorDist(pr, pg, pb, activeTarget[0], activeTarget[1], activeTarget[2]);
              }
              if (seed && seed !== activeTarget) {
                const dSeed = getPerceptualColorDist(pr, pg, pb, seed[0], seed[1], seed[2]);
                if (dSeed < minSubjectDist) minSubjectDist = dSeed;
              }

              // Check against known background samples to prevent bleeding into transparent background
              let minBgDist = Infinity;
              for (let i = 0; i < bgSamples.length; i++) {
                const s = bgSamples[i];
                const d = getPerceptualColorDist(pr, pg, pb, s[0], s[1], s[2]);
                if (d < minBgDist) minBgDist = d;
              }

              if (bgSamples.length > 0 && minBgDist < 24 && minBgDist < minSubjectDist) {
                // Verified exterior background -> do not restore!
                targetAlpha = 0;
              } else if (minSubjectDist > tolerance * edgeMultiplier) {
                // High contrast boundary from restored subject -> keep exterior background transparent!
                targetAlpha = 0;
              } else if (minSubjectDist > tolerance) {
                const t = (tolerance * edgeMultiplier - minSubjectDist) / (tolerance * (edgeMultiplier - 1));
                targetAlpha = Math.round(255 * Math.max(0, Math.min(1, t)));
              } else {
                targetAlpha = 255;
              }
            }
          }

          // Radial feather falloff according to brush edge hardness
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
    [brushSize, brushHardness, smartSensitivity, sampleColorAt]
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
      if (tool === 'pan') return;
      if (isSmartAi) {
        drawSmartBrushPoint(x, y, tool);
      } else {
        drawStandardBrushPoint(x, y);
      }
    },
    [tool, isSmartAi, drawSmartBrushPoint, drawStandardBrushPoint]
  );

  // Interpolate brush line between lastPoint and currentPoint for silky-smooth continuous strokes
  const drawBrushStroke = useCallback(
    (x1: number, y1: number, x2: number, y2: number) => {
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const step = isSmartAi
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
    [brushSize, brushHardness, isSmartAi, drawBrushPoint]
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

    if (e.button !== 0) return; // Only primary button for brush / magic wand

    const { x, y } = getCanvasCoords(e);

    // Magic Wand: 1-click intelligent flood erase or restore
    if (isMagicWand && (tool === 'restore' || tool === 'erase')) {
      executeMagicWand(x, y, tool);
      return;
    }

    isDrawingRef.current = true;
    lastPointRef.current = { x, y };

    if (isSmartAi) {
      const clickedColor = sampleColorAt(x, y);
      if (clickedColor) {
        strokeSeedColorRef.current = clickedColor;
      }
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
      strokeSeedColorRef.current = null;
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
        strokeSeedColorRef.current = null;
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
    setIsSmartAi,
    setIsMagicWand,
    setBrushSize,
    setIsPeekingOriginal,
    handleFitZoom,
    isMagicWand,
  });

  useEffect(() => {
    handlersRef.current = {
      handleUndo,
      handleRedo,
      handleSave,
      onClose,
      setTool,
      setIsSmartAi,
      setIsMagicWand,
      setBrushSize,
      setIsPeekingOriginal,
      handleFitZoom,
      isMagicWand,
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
        if (key === 'r' || code === 'KeyR' || key === '1') {
          handlersRef.current.setTool('restore');
          return;
        }
        if (key === 'e' || code === 'KeyE' || key === '2') {
          handlersRef.current.setTool('erase');
          return;
        }
        if (key === 'w' || code === 'KeyW' || key === '3') {
          e.preventDefault();
          handlersRef.current.setIsMagicWand((prev) => !prev);
          return;
        }
        if (key === 'h' || code === 'KeyH' || key === '4') {
          handlersRef.current.setTool('pan');
          return;
        }
        if (key === 's' || code === 'KeyS') {
          e.preventDefault();
          if (handlersRef.current.isMagicWand) {
            handlersRef.current.setIsMagicWand(false);
            handlersRef.current.setIsSmartAi(true);
          } else {
            handlersRef.current.setIsSmartAi((prev) => !prev);
          }
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
        handlersRef.current.setBrushSize((s) => Math.max(4, s - (e.shiftKey ? 30 : 10)));
        return;
      }
      if (key === ']' || key === '}' || key === '=' || key === '+') {
        e.preventDefault();
        handlersRef.current.setBrushSize((s) => Math.min(600, s + (e.shiftKey ? 30 : 10)));
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
                {isSmartAi ? (
                  <>
                    <span className="inline-flex items-center gap-1 font-semibold text-fuchsia-600 dark:text-fuchsia-400">
                      <Sparkles className="w-3 h-3" /> Smart AI Active:
                    </span>{' '}
                    {tool === 'restore'
                      ? 'Intelligently restores subject details while protecting background'
                      : tool === 'erase'
                      ? 'Intelligently removes background halos while protecting subject edges'
                      : 'Pan around image'}
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-slate-700 dark:text-white/70">Manual Mode:</span>{' '}
                    {tool === 'restore' ? 'Directly restoring original pixels' : tool === 'erase' ? 'Directly erasing pixels to transparent' : 'Pan around image'}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 1-Click Auto AI BG Removal */}
            <button
              type="button"
              disabled={isAutoProcessing}
              onClick={() => handleReRunAutoBg('ai')}
              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600/20 to-fuchsia-600/20 hover:from-purple-600/30 hover:to-fuchsia-600/30 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              title="1-Click Automatic AI Background Removal using neural model"
            >
              {isAutoProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" /> : <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
              <span>Auto AI</span>
            </button>

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
          {/* Tool Modes & Smart AI / Magic Wand Toggles */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Smart AI Brush ON / OFF Toggle Button */}
            <button
              type="button"
              onClick={() => {
                if (isMagicWand) {
                  // Switch directly from Magic Wand back to Smart AI Brush
                  setIsMagicWand(false);
                  setIsSmartAi(true);
                } else {
                  setIsSmartAi((prev) => !prev);
                }
              }}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                isSmartAi && !isMagicWand
                  ? 'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 text-white border-fuchsia-400/50 shadow-md shadow-fuchsia-600/30'
                  : 'bg-slate-200/90 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/10 border-slate-300 dark:border-white/10'
              }`}
              title="Smart AI Brush (Press S): Auto-detects and protects subject contours while brushing. Clicking switches from Magic Wand back to Smart AI Brush."
            >
              <div className="flex items-center gap-1.5">
                <Wand2 className={`w-3.5 h-3.5 ${isSmartAi && !isMagicWand ? 'text-yellow-300 animate-pulse' : 'text-slate-400 dark:text-white/40'}`} />
                <span className="text-xs">Smart AI Brush</span>
              </div>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider transition-colors ${
                  isSmartAi && !isMagicWand
                    ? 'bg-emerald-400 text-slate-950 shadow-xs'
                    : 'bg-slate-300 dark:bg-white/10 text-slate-500 dark:text-white/40'
                }`}
              >
                {isSmartAi && !isMagicWand ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Magic Wand ON / OFF Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMagicWand((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                isMagicWand
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white border-amber-400/50 shadow-md shadow-amber-500/30'
                  : 'bg-slate-200/90 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/10 border-slate-300 dark:border-white/10'
              }`}
              title="Toggle Magic Wand (Press W or 3): 1-click intelligent flood fills matching connected color areas (Restore or Erase)."
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className={`w-3.5 h-3.5 ${isMagicWand ? 'text-yellow-200 animate-spin' : 'text-slate-400 dark:text-white/40'}`} />
                <span className="text-xs">Magic Wand</span>
              </div>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider transition-colors ${
                  isMagicWand
                    ? 'bg-amber-300 text-slate-950 shadow-xs'
                    : 'bg-slate-300 dark:bg-white/10 text-slate-500 dark:text-white/40'
                }`}
              >
                {isMagicWand ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Tool Selection (Restore, Erase, Pan) */}
            <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-white/5 p-1 rounded-xl border border-slate-300/80 dark:border-white/10">
              {/* Restore Button */}
              <button
                type="button"
                onClick={() => setTool('restore')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  tool === 'restore'
                    ? isMagicWand
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md shadow-emerald-600/30'
                      : isSmartAi
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                }`}
                title={
                  isMagicWand
                    ? 'Magic Restore (R or 1): 1-click on subject detail to instantly flood-restore that connected region'
                    : isSmartAi
                    ? 'Smart AI Restore (R or 1): Intelligently paints back subject details while ignoring background'
                    : 'Manual Restore (R or 1): Paints back all original photo pixels without AI'
                }
              >
                {isMagicWand ? <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> : <Paintbrush className="w-3.5 h-3.5" />}
                <span>{isMagicWand ? 'Magic Restore' : 'Restore'}</span>
                {isMagicWand ? (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400 text-slate-950 uppercase font-black tracking-wider">
                    1-CLICK
                  </span>
                ) : isSmartAi ? (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-white/20 text-white uppercase font-black tracking-wider">
                    AI
                  </span>
                ) : null}
              </button>

              {/* Erase Button */}
              <button
                type="button"
                onClick={() => setTool('erase')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  tool === 'erase'
                    ? isMagicWand
                      ? 'bg-gradient-to-r from-rose-600 via-red-600 to-orange-600 text-white shadow-md shadow-rose-600/30'
                      : isSmartAi
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/30'
                      : 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                }`}
                title={
                  isMagicWand
                    ? 'Magic Erase (E or 2): 1-click on background to instantly flood-erase that connected color'
                    : isSmartAi
                    ? 'Smart AI Erase (E or 2): Eliminates background halos while protecting subject edges'
                    : 'Manual Erase (E or 2): Removes pixels directly to transparent without AI'
                }
              >
                {isMagicWand ? <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> : <Eraser className="w-3.5 h-3.5" />}
                <span>{isMagicWand ? 'Magic Erase' : 'Erase'}</span>
                {isMagicWand ? (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400 text-slate-950 uppercase font-black tracking-wider">
                    1-CLICK
                  </span>
                ) : isSmartAi ? (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-white/20 text-white uppercase font-black tracking-wider">
                    AI
                  </span>
                ) : null}
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
          </div>

          {/* Brush Settings: Size & Mode/Edge */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {/* Size Slider & Quick Presets */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-slate-500 dark:text-white/50 font-medium text-xs sm:text-sm">Size:</span>
              <input
                type="range"
                min="4"
                max="600"
                step="2"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                onPointerUp={(e) => (e.target as HTMLElement).blur()}
                className="w-20 sm:w-28 md:w-36 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full appearance-none cursor-pointer accent-fuchsia-600 dark:accent-fuchsia-500"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="4"
                  max="800"
                  value={brushSize}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setBrushSize(Math.max(4, Math.min(800, val)));
                  }}
                  className="w-12 px-1 py-0.5 text-xs font-mono font-bold text-center bg-slate-200/90 dark:bg-white/10 rounded border border-slate-300/80 dark:border-white/20 text-fuchsia-600 dark:text-fuchsia-400 focus:outline-hidden focus:ring-1 focus:ring-fuchsia-500"
                  title="Directly enter brush size (4-800px)"
                />
                <span className="text-[11px] font-mono text-slate-500 dark:text-white/40">px</span>
              </div>

              {/* Quick Size Presets */}
              <div className="hidden xl:flex items-center gap-1 bg-slate-200/60 dark:bg-white/5 p-0.5 rounded-md border border-slate-300/60 dark:border-white/10">
                {[
                  { label: '24', val: 24 },
                  { label: '64', val: 64 },
                  { label: '140', val: 140 },
                  { label: '260', val: 260 },
                  { label: '480', val: 480 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setBrushSize(preset.val)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono font-medium rounded transition-colors cursor-pointer ${
                      Math.abs(brushSize - preset.val) < 8
                        ? 'bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-300 font-bold'
                        : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title={`Set brush size to ${preset.val}px`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Sensitivity Pills (When Smart AI active) */}
            {isSmartAi ? (
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
          onPointerMove={(e) => {
            setIsInsideCanvas(true);
            setCursorPos({ x: e.clientX, y: e.clientY });
          }}
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
                width: isMagicWand ? '36px' : `${getScreenBrushSize()}px`,
                height: isMagicWand ? '36px' : `${getScreenBrushSize()}px`,
                borderColor:
                  isMagicWand
                    ? tool === 'restore'
                      ? 'rgba(16, 185, 129, 0.95)'
                      : 'rgba(245, 158, 11, 0.95)'
                    : tool === 'erase'
                    ? isSmartAi
                      ? 'rgba(244, 63, 94, 0.95)'
                      : 'rgba(239, 68, 68, 0.9)'
                    : isSmartAi
                    ? 'rgba(16, 185, 129, 0.95)'
                    : 'rgba(16, 185, 129, 0.9)',
                backgroundColor:
                  isMagicWand
                    ? tool === 'restore'
                      ? 'rgba(16, 185, 129, 0.18)'
                      : 'rgba(245, 158, 11, 0.18)'
                    : tool === 'erase'
                    ? isSmartAi
                      ? 'rgba(244, 63, 94, 0.16)'
                      : 'rgba(239, 68, 68, 0.12)'
                    : isSmartAi
                    ? 'rgba(16, 185, 129, 0.16)'
                    : 'rgba(16, 185, 129, 0.12)',
                boxShadow:
                  isMagicWand
                    ? tool === 'restore'
                      ? '0 0 0 1px rgba(0, 0, 0, 0.75), 0 0 14px rgba(16, 185, 129, 0.7), inset 0 0 8px rgba(16, 185, 129, 0.4)'
                      : '0 0 0 1px rgba(0, 0, 0, 0.75), 0 0 14px rgba(245, 158, 11, 0.7), inset 0 0 8px rgba(245, 158, 11, 0.4)'
                    : isSmartAi
                    ? tool === 'erase'
                      ? '0 0 0 1px rgba(0, 0, 0, 0.75), 0 0 12px rgba(244, 63, 94, 0.6), inset 0 0 6px rgba(244, 63, 94, 0.35)'
                      : '0 0 0 1px rgba(0, 0, 0, 0.75), 0 0 12px rgba(16, 185, 129, 0.6), inset 0 0 6px rgba(16, 185, 129, 0.35)'
                    : tool === 'erase'
                    ? '0 0 0 1px rgba(0, 0, 0, 0.75), 0 0 8px rgba(239, 68, 68, 0.5)'
                    : '0 0 0 1px rgba(0, 0, 0, 0.75), 0 0 8px rgba(16, 185, 129, 0.5)',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full ring-1 ring-black/80"
                style={{
                  backgroundColor:
                    isMagicWand
                      ? tool === 'restore'
                        ? '#10b981'
                        : '#f59e0b'
                      : tool === 'erase'
                      ? isSmartAi
                        ? '#f43f5e'
                        : '#ef4444'
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
                    <span className="text-fuchsia-300 font-semibold">Toggle Smart AI (ON/OFF):</span>
                    <kbd className="font-mono bg-fuchsia-500/25 text-fuchsia-200 px-1.5 py-0.5 rounded text-[10px]">S</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-amber-300 font-semibold">Toggle Magic Wand (ON/OFF):</span>
                    <kbd className="font-mono bg-amber-500/25 text-amber-200 px-1.5 py-0.5 rounded text-[10px]">W or 3</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Restore (Brush / Magic):</span>
                    <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">R or 1</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Erase (Brush / Magic):</span>
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
