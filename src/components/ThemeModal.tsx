import React, { useState, useEffect } from 'react';
import {
  X,
  Palette,
  Sparkles,
  Check,
  Zap,
  Terminal,
  Gamepad2,
  Layers,
  Crown,
  Droplets,
  Box,
  Compass,
  Sliders,
} from 'lucide-react';
import {
  AppTheme,
  UiLookStyle,
  THEME_PRESETS,
  UI_LOOK_STYLES,
  getThemeConfig,
  getUiStyleConfig,
} from '../utils/themePresets';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: AppTheme;
  currentStyle: UiLookStyle;
  onSelectTheme: (theme: AppTheme) => void;
  onSelectStyle: (style: UiLookStyle) => void;
}

type ThemeCategory = 'all' | 'cyber' | 'gaming' | 'material' | 'luxury' | 'studio';

export const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  currentStyle,
  onSelectTheme,
  onSelectStyle,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>('all');
  const [activeTab, setActiveTab] = useState<'themes' | 'styles'>('themes');

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredThemes = THEME_PRESETS.filter((t) => {
    if (selectedCategory === 'all') return true;
    return t.category === selectedCategory;
  });

  const activeThemeConfig = getThemeConfig(currentTheme);
  const activeStyleConfig = getUiStyleConfig(currentStyle);

  const quickCombos = [
    {
      title: 'Night City Overdrive',
      theme: 'cyberpunk' as AppTheme,
      style: 'cyber-hud' as UiLookStyle,
      desc: 'Cyberpunk 2077 with 45° angular HUD armor',
      color: '#00f0ff',
    },
    {
      title: 'Aero Retrowave',
      theme: 'neon-synthwave' as AppTheme,
      style: 'glassmorphism' as UiLookStyle,
      desc: 'Neon 80s Outrun with luminous frosted glass',
      color: '#ff2a85',
    },
    {
      title: 'Matrix Console',
      theme: 'hacker-matrix' as AppTheme,
      style: 'cyber-hud' as UiLookStyle,
      desc: 'Green phosphor CRT with tactical code brackets',
      color: '#00ff66',
    },
    {
      title: 'Fluid Material 3',
      theme: 'material-you' as AppTheme,
      style: 'liquid-glass' as UiLookStyle,
      desc: 'Indigo Material You with organic liquid water curves',
      color: '#6366f1',
    },
    {
      title: 'Royal Skeuomorphic',
      theme: 'luxury-gold' as AppTheme,
      style: 'skeuomorphism' as UiLookStyle,
      desc: '24K Obsidian gold with tactile extruded physical depth',
      color: '#eab308',
    },
    {
      title: 'Botanical Clay',
      theme: 'material-emerald' as AppTheme,
      style: 'claymorphism' as UiLookStyle,
      desc: 'Sage forest greens with plump 3D bubble clay toys',
      color: '#10b981',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-white/10 shadow-2xl text-slate-900 dark:text-white overflow-hidden transition-all duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-modal-title"
      >
        {/* Header Bar */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="theme-modal-title" className="text-lg font-bold tracking-tight">
                  Themes & Visual Aesthetics Studio
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Live Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-white/50">
                Choose color palettes and UI looks (Glassmorphism, Skeuomorphism, Claymorphism, Cyber HUD)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close theme modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Themes vs UI Styles vs Quick Combos) */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0c0d12]">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('themes')}
              className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'themes'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Color Themes ({THEME_PRESETS.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('styles')}
              className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'styles'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>UI Look & Morphism ({UI_LOOK_STYLES.length})</span>
            </button>
          </div>

          {/* Current Active Badges */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] text-slate-400 dark:text-white/40 uppercase font-semibold tracking-wider hidden sm:inline">
              Active:
            </span>
            <span
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5"
              style={{
                borderColor: `${activeThemeConfig.accentColor}50`,
                backgroundColor: `${activeThemeConfig.accentColor}15`,
                color: activeThemeConfig.accentColor,
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeThemeConfig.accentColor }} />
              {activeThemeConfig.name}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white/90 border border-slate-200 dark:border-white/10">
              {activeStyleConfig.name}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'themes' ? (
            <>
              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'all', label: 'All Themes', icon: Sparkles },
                  { id: 'cyber', label: 'Cyber & Hacker', icon: Terminal },
                  { id: 'gaming', label: 'Gaming HUD', icon: Gamepad2 },
                  { id: 'material', label: 'Material 3', icon: Layers },
                  { id: 'luxury', label: 'Luxury Obsidian', icon: Crown },
                  { id: 'studio', label: 'Classic Studio', icon: Sliders },
                ].map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id as ThemeCategory)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Theme Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredThemes.map((theme) => {
                  const isActive = currentTheme === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => onSelectTheme(theme.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between gap-3 text-left ${
                        isActive
                          ? 'ring-2 ring-blue-500 dark:ring-blue-400 bg-slate-50 dark:bg-white/[0.06] border-blue-500/40 shadow-lg'
                          : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      {/* Top banner swatch */}
                      <div
                        className="h-10 rounded-xl w-full border border-black/10 dark:border-white/10 shadow-inner flex items-center justify-between px-3"
                        style={{ background: theme.previewGradient }}
                      >
                        <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-xs">
                          {theme.badge}
                        </span>
                        {isActive && (
                          <span className="w-5 h-5 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-md">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      {/* Theme Info */}
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {theme.name}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-white/50 mt-1 line-clamp-2">
                          {theme.tagline}
                        </p>
                      </div>

                      {/* Color dots preview */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20"
                            style={{ backgroundColor: theme.accentColor }}
                            title={`Accent: ${theme.accentColor}`}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20"
                            style={{ backgroundColor: theme.secondaryColor }}
                            title={`Secondary: ${theme.secondaryColor}`}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20"
                            style={{ backgroundColor: theme.bgColor }}
                            title={`Base: ${theme.bgColor}`}
                          />
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-white/30">
                          {theme.isDark ? 'Dark Base' : 'Light Base'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Popular Combos Section */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs uppercase tracking-widest font-bold text-slate-400 dark:text-white/40">
                    Curated Signature Combos (1-Click Apply)
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {quickCombos.map((combo, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onSelectTheme(combo.theme);
                        onSelectStyle(combo.style);
                      }}
                      className="p-3.5 rounded-xl text-left bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.07] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {combo.title}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: combo.color }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-white/50">
                        {combo.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* UI Look & Morphism Selection */}
              <div className="space-y-4">
                <div className="text-xs text-slate-500 dark:text-white/50">
                  Morphism styles change the physics, elevation, blur, border curvature, and tactile shadows of all cards, buttons, sidebars, and dialogs.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {UI_LOOK_STYLES.map((style) => {
                    const isActive = currentStyle === style.id;
                    return (
                      <div
                        key={style.id}
                        onClick={() => onSelectStyle(style.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-3 text-left ${
                          isActive
                            ? 'ring-2 ring-emerald-500 dark:ring-emerald-400 bg-slate-50 dark:bg-white/[0.06] border-emerald-500/40 shadow-lg'
                            : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        {/* Live Morphism Preview Box */}
                        <div className="h-20 rounded-xl w-full p-3 flex flex-col justify-between bg-gradient-to-br from-slate-800 to-slate-950 relative overflow-hidden">
                          {/* Inner preview shape */}
                          <div
                            className={`w-full h-full p-2.5 flex items-center justify-between text-white ${style.previewClass}`}
                          >
                            <span className="text-[11px] font-bold tracking-tight">
                              {style.name}
                            </span>
                            {isActive && (
                              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                              {style.name}
                            </h4>
                            <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60">
                              {style.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-white/50 mt-1">
                            {style.description}
                          </p>
                        </div>

                        <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 pt-2 border-t border-slate-200 dark:border-white/5">
                          ✓ {style.featureNote}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="text-xs text-slate-500 dark:text-white/50">
            Aesthetic updates are applied instantaneously and saved to your device.
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
