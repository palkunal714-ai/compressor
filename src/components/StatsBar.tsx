import React from 'react';
import { Download, Play, CheckCircle2, Loader2, Sparkles, XCircle, HardDrive, FileArchive } from 'lucide-react';
import { BatchStats } from '../types';
import { formatBytes } from '../utils/formatters';

interface StatsBarProps {
  stats: BatchStats;
  folderCount?: number;
  onCompressAndDownload: () => void;
  onCompressAll: () => void;
  onDownloadZip: () => void;
  onCancelProcessing?: () => void;
  isZipping?: boolean;
  zipProgress?: number;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  stats,
  folderCount = 0,
  onCompressAndDownload,
  onCompressAll,
  onDownloadZip,
  onCancelProcessing,
  isZipping = false,
  zipProgress = 0,
}) => {
  const {
    totalOriginalSize,
    totalCompressedSize,
    processedCount,
    totalCount,
    savedBytes,
    savedPercentage,
    isProcessing,
    isCompleted,
  } = stats;

  const progressPercent = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;
  const hasCompressedItems = processedCount > 0 && totalCompressedSize > 0;

  return (
    <div className="sticky bottom-0 z-30 w-full bg-[#0a0a0a] border-t border-white/10 px-4 sm:px-8 py-4 text-white shadow-2xl backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Metric Group */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 w-full md:w-auto">
          {/* Total Savings */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">
              Total Savings
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold font-mono tracking-tighter text-white">
                {hasCompressedItems ? savedPercentage : '0'}
              </span>
              <span className="text-xs sm:text-sm text-blue-500 font-light font-mono">%</span>
              {hasCompressedItems && savedBytes > 0 && (
                <span className="text-[10px] font-mono text-white/40 ml-1">
                  ({formatBytes(savedBytes)})
                </span>
              )}
            </div>
          </div>

          <div className="h-8 w-[1px] bg-white/10 hidden sm:block"></div>

          {/* Processed Count & Folders */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">
              Processed
            </span>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-semibold text-white/90 font-mono">
                {processedCount}{' '}
                <span className="text-white/30 text-xs sm:text-sm font-normal">
                  / {totalCount}
                </span>
              </span>
              {folderCount > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  {folderCount} {folderCount === 1 ? 'folder' : 'folders'}
                </span>
              )}
            </div>
          </div>

          <div className="h-8 w-[1px] bg-white/10 hidden sm:block"></div>

          {/* Global Progress Bar */}
          <div className="w-36 sm:w-48 flex flex-col">
            <div className="flex justify-between text-[9px] text-white/40 mb-1.5 uppercase font-bold tracking-widest">
              <span>Batch Progress</span>
              <span className="font-mono">{isZipping ? `${zipProgress}%` : `${progressPercent}%`}</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                    : isZipping
                    ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                    : 'bg-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                }`}
                style={{ width: `${isZipping ? zipProgress : progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Button Group */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {isProcessing && onCancelProcessing && (
            <button
              type="button"
              onClick={onCancelProcessing}
              className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-950/30 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          )}

          {isCompleted && (
            <button
              id="download-zip-btn"
              type="button"
              disabled={isZipping}
              onClick={onDownloadZip}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm border border-white/10 transition-all flex items-center gap-2"
            >
              {isZipping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span>Packaging ({zipProgress}%)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-blue-400" />
                  <span>Download ZIP</span>
                </>
              )}
            </button>
          )}

          {/* Primary Action Button */}
          <button
            id="compress-and-download-btn"
            type="button"
            disabled={isProcessing || isZipping || totalCount === 0}
            onClick={onCompressAndDownload}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-7 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-xl shadow-blue-600/20 hover:shadow-blue-500/30 flex items-center justify-center gap-2.5 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Batch...</span>
              </>
            ) : isZipping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating ZIP Archive...</span>
              </>
            ) : isCompleted ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Re-Compress & Export ZIP</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>GENERATE ZIP ARCHIVE</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
