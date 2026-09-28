import React from 'react';
import { Layers, ShieldCheck, Zap, Trash2, LayoutGrid, List, Sun, Moon, Palette } from 'lucide-react';
import { ViewMode } from '../types';
import { AppTheme, UiLookStyle, getThemeConfig, getUiStyleConfig } from '../utils/themePresets';

interface HeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  viewMode: ViewMode;
  onToggleViewMode: (mode: ViewMode) => void;
  totalImages: number;
  onClearAll: () => void;
  isProcessing: boolean;
  currentTheme?: AppTheme;
  currentStyle?: UiLookStyle;
  onOpenThemeModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  onToggleTheme,
  viewMode,
  onToggleViewMode,
  totalImages,
  onClearAll,
  isProcessing,
  currentTheme = 'midnight-pro' as AppTheme,
  currentStyle = 'default' as UiLookStyle,
  onOpenThemeModal,
}) => {
  const activeThemeConfig = getThemeConfig(currentTheme);
  const activeStyleConfig = getUiStyleConfig(currentStyle);
  return (
    <header className="h-16 px-4 sm:px-8 border-b transition-colors flex items-center justify-between bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white border-slate-200 dark:border-white/10 select-none shrink-0 sticky top-0 z-30 shadow-xs">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              BULKPRESS <span className="text-blue-600 dark:text-blue-500 font-light italic text-sm sm:text-base">PRO</span>
            </h1>
            <span className="hidden md:inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Zap className="w-2.5 h-2.5" /> Client Engine
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-white/40 hidden sm:block">
            High-Performance In-Browser Image & Video Compression
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Zero Uploads Badge */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 dark:text-white/60 bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 px-3 py-1 rounded-lg">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">100% Private</span>
        </div>

        {/* View mode toggle (only when items exist) */}
        {totalImages > 0 && (
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
            <button
              id="view-mode-grid-btn"
              type="button"
              onClick={() => onToggleViewMode('grid')}
              className={`p-1.5 rounded text-xs font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'
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
                  : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'
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
            className="text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-red-500 dark:text-white/50 dark:hover:text-red-400 transition-colors flex items-center gap-1.5 disabled:opacity-30"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Queue ({totalImages})</span>
          </button>
        )}

        {/* Theme Studio Button */}
        {onOpenThemeModal && (
          <button
            id="open-theme-studio-btn"
            type="button"
            onClick={onOpenThemeModal}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/25 bg-slate-100/90 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 text-xs font-semibold"
            title="Open Theme & UI Look Studio (Cyberpunk, Neon, Hacker, Material, Glass, Clay, Skeuomorphic)"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: activeThemeConfig.accentColor }}
            />
            <span className="hidden sm:inline font-bold">
              {activeThemeConfig.name}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-slate-700 dark:text-white/80 font-bold uppercase tracking-wider hidden md:inline">
              {activeStyleConfig.badge}
            </span>
            <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-white/50" />
          </button>
        )}

        <div className="h-6 w-[1px] bg-slate-200 dark:bg-white/10 hidden sm:block"></div>

        {/* Dark / Light Mode toggle styled with immersive pill */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider hidden sm:inline">
            {darkMode ? 'Dark' : 'Light'}
          </span>
          <button
            id="theme-toggle-btn"
            type="button"
            onClick={onToggleTheme}
            className={`w-11 h-6 rounded-full relative p-0.5 cursor-pointer transition-colors shadow-inner ${
              darkMode ? 'bg-blue-600 shadow-black/40' : 'bg-slate-300 shadow-slate-400/40'
            }`}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform flex items-center justify-center ${
                darkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            >
              {darkMode ? (
                <Moon className="w-3 h-3 text-blue-600" />
              ) : (
                <Sun className="w-3 h-3 text-amber-500" />
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
