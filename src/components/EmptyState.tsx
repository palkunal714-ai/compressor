import React from 'react';
import { ShieldCheck, Zap, Sparkles, FolderTree, Video } from 'lucide-react';

interface EmptyStateProps {
  onLoadSamples: () => void;
  isLoadingSamples?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onLoadSamples,
  isLoadingSamples = false,
}) => {
  const highlights = [
    {
      icon: FolderTree,
      title: 'Full Directory Hierarchy',
      desc: 'Preserves arbitrary nested folders and subfolder paths seamlessly in your exported ZIP archive.',
    },
    {
      icon: Video,
      title: 'Images & Video Engine',
      desc: 'Compress JPG, PNG, WebP, GIF, HEIC, TIFF alongside MP4, WebM, MOV, and MKV videos.',
    },
    {
      icon: ShieldCheck,
      title: 'Private & Zero Uploads',
      desc: 'All operations execute 100% directly inside your browser sandbox on your device.',
    },
    {
      icon: Zap,
      title: 'High-Throughput Pool',
      desc: 'Multi-threaded worker pool prevents UI freeze on 100+ file image & video batches.',
    },
  ];

  return (
    <div className="mt-3 pt-4 border-t border-slate-200 dark:border-white/5 transition-colors">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {highlights.map((h, i) => {
          const Icon = h.icon;
          return (
            <div
              key={i}
              className="p-4 rounded-xl bg-white dark:bg-[#0d0d0d] border border-slate-200 dark:border-white/5 flex flex-col shadow-xs"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                {h.title}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-white/40 leading-relaxed">
                {h.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Demo sample loader */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500/5 via-slate-50 dark:via-white/[0.02] to-amber-500/5 dark:to-amber-950/10 border border-blue-200 dark:border-blue-500/20 text-center sm:text-left shadow-xs">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white">Instant Demo Batch with Subfolders & Video</div>
            <div className="text-[11px] text-slate-500 dark:text-white/40">Load sample clock series and motion reels (ornate-classic, series-333, series-444, video-reels) with folder hierarchy.</div>
          </div>
        </div>
        <button
          id="load-sample-batch-btn"
          type="button"
          disabled={isLoadingSamples}
          onClick={onLoadSamples}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all disabled:opacity-40 shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>{isLoadingSamples ? 'Generating Demo Batch...' : 'Load Sample Folder Tree'}</span>
        </button>
      </div>
    </div>
  );
};
