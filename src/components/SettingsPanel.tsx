import React, { useState } from 'react';
import { Sliders, RefreshCw, Sparkles, Shield, Maximize2, Cpu, ChevronDown, ChevronUp } from 'lucide-react';
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
      className={`bg-[#080808] border-b lg:border-b-0 lg:border-r border-white/10 p-5 sm:p-6 flex flex-col justify-between overflow-y-auto ${className}`}
    >
      <div className="space-y-6">
        {/* Header with Reset */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Engine Settings
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="reset-settings-btn"
              type="button"
              disabled={disabled}
              onClick={onResetSettings}
              className="text-[10px] uppercase font-bold text-white/40 hover:text-blue-400 flex items-center gap-1 transition-colors disabled:opacity-30"
              title="Reset to defaults"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>

            {/* Mobile accordion toggle */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="lg:hidden p-1 text-white/60 hover:text-white"
            >
              {isMobileOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Settings Body (always visible on desktop, toggleable on mobile) */}
        <div className={`space-y-6 ${isMobileOpen ? 'block' : 'hidden lg:block'}`}>
          {/* SECTION 1: Compression Logic */}
          <section className="border-t border-white/5 pt-4">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3.5 block">
              Compression Logic
            </label>

            <div className="space-y-4">
              {/* Quality Slider with Electric Blue Glow */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-white/80 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-blue-400" /> Quality
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
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
                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500 disabled:opacity-30"
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
                      className={`text-[10px] font-mono py-1 rounded transition-all border ${
                        settings.quality === p.val
                          ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                          : 'bg-white/5 border-white/5 text-white/50 hover:text-white hover:bg-white/10'
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
                  <span className="text-xs font-medium text-white/80 flex items-center gap-1.5">
                    <Maximize2 className="w-3 h-3 text-indigo-400" /> Max Bounds
                  </span>
                  <span className="text-[9px] text-white/30 uppercase">Aspect Locked</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-white/30 uppercase mb-1 block">Max Width</label>
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
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/30 uppercase mb-1 block">Max Height</label>
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
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Dimension Presets */}
                <div className="grid grid-cols-4 gap-1 mt-2">
                  {[
                    { label: 'Orig', w: null, h: null },
                    { label: '4K', w: 3840, h: 2160 },
                    { label: '1080p', w: 1920, h: 1080 },
                    { label: '720p', w: 1280, h: 720 },
                  ].map((dp, i) => {
                    const isActive = settings.maxWidth === dp.w && settings.maxHeight === dp.h;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleDimensionPreset(dp.w, dp.h)}
                        className={`text-[10px] font-mono py-1 rounded transition-all border ${
                          isActive
                            ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                            : 'bg-white/5 border-white/5 text-white/50 hover:text-white hover:bg-white/10'
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

          {/* SECTION 2: Optimization & Formats */}
          <section className="border-t border-white/5 pt-4">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3.5 block">
              Optimization
            </label>

            <div className="space-y-3">
              {/* Keep Format Toggle */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <div>
                  <span className="text-xs text-white/90 font-medium block">Keep Format</span>
                  <span className="text-[10px] text-white/40">Retain exact extensions</span>
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
                  className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${
                    settings.keepOriginalFormat ? 'bg-blue-600' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`w-3 h-3 bg-white rounded-full transition-transform ${
                      settings.keepOriginalFormat ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Convert to WebP Toggle */}
              <div
                className={`flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 transition-opacity ${
                  settings.keepOriginalFormat ? 'opacity-30 pointer-events-none' : 'opacity-100'
                }`}
              >
                <div>
                  <span className="text-xs text-white/90 font-medium block">Convert to WebP</span>
                  <span className="text-[10px] text-blue-400">Max size efficiency</span>
                </div>
                <button
                  type="button"
                  disabled={disabled || settings.keepOriginalFormat}
                  onClick={() => onChangeSettings({ ...settings, convertToWebp: !settings.convertToWebp })}
                  className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${
                    settings.convertToWebp && !settings.keepOriginalFormat ? 'bg-blue-600' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`w-3 h-3 bg-white rounded-full transition-transform ${
                      settings.convertToWebp && !settings.keepOriginalFormat ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Concurrency Threads */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-white/90 font-medium">Concurrency</span>
                </div>
                <select
                  disabled={disabled}
                  value={settings.concurrency}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, concurrency: parseInt(e.target.value, 10) || 4 })
                  }
                  className="bg-white/5 border border-white/10 text-white text-[11px] font-mono px-2 py-1 rounded outline-none cursor-pointer focus:border-blue-500"
                >
                  <option value={1} className="bg-[#111]">1 Thread</option>
                  <option value={2} className="bg-[#111]">2 Threads</option>
                  <option value={4} className="bg-[#111]">4 Threads</option>
                  <option value={6} className="bg-[#111]">6 Threads</option>
                  <option value={8} className="bg-[#111]">8 Threads</option>
                </select>
              </div>

              {/* Strip EXIF */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <div>
                    <span className="text-xs text-white/90 font-medium block">Strip EXIF / GPS</span>
                    <span className="text-[10px] text-white/40">Enhanced privacy</span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChangeSettings({ ...settings, stripExif: !settings.stripExif })}
                  className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${
                    settings.stripExif ? 'bg-blue-600' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`w-3 h-3 bg-white rounded-full transition-transform ${
                      settings.stripExif ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Privacy Card */}
      <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 hidden lg:block">
        <p className="text-[10px] text-white/40 leading-relaxed italic">
          All processing happens on your device. Zero images or telemetry are uploaded to any server.
        </p>
      </div>
    </aside>
  );
};
