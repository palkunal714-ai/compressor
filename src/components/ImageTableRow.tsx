import React from 'react';
import { X, Download, Eye, AlertTriangle, CheckCircle, Loader2, RefreshCw, Play, Paintbrush } from 'lucide-react';
import { ImageItem } from '../types';
import { formatBytes, formatMimeBadge, calculateSavedPercentage, formatDuration } from '../utils/formatters';

interface ImageTableRowProps {
  item: ImageItem;
  onRemove: (id: string) => void;
  onDownload: (item: ImageItem) => void;
  onPreview: (item: ImageItem) => void;
  onRetry: (item: ImageItem) => void;
  onEdit?: (item: ImageItem) => void;
  disabled?: boolean;
}

export const ImageTableRow: React.FC<ImageTableRowProps> = React.memo(({
  item,
  onRemove,
  onDownload,
  onPreview,
  onRetry,
  onEdit,
  disabled = false,
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
    <tr
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && !disabled) {
          onRemove(item.id);
        }
      }}
      className="border-b border-slate-200/80 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group focus:outline-hidden focus:bg-blue-500/5 text-slate-800 dark:text-white/90"
    >
      {/* 1. Thumbnail + Details */}
      <td className="py-3 px-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div
            className={`relative w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-white/10 flex items-center justify-center cursor-pointer ${
              item.isBgRemoved || item.hasTouchUp || item.compressedFormat === 'PNG'
                ? 'bg-transparency-grid'
                : 'bg-slate-100 dark:bg-white/5'
            }`}
            onClick={() => (isDone || item.previewUrl) && onPreview(item)}
          >
            {item.previewUrl ? (
              <img src={item.previewUrl} alt="" className="w-full h-full object-contain opacity-95" />
            ) : null}

            {isVideo && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Play className="w-3.5 h-3.5 fill-white text-white" />
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-blue-950/70 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              </div>
            )}
          </div>
          <div>
            {item.folderPath && (
              <div className="text-[10px] text-amber-700 dark:text-amber-400/90 font-mono flex items-center gap-1 mb-0.5 truncate max-w-[220px]">
                <span className="text-[8px] px-1 py-0.1 rounded bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold">
                  DIR
                </span>
                <span className="truncate">{item.folderPath}/</span>
              </div>
            )}
            <div className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white max-w-[180px] sm:max-w-xs truncate" title={item.outputRelativePath || item.outputFilename || item.name}>
              {item.outputFilename || item.name}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-white/70">
                {formatMimeBadge(item.originalFormat, item.name.split('.').pop())}
              </span>
              {item.hasTouchUp && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-300 dark:border-fuchsia-500/30">
                  TOUCHED UP
                </span>
              )}
              {item.isBgRemoved && !item.hasTouchUp && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30">
                  NO BG
                </span>
              )}
              {item.width ? (
                <span className="text-[10px] text-slate-400 dark:text-white/30 font-mono">
                  {item.width}×{item.height}px
                  {item.compressedWidth && item.compressedWidth !== item.width ? ` → ${item.compressedWidth}×${item.compressedHeight}` : ''}
                </span>
              ) : null}
              {isVideo && item.duration !== undefined && (
                <span className="text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {formatDuration(item.duration)}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* 2. Original Size */}
      <td className="py-3 px-3 text-xs font-mono text-slate-500 dark:text-white/40 whitespace-nowrap">
        {formatBytes(item.originalSize)}
      </td>

      {/* 3. Compressed Size */}
      <td className="py-3 px-3 text-xs font-mono whitespace-nowrap">
        {isDone && item.compressedSize !== null ? (
          <span className="font-bold text-blue-600 dark:text-blue-400 italic">
            {formatBytes(item.compressedSize)}
          </span>
        ) : isProcessing ? (
          <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            {item.progress}%
          </span>
        ) : isError ? (
          <span className="text-red-500 text-xs font-semibold">Failed</span>
        ) : (
          <span className="text-slate-300 dark:text-white/20">—</span>
        )}
      </td>

      {/* 4. Savings */}
      <td className="py-3 px-3 whitespace-nowrap">
        {isDone && savedPercent > 0 ? (
          <span className="inline-flex text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            -{savedPercent}%
          </span>
        ) : isDone ? (
          <span className="text-xs text-slate-400 dark:text-white/30 font-mono">0%</span>
        ) : (
          <span className="text-xs text-slate-300 dark:text-white/20">—</span>
        )}
      </td>

      {/* 5. Status */}
      <td className="py-3 px-3 text-xs whitespace-nowrap">
        {isDone && (
          <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> DONE
          </span>
        )}
        {isProcessing && (
          <div className="w-24 bg-slate-200 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)] h-full transition-all" style={{ width: `${item.progress}%` }} />
          </div>
        )}
        {isError && (
          <div className="flex items-center gap-1 text-red-500">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-[10px] truncate max-w-[100px]">{item.error || 'Error'}</span>
            <button
              type="button"
              onClick={() => onRetry(item)}
              className="text-red-600 dark:text-red-300 hover:underline ml-1 cursor-pointer"
              title="Retry"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        )}
        {item.status === 'pending' && <span className="text-[10px] font-mono text-slate-400 dark:text-white/30">QUEUED</span>}
      </td>

      {/* 6. Actions */}
      <td className="py-3 px-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          {onEdit && !isVideo && (
            <button
              type="button"
              onClick={() => onEdit(item)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                item.hasTouchUp || item.isBgRemoved
                  ? 'bg-fuchsia-50 hover:bg-fuchsia-100 dark:bg-fuchsia-500/20 dark:hover:bg-fuchsia-500/30 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-200 dark:border-fuchsia-500/30 shadow-xs'
                  : 'text-slate-500 dark:text-white/40 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 hover:bg-slate-100 dark:hover:bg-white/10'
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
                className="p-1.5 rounded-lg text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Preview / Compare"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDownload(item)}
                className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:text-white hover:bg-blue-600 transition-colors cursor-pointer"
                title="Download single file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            disabled={disabled || isProcessing}
            onClick={() => onRemove(item.id)}
            className="p-1.5 rounded-lg text-slate-400 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30 cursor-pointer"
            title="Remove from batch"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});
