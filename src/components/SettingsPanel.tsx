import React, { useState } from 'react';
import { Sliders, RefreshCw, Sparkles, Shield, Maximize2, Cpu, ChevronDown, ChevronUp, Video, VolumeX, Volume2, Eraser, Zap, Brain } from 'lucide-react';
import { CompressionSettings } from '../types';

interface SettingsPanelProps {
  settings: CompressionSettings;
  onChangeSettings: (newSettings: CompressionSettings) => void;
  onResetSettings: () => void;
  disabled?: boolean;
  className?: string;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onChangeSettings,
  onResetSettings,
  disabled = false,
  className = '',
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleQualityPreset = (val: number) => {
    onChangeSettings({ ...settings, quality: val });
  };

  const handleDimensionPreset = (w: number | null, h: number | null) => {
    onChangeSettings({ ...settings, maxWidth: w, maxHeight: h });
  };

  return (
    <aside
      className={`bg-slate-50/70 dark:bg-[#080808] border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/10 p-5 sm:p-6 flex flex-col justify-between overflow-y-auto transition-colors ${className}`}
    >
      <div className="space-y-6">
        {/* Header with Reset */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Engine Settings
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="reset-settings-btn"
              type="button"
              disabled={disabled}
              onClick={onResetSettings}
              className="text-[10px] uppercase font-bold text-slate-500 hover:text-blue-600 dark:text-white/40 dark:hover:text-blue-400 flex items-center gap-1 transition-colors disabled:opacity-30 cursor-pointer"
              title="Reset to defaults"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>

            {/* Mobile accordion toggle */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="lg:hidden p-1 text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white"
            >
              {isMobileOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Settings Body (always visible on desktop, toggleable on mobile) */}
        <div className={`space-y-6 ${isMobileOpen ? 'block' : 'hidden lg:block'}`}>
          {/* SECTION 1: Quality & Compression Level */}
          <section className="border-t border-slate-200 dark:border-white/5 pt-4">
            <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-3.5 block">
              Compression Level
            </label>

            <div className="space-y-4">
              {/* Quality Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400" /> Quality / Bitrate
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
                    {settings.quality}%
                  </span>
                </div>

                <div className="relative flex items-center">
                  <input
                    id="quality-slider"
                    type="range"
                    min="1"
                    max="100"
                    value={settings.quality}
                    disabled={disabled}
                    onChange={(e) =>
                      onChangeSettings({
                        ...settings,
                        quality: parseInt(e.target.value, 10) || 80,
                      })
                    }
                    className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500 disabled:opacity-30"
                  />
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-4 gap-1 mt-2.5">
                  {[
                    { label: 'Max', val: 92 },
                    { label: 'High', val: 80 },
                    { label: 'Med', val: 65 },
                    { label: 'Low', val: 45 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleQualityPreset(p.val)}
                      className={`text-[10px] font-mono py-1 rounded transition-all border cursor-pointer ${
                        settings.quality === p.val
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/30'
                          : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                    <Maximize2 className="w-3 h-3 text-indigo-500 dark:text-indigo-400" /> Max Resolution Bounds
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-white/30 uppercase">Aspect Locked</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-500 dark:text-white/30 uppercase mb-1 block">Max Width</label>
                    <input
                      id="max-width-input"
                      type="number"
                      placeholder="Original"
                      disabled={disabled}
                      value={settings.maxWidth || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value, 10) : null;
                        onChangeSettings({ ...settings, maxWidth: val && val > 0 ? val : null });
                      }}
                      className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 dark:text-white/30 uppercase mb-1 block">Max Height</label>
                    <input
                      id="max-height-input"
                      type="number"
                      placeholder="Original"
                      disabled={disabled}
                      value={settings.maxHeight || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value, 10) : null;
                        onChangeSettings({ ...settings, maxHeight: val && val > 0 ? val : null });
                      }}
                      className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Dimension Presets */}
                <div className="grid grid-cols-5 gap-1 mt-2">
                  {[
                    { label: 'Orig', w: null, h: null },
                    { label: '4K', w: 3840, h: 2160 },
                    { label: '1080p', w: 1920, h: 1080 },
                    { label: '720p', w: 1280, h: 720 },
                    { label: '480p', w: 854, h: 480 },
                  ].map((dp, i) => {
                    const isActive = settings.maxWidth === dp.w && settings.maxHeight === dp.h;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleDimensionPreset(dp.w, dp.h)}
                        className={`text-[10px] font-mono py-1 rounded transition-all border cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/30'
                            : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        {dp.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: Video Optimization Settings */}
          <section className="border-t border-slate-200 dark:border-white/5 pt-4">
            <div className="flex items-center gap-1.5 mb-3.5">
              <Video className="w-3.5 h-3.5 text-indigo-500" />
              <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest block">
                Video Controls
              </label>
            </div>

            <div className="space-y-3">
              {/* Target Framerate */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-2xs">
                <div>
                  <span className="text-xs text-slate-800 dark:text-white/90 font-medium block">Video Framerate</span>
                  <span className="text-[10px] text-slate-500 dark:text-white/40">Smooth playback</span>
                </div>
                <select
                  disabled={disabled}
                  value={settings.videoFps || 30}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, videoFps: parseInt(e.target.value, 10) || 30 })
                  }
                  className="bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-white text-[11px] font-mono px-2 py-1 rounded outline-none cursor-pointer focus:border-blue-500"
                >
                  <option value={24} className="bg-white dark:bg-[#111]">24 FPS</option>
                  <option value={30} className="bg-white dark:bg-[#111]">30 FPS (Standard)</option>
                  <option value={60} className="bg-white dark:bg-[#111]">60 FPS (Fluid)</option>
                </select>
              </div>

              {/* Mute Audio Option */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  {settings.muteAudio ? (
                    <VolumeX className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                  <div>
                    <span className="text-xs text-slate-800 dark:text-white/90 font-medium block">Mute Audio Track</span>
                    <span className="text-[10px] text-slate-500 dark:text-white/40">
                      {settings.muteAudio ? 'Removes audio for smaller file' : 'Preserves audio stream'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChangeSettings({ ...settings, muteAudio: !settings.muteAudio })}
                  className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${
                    settings.muteAudio ? 'bg-amber-600' : 'bg-slate-300 dark:bg-white/10'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.muteAudio ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* SECTION 3: Image Formats & System Settings */}
          <section className="border-t border-slate-200 dark:border-white/5 pt-4">
            <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-3.5 block">
              Image & Performance
            </label>

            <div className="space-y-3">
              {/* Keep Format Toggle */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-2xs">
                <div>
                  <span className="text-xs text-slate-800 dark:text-white/90 font-medium block">Keep Format</span>
                  <span className="text-[10px] text-slate-500 dark:text-white/40">Retain original extension</span>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const next = !settings.keepOriginalFormat;
                    onChangeSettings({
                      ...settings,
                      keepOriginalFormat: next,
                      convertToWebp: next ? false : settings.convertToWebp,
                    });
                  }}
                  className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${
                    settings.keepOriginalFormat ? 'bg-blue-600' : 'bg-slate-300 dark:bg-white/10'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.keepOriginalFormat ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Convert to WebP Toggle */}
              <div
                className={`flex items-center justify-between p-2 rounded-lg bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-2xs transition-opacity ${
                  settings.keepOriginalFormat ? 'opacity-40 pointer-events-none' : 'opacity-100'
                }`}
              >
                <div>
                  <span className="text-xs text-slate-800 dark:text-white/90 font-medium block">Convert Images to WebP</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400">Maximum compression</span>
                </div>
                <button
                  type="button"
                  disabled={disabled || settings.keepOriginalFormat}
                  onClick={() => onChangeSettings({ ...settings, convertToWebp: !settings.convertToWebp })}
                  className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${
                    settings.convertToWebp && !settings.keepOriginalFormat ? 'bg-blue-600' : 'bg-slate-300 dark:bg-white/10'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.convertToWebp && !settings.keepOriginalFormat ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Concurrency Threads */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs text-slate-800 dark:text-white/90 font-medium">Parallel Threads</span>
                </div>
                <select
                  disabled={disabled}
                  value={settings.concurrency}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, concurrency: parseInt(e.target.value, 10) || 4 })
                  }
                  className="bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-white text-[11px] font-mono px-2 py-1 rounded outline-none cursor-pointer focus:border-blue-500"
                >
                  <option value={1} className="bg-white dark:bg-[#111]">1 Thread</option>
                  <option value={2} className="bg-white dark:bg-[#111]">2 Threads</option>
                  <option value={4} className="bg-white dark:bg-[#111]">4 Threads</option>
                  <option value={6} className="bg-white dark:bg-[#111]">6 Threads</option>
                  <option value={8} className="bg-white dark:bg-[#111]">8 Threads</option>
                </select>
              </div>

              {/* Strip EXIF */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  <div>
                    <span className="text-xs text-slate-800 dark:text-white/90 font-medium block">Strip EXIF / Metadata</span>
                    <span className="text-[10px] text-slate-500 dark:text-white/40">Enhanced privacy</span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChangeSettings({ ...settings, stripExif: !settings.stripExif })}
                  className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${
                    settings.stripExif ? 'bg-blue-600' : 'bg-slate-300 dark:bg-white/10'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.stripExif ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* SECTION 4: Background Removal Settings */}
          <section className="border-t border-slate-200 dark:border-white/5 pt-4">
            <div className="flex items-center gap-1.5 mb-3.5">
              <Eraser className="w-3.5 h-3.5 text-fuchsia-500" />
              <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest block">
                BG Removal Engine
              </label>
            </div>

            <div className="space-y-3">
              {/* Engine Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/60 dark:bg-white/5 rounded-xl border border-slate-300/50 dark:border-white/5">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChangeSettings({ ...settings, bgEngine: 'studio' })}
                  className={`flex flex-col items-center py-2 px-2 rounded-lg text-center transition-all cursor-pointer ${
                    (settings.bgEngine ?? 'studio') === 'studio'
                      ? 'bg-white dark:bg-white/10 text-fuchsia-600 dark:text-fuchsia-400 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px]">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>Studio Fast</span>
                  </div>
                  <span className="text-[9px] opacity-70">~50ms / image</span>
                </button>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChangeSettings({ ...settings, bgEngine: 'ai' })}
                  className={`flex flex-col items-center py-2 px-2 rounded-lg text-center transition-all cursor-pointer ${
                    settings.bgEngine === 'ai'
                      ? 'bg-white dark:bg-white/10 text-fuchsia-600 dark:text-fuchsia-400 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px]">
                    <Brain className="w-3 h-3 text-fuchsia-500" />
                    <span>AI Model</span>
                  </div>
                  <span className="text-[9px] opacity-70">Complex scenes</span>
                </button>
              </div>

              {/* Studio Mode Controls */}
              {(settings.bgEngine ?? 'studio') === 'studio' ? (
                <div className="space-y-2.5 p-2.5 rounded-lg bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                  <div className="text-[10px] text-slate-500 dark:text-white/50 leading-tight">
                    ⚡ <strong className="text-slate-700 dark:text-white/80">300x faster</strong>: Automatically detects perimeter white/studio backdrops with anti-aliased edge feathering. Perfect for product catalog photos.
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[10px] mb-1">
                      <span className="text-slate-600 dark:text-white/70">Color Tolerance</span>
                      <span className="font-mono text-fuchsia-600 dark:text-fuchsia-400 font-bold">{settings.bgTolerance ?? 32}</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="70"
                      value={settings.bgTolerance ?? 32}
                      disabled={disabled}
                      onChange={(e) =>
                        onChangeSettings({
                          ...settings,
                          bgTolerance: parseInt(e.target.value, 10) || 32,
                        })
                      }
                      className="w-full accent-fuchsia-600 h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                /* AI Neural Net Controls */
                <div className="space-y-2.5 p-2.5 rounded-lg bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                  <div className="text-[10px] text-slate-500 dark:text-white/50 leading-tight">
                    🧠 Deep learning U-Net (ISNet). Downloads neural weights and runs in-browser. Serialized processing to prevent memory lockup.
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-800 dark:text-white/90 font-medium">Model Precision</span>
                    <select
                      disabled={disabled}
                      value={settings.bgAiModel ?? 'small'}
                      onChange={(e) =>
                        onChangeSettings({
                          ...settings,
                          bgAiModel: e.target.value as 'small' | 'medium',
                        })
                      }
                      className="bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-white text-[11px] font-mono px-2 py-1 rounded outline-none cursor-pointer focus:border-fuchsia-500"
                    >
                      <option value="small" className="bg-white dark:bg-[#111]">INT8 Quantized (Faster)</option>
                      <option value="medium" className="bg-white dark:bg-[#111]">FP16 (High Quality)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Privacy Card */}
      <div className="mt-6 p-4 rounded-xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 hidden lg:block transition-colors">
        <p className="text-[10px] text-slate-500 dark:text-white/40 leading-relaxed italic">
          All processing executes directly on your device inside your browser sandbox. Zero files or telemetry are uploaded.
        </p>
      </div>
    </aside>
  );
};
