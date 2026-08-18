import React from 'react';
import { Layers, ShieldCheck, Zap, Trash2, LayoutGrid, List, Sun, Moon } from 'lucide-react';
import { ViewMode } from '../types';

interface HeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  viewMode: ViewMode;
  onToggleViewMode: (mode: ViewMode) => void;
  totalImages: number;
  onClearAll: () => void;
  isProcessing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  onToggleTheme,
  viewMode,
  onToggleViewMode,
  totalImages,
  onClearAll,
  isProcessing,
}) => {
  return (
    <header className="h-16 px-4 sm:px-8 border-b border-white/10 flex items-center justify-between bg-[#0a0a0a] text-white select-none shrink-0 sticky top-0 z-30">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              BULKPRESS <span className="text-blue-500 font-light italic text-sm sm:text-base">PRO</span>
            </h1>
            <span className="hidden md:inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Zap className="w-2.5 h-2.5" /> Client Engine
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/40 hidden sm:block">
            High-Performance In-Browser Compression
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Zero Uploads Badge */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-white/60 bg-white/[0.03] border border-white/10 px-3 py-1 rounded-lg">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">100% Private</span>
        </div>

        {/* View mode toggle (only when images exist) */}
        {totalImages > 0 && (
          <div className="flex items-center p-0.5 bg-white/5 rounded-lg border border-white/10">
            <button
              id="view-mode-grid-btn"
              type="button"
              onClick={() => onToggleViewMode('grid')}
              className={`p-1.5 rounded text-xs font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-white/40 hover:text-white'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              id="view-mode-table-btn"
              type="button"
              onClick={() => onToggleViewMode('table')}
              className={`p-1.5 rounded text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-white/40 hover:text-white'
              }`}
              title="Table View"
              aria-label="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Clear Queue Button */}
        {totalImages > 0 && (
          <button
            id="header-clear-all-btn"
            type="button"
            disabled={isProcessing}
            onClick={onClearAll}
            className="text-[11px] font-bold uppercase tracking-wider text-white/50 hover:text-red-400 transition-colors flex items-center gap-1.5 disabled:opacity-30"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Queue ({totalImages})</span>
          </button>
        )}

        <div className="h-6 w-[1px] bg-white/10 hidden sm:block"></div>

        {/* Dark Mode toggle styled with immersive pill */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider hidden sm:inline">
            Theme
          </span>
          <button
            id="theme-toggle-btn"
            type="button"
            onClick={onToggleTheme}
            className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors shadow-inner shadow-black/60 ${
              darkMode ? 'bg-blue-600' : 'bg-white/20'
            }`}
            title={darkMode ? 'Switch to Light' : 'Switch to Dark'}
            aria-label="Toggle Theme"
          >
            <div
              className={`w-4 h-4 bg-white rounded-full transition-transform flex items-center justify-center ${
                darkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            >
              {darkMode ? (
                <Moon className="w-2.5 h-2.5 text-blue-600" />
              ) : (
                <Sun className="w-2.5 h-2.5 text-neutral-800" />
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
