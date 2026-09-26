import React, { useState, useEffect, useRef } from 'react';
import { X, Download, ZoomIn, ZoomOut, ArrowLeftRight, HardDrive, Sparkles, Play, Pause, Video, Paintbrush } from 'lucide-react';
import { ImageItem } from '../types';
import { formatBytes, calculateSavedPercentage, formatDuration } from '../utils/formatters';

interface ImageComparisonModalProps {
  item: ImageItem | null;
  onClose: () => void;
  onDownload: (item: ImageItem) => void;
  onEdit?: (item: ImageItem) => void;
}

export const ImageComparisonModal: React.FC<ImageComparisonModalProps> = ({
  item,
  onClose,
  onDownload,
  onEdit,
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [originalMediaUrl, setOriginalMediaUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const origVideoRef = useRef<HTMLVideoElement>(null);
  const compVideoRef = useRef<HTMLVideoElement>(null);

  const isVideo = item?.mediaType === 'video';

  useEffect(() => {
    if (item) {
      const origUrl = URL.createObjectURL(item.file);
      setOriginalMediaUrl(origUrl);

      let compUrl: string | null = null;
      if (item.compressedBlob) {
        compUrl = URL.createObjectURL(item.compressedBlob);
        setCompressedUrl(compUrl);
      } else {
        setCompressedUrl(null);
      }

      return () => {
        URL.revokeObjectURL(origUrl);
        if (compUrl) {
          URL.revokeObjectURL(compUrl);
        }
      };
    } else {
      setOriginalMediaUrl(null);
      setCompressedUrl(null);
    }
  }, [item]);

  if (!item) return null;

  const savedPercent =
    item.compressedSize && item.originalSize
      ? calculateSavedPercentage(item.originalSize, item.compressedSize)
      : 0;

  const toggleVideoPlayback = () => {
    if (origVideoRef.current) {
      if (origVideoRef.current.paused) {
        origVideoRef.current.play();
        if (compVideoRef.current) compVideoRef.current.play();
        setIsPlaying(true);
      } else {
        origVideoRef.current.pause();
        if (compVideoRef.current) compVideoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-white transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-4 bg-slate-50 dark:bg-[#080808]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              {isVideo ? <Video className="w-4 h-4" /> : <ArrowLeftRight className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate max-w-md">
                {item.outputFilename || item.name}
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-white/50 mt-0.5 font-mono flex-wrap">
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-slate-400 dark:text-white/30" /> Original: {formatBytes(item.originalSize)}
                </span>
                <span>→</span>
                <span className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400" /> Compressed:{' '}
                  {item.compressedSize ? formatBytes(item.compressedSize) : '—'}
                </span>
                {savedPercent > 0 && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-bold">
                    -{savedPercent}%
                  </span>
                )}
                {isVideo && item.duration !== undefined && (
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    Duration: {formatDuration(item.duration)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {!isVideo && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-lg border border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono px-1 text-slate-500 dark:text-white/40">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            )}

            {isVideo && (
              <button
                type="button"
                onClick={toggleVideoPlayback}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                <span>{isPlaying ? 'Pause All' : 'Play Both'}</span>
              </button>
            )}

            {!isVideo && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                className="px-3 py-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-fuchsia-500/20 cursor-pointer"
                title="Edit Cutout / Touch Up (Erase & Restore brush)"
              >
                <Paintbrush className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit Cutout</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onDownload(item)}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save Output</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Area */}
        <div className={`relative flex-1 min-h-[380px] max-h-[60vh] flex items-center justify-center overflow-hidden select-none ${
          item.isBgRemoved || item.compressedFormat === 'PNG' ? 'bg-transparency-grid' : 'bg-slate-950 dark:bg-[#050505]'
        }`}>
          {isVideo ? (
            /* Video Side-by-Side Synced Comparison */
            <div className="w-full h-full p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center overflow-y-auto">
              {/* Original Video Box */}
              <div className="flex flex-col items-center justify-center bg-black/40 rounded-xl p-2 border border-white/10 relative">
                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-xs text-white text-[10px] font-bold font-mono px-2 py-0.5 rounded border border-white/10 z-10">
                  ORIGINAL ({formatBytes(item.originalSize)})
                </div>
                {originalMediaUrl && (
                  <video
                    ref={origVideoRef}
                    src={originalMediaUrl}
                    controls
                    playsInline
                    className="max-h-[45vh] w-full object-contain rounded-lg"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                )}
                <div className="text-[10px] font-mono text-white/50 mt-2">
                  {item.width}×{item.height}px
                </div>
              </div>

              {/* Compressed Video Box */}
              <div className="flex flex-col items-center justify-center bg-black/40 rounded-xl p-2 border border-blue-500/30 relative">
                <div className="absolute top-3 left-3 bg-blue-600/90 backdrop-blur-xs text-white text-[10px] font-bold font-mono px-2 py-0.5 rounded shadow-lg z-10">
                  COMPRESSED ({item.compressedSize ? formatBytes(item.compressedSize) : 'Pending'})
                </div>
                {compressedUrl ? (
                  <video
                    ref={compVideoRef}
                    src={compressedUrl}
                    controls
                    playsInline
                    className="max-h-[45vh] w-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="h-48 flex items-center justify-center text-white/40 text-xs">
                    Run compression to preview output video
                  </div>
                )}
                <div className="text-[10px] font-mono text-blue-400 mt-2">
                  {item.compressedWidth || item.width}×{item.compressedHeight || item.height}px
                </div>
              </div>
            </div>
          ) : (
            /* Image Split Slider Comparison */
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
                  src={originalMediaUrl || item.previewUrl}
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
              <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-xs text-white/90 text-[10px] font-bold font-mono px-2 py-1 rounded border border-white/10 pointer-events-none">
                ORIGINAL ({formatBytes(item.originalSize)})
              </div>
              <div className="absolute top-3 right-3 bg-blue-600/90 backdrop-blur-xs text-white text-[10px] font-bold font-mono px-2 py-1 rounded shadow-lg shadow-blue-500/20 pointer-events-none">
                COMPRESSED ({item.compressedSize ? formatBytes(item.compressedSize) : '—'})
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-[#080808] border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          {!isVideo ? (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs text-slate-500 dark:text-white/50 font-medium">Split Position:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(parseInt(e.target.value, 10))}
                className="w-48 h-1.5 bg-slate-300 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
              />
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                {sliderPos}% Original
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-500 dark:text-white/50 flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-500" />
              <span>Side-by-side synchronized video evaluation.</span>
            </div>
          )}

          <div className="text-xs text-slate-500 dark:text-white/40 text-center sm:text-right">
            Slide horizontally to evaluate visual clarity and pixel-level quality.
          </div>
        </div>
      </div>
    </div>
  );
};
