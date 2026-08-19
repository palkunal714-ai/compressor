import React from 'react';
import { ShieldCheck, Zap, Sparkles, FolderTree, Sliders, FolderArchive, Layers } from 'lucide-react';

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
      title: 'Full Subfolder Hierarchy',
      desc: 'Preserves arbitrary nested directory structures and subfolders in your exported ZIP.',
    },
    {
      icon: ShieldCheck,
      title: 'Private & Zero Uploads',
      desc: 'All compression operations execute directly inside your browser sandbox.',
    },
    {
      icon: Zap,
      title: 'High-Throughput Pool',
      desc: 'Multi-threaded worker pool prevents UI freeze on 100+ file batches.',
    },
    {
      icon: Sliders,
      title: 'Universal Formats',
      desc: 'Full support for JPG, PNG, WebP, GIF, HEIC, TIFF, and BMP.',
    },
  ];

  return (
    <div className="mt-6 pt-6 border-t border-white/5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {highlights.map((h, i) => {
          const Icon = h.icon;
          return (
            <div
              key={i}
              className="p-4 rounded-xl bg-[#0d0d0d] border border-white/5 flex flex-col"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                {h.title}
              </h4>
              <p className="text-[11px] text-white/40 leading-relaxed">
                {h.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Demo sample loader */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-950/20 via-white/[0.02] to-amber-950/10 border border-blue-500/20 text-center sm:text-left">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-white">Instant Demo Batch with Subfolders</div>
            <div className="text-[11px] text-white/40">Load sample clock & watch series (ornate-classic, series-333, series-444, series-740, etc.) with complete folder paths.</div>
          </div>
        </div>
        <button
          id="load-sample-batch-btn"
          type="button"
          disabled={isLoadingSamples}
          onClick={onLoadSamples}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all disabled:opacity-40 shrink-0 flex items-center gap-1.5"
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>{isLoadingSamples ? 'Generating Folder Batch...' : 'Load Sample Folder Tree'}</span>
        </button>
      </div>
    </div>
  );
};
