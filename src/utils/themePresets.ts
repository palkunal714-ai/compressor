export type AppTheme =
  | 'cyberpunk'
  | 'neon-synthwave'
  | 'hacker-matrix'
  | 'gamer-mecha'
  | 'material-you'
  | 'material-emerald'
  | 'material-sunset'
  | 'luxury-gold'
  | 'midnight-pro'
  | 'clean-light';

export type UiLookStyle =
  | 'default'
  | 'glassmorphism'
  | 'liquid-glass'
  | 'skeuomorphism'
  | 'claymorphism'
  | 'cyber-hud';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  tagline: string;
  category: 'cyber' | 'gaming' | 'material' | 'luxury' | 'studio';
  accentColor: string;
  secondaryColor: string;
  bgColor: string;
  isDark: boolean;
  badge: string;
  description: string;
  previewGradient: string;
}

export interface UiStyleConfig {
  id: UiLookStyle;
  name: string;
  description: string;
  badge: string;
  previewClass: string;
  featureNote: string;
}

export const THEME_STORAGE_PRESET_KEY = 'bulkpress_app_theme';
export const THEME_STORAGE_STYLE_KEY = 'bulkpress_app_style';

export const THEME_PRESETS: ThemeConfig[] = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk 2077',
    tagline: 'High-tech low-life, neon cyan & yellow hazard cuts',
    category: 'cyber',
    accentColor: '#00f0ff',
    secondaryColor: '#fcee0a',
    bgColor: '#08090d',
    isDark: true,
    badge: 'CYBER',
    description: 'Electric neon cyan & yellow glow with high-contrast dark chassis and cyber grids.',
    previewGradient: 'linear-gradient(135deg, #00f0ff 0%, #08090d 50%, #fcee0a 100%)',
  },
  {
    id: 'neon-synthwave',
    name: 'Neon Synthwave',
    tagline: '80s Outrun retrowave, laser magenta & electric cyan',
    category: 'cyber',
    accentColor: '#ff2a85',
    secondaryColor: '#00fff0',
    bgColor: '#0b021a',
    isDark: true,
    badge: 'RETRO 84',
    description: 'Vibrant neon purple, laser magenta glow and electric cyan gridlines.',
    previewGradient: 'linear-gradient(135deg, #ff2a85 0%, #15062c 50%, #00fff0 100%)',
  },
  {
    id: 'hacker-matrix',
    name: 'Hacker Terminal',
    tagline: 'Phosphor green CRT, dark code matrix, terminal prompts',
    category: 'cyber',
    accentColor: '#00ff66',
    secondaryColor: '#10b981',
    bgColor: '#020904',
    isDark: true,
    badge: 'ROOT_SHELL',
    description: 'Monochrome green CRT bloom with matrix console styling and monospace tracking.',
    previewGradient: 'linear-gradient(135deg, #00ff66 0%, #020904 60%, #05240f 100%)',
  },
  {
    id: 'gamer-mecha',
    name: 'Gamer Mecha HUD',
    tagline: 'Tactical combat red & amber hazard, carbon chassis',
    category: 'gaming',
    accentColor: '#ef4444',
    secondaryColor: '#f59e0b',
    bgColor: '#090b10',
    isDark: true,
    badge: 'ESPORTS',
    description: 'Crimson combat accents, hazard amber warnings, and tactical titanium panels.',
    previewGradient: 'linear-gradient(135deg, #ef4444 0%, #0f1118 50%, #f59e0b 100%)',
  },
  {
    id: 'material-you',
    name: 'Material Expressive',
    tagline: 'Google Material 3 dynamic tonal Indigo & Lavender',
    category: 'material',
    accentColor: '#6366f1',
    secondaryColor: '#a5b4fc',
    bgColor: '#101124',
    isDark: true,
    badge: 'M3 EXPRESSIVE',
    description: 'Smooth Material You tonal elevations, periwinkle pills, and fluid curvature.',
    previewGradient: 'linear-gradient(135deg, #6366f1 0%, #181935 50%, #c7d2fe 100%)',
  },
  {
    id: 'material-emerald',
    name: 'Material Emerald',
    tagline: 'Botanical sage & deep forest green organic tokens',
    category: 'material',
    accentColor: '#10b981',
    secondaryColor: '#34d399',
    bgColor: '#061a13',
    isDark: true,
    badge: 'M3 BOTANICAL',
    description: 'Earthy organic sage and mint surfaces inspired by material ecology.',
    previewGradient: 'linear-gradient(135deg, #10b981 0%, #09261c 50%, #6ee7b7 100%)',
  },
  {
    id: 'material-sunset',
    name: 'Material Sunset',
    tagline: 'Terracotta warmth, desert rose & glowing dusk',
    category: 'material',
    accentColor: '#f97316',
    secondaryColor: '#fb7185',
    bgColor: '#190e15',
    isDark: true,
    badge: 'M3 SUNSET',
    description: 'Warm terracotta, desert sunrise amber, and soft tonal clay radiance.',
    previewGradient: 'linear-gradient(135deg, #f97316 0%, #281622 50%, #fb7185 100%)',
  },
  {
    id: 'luxury-gold',
    name: 'Luxury Obsidian Gold',
    tagline: 'Deep velvet obsidian marble & 24K liquid gold',
    category: 'luxury',
    accentColor: '#eab308',
    secondaryColor: '#f59e0b',
    bgColor: '#070709',
    isDark: true,
    badge: 'ROYAL 24K',
    description: 'Prestige obsidian chassis with polished gold specular trims and champagne satin.',
    previewGradient: 'linear-gradient(135deg, #fef08a 0%, #eab308 30%, #0a0a0c 70%, #ca8a04 100%)',
  },
  {
    id: 'midnight-pro',
    name: 'Midnight Studio',
    tagline: 'Minimal pro dark studio, deep slate & cobalt blue',
    category: 'studio',
    accentColor: '#3b82f6',
    secondaryColor: '#60a5fa',
    bgColor: '#050505',
    isDark: true,
    badge: 'PRO DARK',
    description: 'Refined modern dark mode engineered for maximum contrast and focus.',
    previewGradient: 'linear-gradient(135deg, #3b82f6 0%, #050505 60%, #1e293b 100%)',
  },
  {
    id: 'clean-light',
    name: 'Clean Daylight',
    tagline: 'Crisp Apple-style white surfaces & sapphire accents',
    category: 'studio',
    accentColor: '#2563eb',
    secondaryColor: '#4f46e5',
    bgColor: '#f8fafc',
    isDark: false,
    badge: 'DAYLIGHT',
    description: 'Pristine daylight aesthetic with snow white surfaces and deep cobalt.',
    previewGradient: 'linear-gradient(135deg, #2563eb 0%, #ffffff 50%, #e2e8f0 100%)',
  },
];

