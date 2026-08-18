import React from 'react';
import { X, Download, Eye, AlertTriangle, CheckCircle, Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import { ImageItem } from '../types';
import { formatBytes, formatMimeBadge, calculateSavedPercentage } from '../utils/formatters';

interface ImageCardProps {
  item: ImageItem;
  onRemove: (id: string) => void;
  onDownload: (item: ImageItem) => void;
  onPreview: (item: ImageItem) => void;
  onRetry: (item: ImageItem) => void;
  disabled?: boolean;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  item,
  onRemove,
  onDownload,
  onPreview,
  onRetry,
  disabled = false,
}) => {
  const savedPercent =
    item.compressedSize && item.originalSize
      ? calculateSavedPercentage(item.originalSize, item.compressedSize)
      : 0;

  const isDone = item.status === 'done';
  const isProcessing = item.status === 'processing';
  const isError = item.status === 'error';

  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && !disabled) {
          onRemove(item.id);
        }
      }}
      className={`bg-[#111] border rounded-xl p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-200 group relative ${
        isDone
          ? 'border-white/10 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5'
          : isProcessing
          ? 'border-blue-500/40 ring-1 ring-blue-500/30 shadow-xl shadow-blue-500/10'
          : isError
          ? 'border-red-500/40 bg-red-950/10'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Thumbnail preview */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 rounded-lg overflow-hidden shrink-0 border border-white/10 relative flex items-center justify-center">
          <img
            src={item.previewUrl}
            alt={item.name}
            className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
            loading="lazy"
          />

          {/* Format Tag */}
          <div className="absolute bottom-1 left-1">
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-black/80 text-white/80 border border-white/10 uppercase">
              {formatMimeBadge(item.originalFormat, item.name.split('.').pop())}
            </span>
          </div>

          {/* Processing spinner overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-blue-950/60 backdrop-blur-xs flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Middle Metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <h3
              className="text-xs sm:text-sm font-semibold text-white truncate max-w-[140px] sm:max-w-[180px]"
              title={item.outputFilename || item.name}
            >
              {item.outputFilename || item.name}
            </h3>

            {/* Status Pill */}
            {isDone && (
              <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-0.5 shrink-0">
                <CheckCircle className="w-3 h-3 text-emerald-400" /> DONE
              </span>
            )}
            {isProcessing && (
              <span className="text-[10px] text-blue-400 font-mono font-bold shrink-0">
                {item.progress}%
              </span>
            )}
            {isError && (
              <span className="text-[10px] text-red-400 font-mono font-bold shrink-0">
                ERROR
              </span>
            )}
            {item.status === 'pending' && (
              <span className="text-[10px] text-white/30 font-mono shrink-0">
                QUEUED
              </span>
            )}
          </div>

          {/* Size Metrics */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono mb-2 flex-wrap">
            <span className="text-white/40">{formatBytes(item.originalSize)}</span>
            {isDone && item.compressedSize !== null && (
              <>
                <ArrowRight className="w-3 h-3 text-white/20" />
                <span className="text-blue-400 font-bold italic">
                  {formatBytes(item.compressedSize)}
                </span>
                {savedPercent > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold ml-auto">
                    -{savedPercent}%
                  </span>
                )}
              </>
            )}
          </div>

          {/* Individual Progress Bar */}
          <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-1.5">
            {isDone ? (
              <div className="w-full h-full bg-emerald-500 rounded-full" />
            ) : isProcessing ? (
              <div
                className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] rounded-full transition-all duration-200"
                style={{ width: `${item.progress}%` }}
              />
            ) : (
              <div className="w-0 h-full" />
            )}
          </div>

          {/* Dimensions if available */}
          {(item.width || item.compressedWidth) && (
            <div className="text-[10px] text-white/30 font-mono">
              {item.width}×{item.height}px
              {item.compressedWidth && item.compressedWidth !== item.width && (
                <span className="text-blue-400"> → {item.compressedWidth}×{item.compressedHeight}px</span>
              )}
            </div>
          )}

          {/* Warning or Error note */}
          {item.warning && (
            <div className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 mt-1">
              {item.warning}
            </div>
          )}
          {item.error && (
            <div className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 mt-1 flex items-center justify-between">
              <span className="truncate">{item.error}</span>
              <button
                type="button"
                onClick={() => onRetry(item)}
                className="text-red-300 underline ml-1 hover:text-white"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Remove Button */}
          <button
            type="button"
            disabled={disabled || isProcessing}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            className="text-white/30 hover:text-red-400 transition-colors p-1 disabled:opacity-30"
            title="Remove image"
            aria-label={`Remove ${item.name}`}
          >
            <X className="w-4 h-4" />
          </button>

          {/* Done actions */}
          {isDone && (
            <div className="flex items-center gap-1 mt-auto">
              <button
                type="button"
                onClick={() => onPreview(item)}
                className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                title="Compare Before / After"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDownload(item)}
                className="p-1.5 rounded-md bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white transition-colors"
                title="Download single compressed image"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
