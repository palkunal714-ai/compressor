import React from 'react';
import { X, Download, Eye, CheckCircle, Loader2, ArrowRight, Video, Play, Paintbrush, Check } from 'lucide-react';
import { ImageItem } from '../types';
import { formatBytes, formatMimeBadge, calculateSavedPercentage, formatDuration } from '../utils/formatters';

interface ImageCardProps {
  item: ImageItem;
  onRemove: (id: string) => void;
  onDownload: (item: ImageItem) => void;
  onPreview: (item: ImageItem) => void;
  onRetry: (item: ImageItem) => void;
  onEdit?: (item: ImageItem) => void;
  disabled?: boolean;
  isSelected?: boolean;
  hasAnySelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const ImageCard: React.FC<ImageCardProps> = React.memo(({
  item,
  onRemove,
  onDownload,
  onPreview,
  onRetry,
  onEdit,
  disabled = false,
  isSelected = false,
  hasAnySelected = false,
  onToggleSelect,
}) => {
  const savedPercent =
    item.compressedSize && item.originalSize
      ? calculateSavedPercentage(item.originalSize, item.compressedSize)
      : 0;

  const isDone = item.status === 'done';
  const isProcessing = item.status === 'processing';
  const isError = item.status === 'error';
  const isVideo = item.mediaType === 'video';

  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && !disabled) {
          onRemove(item.id);
        }
      }}
      className={`bg-white dark:bg-[#111] border rounded-xl p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-200 group relative ${
        isSelected
          ? 'border-fuchsia-500 dark:border-fuchsia-500/80 ring-2 ring-fuchsia-500/30 dark:ring-fuchsia-500/25 bg-fuchsia-50/20 dark:bg-fuchsia-950/20 shadow-md shadow-fuchsia-500/10'
          : isDone
          ? 'border-slate-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500/40 shadow-xs hover:shadow-md dark:hover:shadow-blue-500/5'
          : isProcessing
          ? 'border-blue-500/50 ring-1 ring-blue-500/30 shadow-md shadow-blue-500/10'
          : isError
          ? 'border-red-300 dark:border-red-500/40 bg-red-50/50 dark:bg-red-950/10'
          : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-xs'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Thumbnail preview */}
        <div
          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-white/10 relative flex items-center justify-center cursor-pointer group/thumb ${
            item.isBgRemoved || item.hasTouchUp || item.compressedFormat === 'PNG'
              ? 'bg-transparency-grid'
              : 'bg-slate-100 dark:bg-white/5'
          }`}
          onClick={(e) => {
            if (e.shiftKey || e.ctrlKey || e.metaKey) {
              e.stopPropagation();
              onToggleSelect?.(item.id);
            } else if (isDone || item.previewUrl) {
              onPreview(item);
            }
          }}
        >
          {/* Multi-select Checkbox Button */}
          {onToggleSelect && !isVideo && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(item.id);
              }}
              className={`absolute top-1 left-1 z-10 w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/40 ring-1.5 ring-white dark:ring-black scale-100 opacity-100'
                  : hasAnySelected
                  ? 'bg-black/50 hover:bg-fuchsia-600 text-transparent hover:text-white border border-white/50 backdrop-blur-xs opacity-75 hover:opacity-100'
                  : 'bg-black/40 hover:bg-fuchsia-600 text-transparent hover:text-white border border-white/30 backdrop-blur-xs opacity-0 group-hover:opacity-100'
              }`}
              title={isSelected ? 'Deselect image' : 'Select image for Auto AI'}
              aria-label={`Select ${item.name}`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          )}
          {item.previewUrl ? (
            <img
              src={item.previewUrl}
              alt={item.name}
              className="w-full h-full object-contain opacity-95 group-hover:opacity-100 transition-opacity"
              loading="lazy"
            />
          ) : (
            <div className="text-slate-400 dark:text-white/30 flex flex-col items-center">
              {isVideo ? <Video className="w-6 h-6" /> : <Loader2 className="w-5 h-5 animate-spin" />}
            </div>
          )}

          {/* Video indicator icon overlay */}
          {isVideo && (
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover/thumb:bg-black/10 transition-colors">
              <div className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white">
                <Play className="w-3 h-3 fill-white ml-0.5" />
              </div>
            </div>
          )}

          {/* Format Tag */}
          <div className="absolute bottom-1 left-1">
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-black/80 text-white/90 border border-white/10 uppercase">
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
          {/* Folder Path Breadcrumb if nested */}
          {item.folderPath && (
            <div
              className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400/90 font-mono mb-0.5 truncate"
              title={`Folder: ${item.folderPath}`}
            >
              <span className="text-[8px] px-1 py-0.1 rounded bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold shrink-0">
                DIR
              </span>
              <span className="truncate">{item.folderPath}/</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-1 mb-1">
            <h3
              className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-[180px]"
              title={item.outputRelativePath || item.outputFilename || item.name}
            >
              {item.outputFilename || item.name}
            </h3>

            {/* Status Pill */}
            <div className="flex items-center gap-1 shrink-0">
              {item.hasTouchUp && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 font-mono font-bold border border-fuchsia-300 dark:border-fuchsia-500/30">
                  TOUCHED UP
                </span>
              )}
              {item.isBgRemoved && !item.hasTouchUp && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-mono font-bold border border-purple-300 dark:border-purple-500/30">
                  NO BG
                </span>
              )}
              {isDone && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-0.5">
                  <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> DONE
                </span>
              )}
              {isProcessing && (
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">
                  {item.progress}%
                </span>
              )}
              {isError && (
                <span className="text-[10px] text-red-600 dark:text-red-400 font-mono font-bold">
                  ERROR
                </span>
              )}
              {item.status === 'pending' && (
                <span className="text-[10px] text-slate-400 dark:text-white/30 font-mono">
                  QUEUED
                </span>
              )}
            </div>
          </div>

          {/* Size Metrics */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono mb-2 flex-wrap">
            <span className="text-slate-500 dark:text-white/40">{formatBytes(item.originalSize)}</span>
            {isDone && item.compressedSize !== null && (
              <>
                <ArrowRight className="w-3 h-3 text-slate-400 dark:text-white/20" />
                <span className="text-blue-600 dark:text-blue-400 font-bold italic">
                  {formatBytes(item.compressedSize)}
                </span>
                {savedPercent > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-bold ml-auto">
                    -{savedPercent}%
                  </span>
                )}
              </>
            )}
          </div>

          {/* Individual Progress Bar */}
          <div className="h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mb-1.5">
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

          {/* Dimensions & Duration */}
          <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-white/30 font-mono flex-wrap">
            {(item.width || item.compressedWidth) && (
              <span>
                {item.width}×{item.height}px
                {item.compressedWidth && item.compressedWidth !== item.width && (
                  <span className="text-blue-600 dark:text-blue-400"> → {item.compressedWidth}×{item.compressedHeight}px</span>
                )}
              </span>
            )}
            {isVideo && item.duration !== undefined && (
              <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-500/20">
                {formatDuration(item.duration)}
              </span>
            )}
          </div>

          {/* Warning or Error note */}
          {item.warning && (
            <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/20 mt-1">
              {item.warning}
            </div>
          )}
          {item.error && (
            <div className="text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded border border-red-200 dark:border-red-500/20 mt-1 flex items-center justify-between">
              <span className="truncate">{item.error}</span>
              <button
                type="button"
                onClick={() => onRetry(item)}
                className="text-red-700 dark:text-red-300 underline ml-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
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
            className="text-slate-400 hover:text-red-500 dark:text-white/30 dark:hover:text-red-400 transition-colors p-1 disabled:opacity-30 cursor-pointer"
            title="Remove media"
            aria-label={`Remove ${item.name}`}
          >
            <X className="w-4 h-4" />
          </button>

          {/* Action buttons (Touch-Up, Preview, Download) */}
          <div className="flex items-center gap-1 mt-auto">
            {onEdit && !isVideo && (
              <button
                type="button"
                onClick={() => onEdit(item)}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  item.hasTouchUp || item.isBgRemoved
                    ? 'bg-fuchsia-50 hover:bg-fuchsia-100 dark:bg-fuchsia-500/20 dark:hover:bg-fuchsia-500/30 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-200 dark:border-fuchsia-500/30 shadow-xs'
                    : 'bg-slate-100 hover:bg-fuchsia-50 dark:bg-white/5 dark:hover:bg-fuchsia-500/10 text-slate-600 dark:text-white/70 hover:text-fuchsia-600 dark:hover:text-fuchsia-400'
                }`}
                title="Edit Cutout / Touch Up (Erase & Restore brush)"
                aria-label={`Edit cutout for ${item.name}`}
              >
                <Paintbrush className="w-3.5 h-3.5" />
              </button>
            )}

            {isDone && (
              <>
                <button
                  type="button"
                  onClick={() => onPreview(item)}
                  className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Preview / Compare"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDownload(item)}
                  className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white transition-colors cursor-pointer"
                  title="Download single file"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
