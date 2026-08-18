import React from 'react';
import { ShieldCheck, Zap, Layers, Sparkles, FolderArchive, Sliders } from 'lucide-react';

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
      icon: ShieldCheck,
      title: 'Private & Zero Uploads',
      desc: 'All compression operations execute directly inside browser Web Workers.',
    },
    {
      icon: FolderArchive,
      title: 'Exact Filename Retention',
      desc: 'Exported ZIP packages preserve your original naming hierarchy.',
    },
    {
      icon: Zap,
      title: 'High-Throughput Concurrency',
      desc: 'Multi-threaded worker pool prevents UI freeze on 100+ file batches.',
    },
    {
      icon: Sliders,
      title: 'Full Format Support',
      desc: 'Native support for JPG, PNG, WebP, GIF, HEIC, TIFF, and BMP.',
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-950/20 via-white/[0.02] to-transparent border border-blue-500/20 text-center sm:text-left">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-white">Instant Demo Batch</div>
            <div className="text-[11px] text-white/40">Load 4 sample high-res test images with gradients and patterns.</div>
          </div>
        </div>
        <button
          type="button"
          disabled={isLoadingSamples}
          onClick={onLoadSamples}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors disabled:opacity-40 shrink-0"
        >
          {isLoadingSamples ? 'Generating Samples...' : 'Load Sample Images'}
        </button>
      </div>
    </div>
  );
};