export const UI_LOOK_STYLES: UiStyleConfig[] = [
  {
    id: 'default',
    name: 'Modern Crisp',
    description: 'Standard flat geometry, subtle borders, high contrast and clean hierarchy.',
    badge: 'CLASSIC',
    previewClass: 'border border-white/10 bg-white/5',
    featureNote: 'Standard border radius & clean modern shadows',
  },
  {
    id: 'glassmorphism',
    name: 'Frosted Glass',
    description: 'Translucent frosted blur, thin specular glass edges, prismatic diffuse light.',
    badge: 'AERO GLASS',
    previewClass: 'backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl',
    featureNote: '24px backdrop blur + luminous specular border',
  },
  {
    id: 'liquid-glass',
    name: 'Liquid Glass',
    description: 'Organic droplet curves, water-specular reflection, ultra-deep refraction.',
    badge: 'FLUID REFRACT',
    previewClass: 'rounded-2xl backdrop-blur-2xl bg-gradient-to-br from-white/15 to-transparent border border-white/30 shadow-2xl shadow-black/40',
    featureNote: 'Fluid 28px curvature + high refractive sheen',
  },
  {
    id: 'skeuomorphism',
    name: 'Skeuomorphic Soft UI',
    description: 'Tactile physical extrusion, realistic soft dual shadows, click depression.',
    badge: 'NEUMORPHIC',
    previewClass: 'shadow-[6px_6px_14px_rgba(0,0,0,0.5),-4px_-4px_10px_rgba(255,255,255,0.06)] border border-white/5',
    featureNote: 'Extruded dual light/shadow + tactile depth',
  },
  {
    id: 'claymorphism',
    name: 'Claymorphism 3D',
    description: 'Plump 3D bubble clay toy shapes, pillowy rounded edges, dual inset shadows.',
    badge: '3D CLAY',
    previewClass: 'rounded-2xl shadow-[8px_10px_20px_rgba(0,0,0,0.4),inset_-3px_-3px_8px_rgba(0,0,0,0.3),inset_3px_3px_8px_rgba(255,255,255,0.2)] border-2 border-white/15',
    featureNote: 'Pillowy bubble curves + 3D tactile bevels',
  },
  {
    id: 'cyber-hud',
    name: 'Cyber HUD & Armor',
    description: '45° chamfered cut corners, corner crosshairs, tactical combat brackets.',
    badge: 'ANGULAR HUD',
    previewClass: 'border-2 border-cyan-400/40 [clip-path:polygon(0_8px,8px_0,calc(100%-8px)_0,100%_8px,100%_calc(100%-8px),calc(100%-8px)_100%,8px_100%,0_calc(100%-8px))]',
    featureNote: 'Chamfered cut corners + tactical HUD brackets',
  },
];

export function getThemeConfig(themeId: AppTheme): ThemeConfig {
  return THEME_PRESETS.find((t) => t.id === themeId) || THEME_PRESETS[0];
}

export function getUiStyleConfig(styleId: UiLookStyle): UiStyleConfig {
  return UI_LOOK_STYLES.find((s) => s.id === styleId) || UI_LOOK_STYLES[0];
}
