import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, ArrowLeftRight, HardDrive, Sparkles } from 'lucide-react';
import { ImageItem } from '../types';
import { formatBytes, calculateSavedPercentage } from '../utils/formatters';

interface ImageComparisonModalProps {
  item: ImageItem | null;
  onClose: () => void;
  onDownload: (item: ImageItem) => void;
}

export const ImageComparisonModal: React.FC<ImageComparisonModalProps> = ({
  item,
  onClose,
  onDownload,
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (item && item.compressedBlob) {
      const url = URL.createObjectURL(item.compressedBlob);
      setCompressedUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setCompressedUrl(null);
    }
  }, [item]);

  if (!item) return null;

  const savedPercent =
    item.compressedSize && item.originalSize
      ? calculateSavedPercentage(item.originalSize, item.compressedSize)
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-4 bg-[#080808]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white truncate max-w-md">
                {item.outputFilename || item.name}
              </h3>
              <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5 font-mono">
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-white/30" /> Original: {formatBytes(item.originalSize)}
                </span>
                <span>→</span>
                <span className="flex items-center gap-1 font-bold text-blue-400">
                  <Sparkles className="w-3 h-3 text-blue-400" /> Compressed:{' '}
                  {item.compressedSize ? formatBytes(item.compressedSize) : '—'}
                </span>
                {savedPercent > 0 && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    -{savedPercent}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-1 text-white/40">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onDownload(item)}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save Image</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Canvas Area */}
        <div className="relative flex-1 min-h-[380px] max-h-[60vh] bg-[#050505] flex items-center justify-center overflow-hidden select-none">
          <div
            className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-100"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* Compressed Layer */}
            <img
              src={compressedUrl || item.previewUrl}
              alt="Compressed"
              className="max-h-[55vh] max-w-[85vw] object-contain block"
              draggable={false}
            />

            {/* Original Layer */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={item.previewUrl}
                alt="Original"
                className="max-h-[55vh] max-w-[85vw] object-contain block"
                style={{ minWidth: '100%', width: '100%' }}
                draggable={false}
              />
            </div>

            {/* Slider Dividing Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center pointer-events-auto border border-white/20">
                <ArrowLeftRight className="w-3 h-3 text-white" />
              </div>
            </div>

            {/* Badges */}
            <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-xs text-white/80 text-[10px] font-bold font-mono px-2 py-1 rounded border border-white/10 pointer-events-none">
              ORIGINAL ({formatBytes(item.originalSize)})
            </div>
            <div className="absolute top-3 right-3 bg-blue-600/90 backdrop-blur-xs text-white text-[10px] font-bold font-mono px-2 py-1 rounded shadow-lg shadow-blue-500/20 pointer-events-none">
              COMPRESSED ({item.compressedSize ? formatBytes(item.compressedSize) : '—'})
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#080808] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs text-white/50 font-medium">Split Position:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPos}
              onChange={(e) => setSliderPos(parseInt(e.target.value, 10))}
              className="w-48 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-xs font-mono font-bold text-blue-400">
              {sliderPos}% Original
            </span>
          </div>

          <div className="text-xs text-white/40 text-center sm:text-right">
            Slide horizontally to evaluate visual clarity and pixel-level noise.
          </div>
        </div>
      </div>
    </div>
  );
};
