/**
 * Comprehensive Dynamic Theme Engine for E-Gramin Service Platform
 * Features:
 * - 7 Curated Presets + Custom Any-Hex Color Generator
 * - Algorithmic 50-950 Shade Generator using HSL & Luminance
 * - 3 Dark Mode Surface Tones (Slate, OLED Midnight, Warm Stone)
 * - Corner Radius & UI Density Modes
 * - Dynamic Typography Fonts
 * - Custom Brand Name & Portal Tagline
 * - JSON Export & Import for Company Brand Profiles
 */

export type ThemePreset =
  | 'emerald'
  | 'indigo'
  | 'violet'
  | 'cyan'
  | 'amber'
  | 'rose'
  | 'monochrome'
  | 'custom';

export type SurfaceTone = 'slate' | 'oled' | 'stone';
export type RadiusPreset = 'sharp' | 'modern' | 'smooth';
export type DensityMode = 'comfortable' | 'compact';
export type FontFamilyPreset = 'inter' | 'outfit' | 'jakarta' | 'roboto';

export interface ThemeShades {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface ThemePresetOption {
  id: ThemePreset;
  name: string;
  description: string;
  primaryHex: string;
  gradient: string;
  shades: ThemeShades;
}

export interface ThemeConfig {
  preset: ThemePreset;
  customPrimaryHex: string;
  surfaceTone: SurfaceTone;
  radius: RadiusPreset;
  density: DensityMode;
  fontFamily: FontFamilyPreset;
  enableGlowEffects: boolean;
  highContrast: boolean;
  brandName?: string;
  brandTagline?: string;
}

export const THEME_PRESETS: Record<Exclude<ThemePreset, 'custom'>, ThemePresetOption> = {
  emerald: {
    id: 'emerald',
    name: 'Emerald Pro (Default)',
    description: 'Refined premium emerald with teal undertones — corporate, modern, financial',
    primaryHex: '#059669',
    gradient: 'from-emerald-600 to-teal-500',
    shades: {
      50: '#ecfdf6',
      100: '#d0fbe7',
      200: '#a3f5d4',
      300: '#6ce8bc',
      400: '#37d3a2',
      500: '#12b887',
      600: '#059a6f',
      700: '#047c5a',
      800: '#066349',
      900: '#07503d',
      950: '#042b20',
    },
  },
  indigo: {
    id: 'indigo',
    name: 'Royal Indigo',
    description: 'Deep enterprise blue and sleek royal indigo',
    primaryHex: '#4f46e5',
    gradient: 'from-indigo-600 to-blue-500',
    shades: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
      950: '#1e1b4b',
    },
  },
  violet: {
    id: 'violet',
    name: 'Cyber Violet',
    description: 'Modern high-contrast purple and vibrant violet',
    primaryHex: '#7c3aed',
    gradient: 'from-purple-600 to-pink-500',
    shades: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
      950: '#2e1065',
    },
  },
  cyan: {
    id: 'cyan',
    name: 'Ocean Cyan',
    description: 'High-tech cyan and futuristic ocean teal',
    primaryHex: '#0891b2',
    gradient: 'from-cyan-600 to-blue-500',
    shades: {
      50: '#ecfeff',
      100: '#cffafe',
      200: '#a5f3fc',
      300: '#67e8f9',
      400: '#22d3ee',
      500: '#06b6d4',
      600: '#0891b2',
      700: '#0e7490',
      800: '#155e75',
      900: '#164e63',
      950: '#083344',
    },
  },
  amber: {
    id: 'amber',
    name: 'Sunset Amber',
    description: 'Warm gold, luxury copper and energetic amber',
    primaryHex: '#d97706',
    gradient: 'from-amber-600 to-orange-500',
    shades: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03',
    },
  },
  rose: {
    id: 'rose',
    name: 'Crimson Rose',
    description: 'Bold ruby crimson and dynamic rose accents',
    primaryHex: '#e11d48',
    gradient: 'from-rose-600 to-pink-500',
    shades: {
      50: '#fff1f2',
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: '#f43f5e',
      600: '#e11d48',
      700: '#be123c',
      800: '#9f1239',
      900: '#881337',
      950: '#4c0519',
    },
  },
  monochrome: {
    id: 'monochrome',
    name: 'Monochrome Stealth',
    description: 'Ultra-minimalist slate, zinc, and titanium steel',
    primaryHex: '#475569',
    gradient: 'from-slate-700 to-zinc-600',
    shades: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
  },
};

export const SURFACE_TONES: Record<SurfaceTone, { name: string; description: string; darkBg: string; darkCard: string; darkBorder: string }> = {
  slate: {
    name: 'Slate Blue (Default)',
    description: 'Rich dark slate with high-tech blue undertones',
    darkBg: '#020617', // slate-950
    darkCard: '#0f172a', // slate-900
    darkBorder: '#1e293b', // slate-800
  },
  oled: {
    name: 'Midnight OLED (Pitch Black)',
    description: 'Pure 0% black background for maximum OLED contrast',
    darkBg: '#000000', // true black
    darkCard: '#09090b', // zinc-950
    darkBorder: '#18181b', // zinc-900
  },
  stone: {
    name: 'Warm Stone (Deep Neutral)',
    description: 'Earthy organic dark stone with warm gray surfaces',
    darkBg: '#0c0a09', // stone-950
    darkCard: '#1c1917', // stone-900
    darkBorder: '#292524', // stone-800
  },
};

export const RADIUS_VALUES: Record<RadiusPreset, { name: string; cssRadius: string; twClass: string }> = {
  sharp: { name: 'Sharp Minimal (6px)', cssRadius: '0.375rem', twClass: 'rounded-md' },
  modern: { name: 'Modern Rounded (12px)', cssRadius: '0.75rem', twClass: 'rounded-xl' },
  smooth: { name: 'Smooth Pill (18px)', cssRadius: '1.125rem', twClass: 'rounded-2xl' },
};

export const FONT_FAMILIES: Record<FontFamilyPreset, { name: string; fontStack: string; category: string }> = {
  inter: {
    name: 'Inter / System Default',
    fontStack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    category: 'Balanced UI',
  },
  outfit: {
    name: 'Outfit (Modern Geometric)',
    fontStack: '"Outfit", "Plus Jakarta Sans", system-ui, sans-serif',
    category: 'Clean & Modern',
  },
  jakarta: {
    name: 'Plus Jakarta Sans',
    fontStack: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
    category: 'Fintech Corporate',
  },
  roboto: {
    name: 'Roboto (Sharp Enterprise)',
    fontStack: '"Roboto", "Helvetica Neue", Arial, sans-serif',
    category: 'High Readability',
  },
};

export const QUICK_CUSTOM_SWATCHES = [
  '#0284c7', // Sky Blue
  '#059669', // Emerald
  '#4f46e5', // Royal Indigo
  '#7c3aed', // Purple Violet
  '#d97706', // Amber Gold
  '#e11d48', // Crimson Rose
  '#ea580c', // Electric Orange
  '#0d9488', // Deep Teal
  '#db2777', // Fuchsia
  '#475569', // Slate Steel
];

export const DEFAULT_THEME: ThemeConfig = {
  preset: 'emerald',
  customPrimaryHex: '#059669',
  surfaceTone: 'slate',
  radius: 'modern',
  density: 'comfortable',
  fontFamily: 'inter',
  enableGlowEffects: true,
  highContrast: false,
  brandName: 'E-Gramin Dashboard',
  brandTagline: 'Client Management',
};

const THEME_STORAGE_KEY = 'csmp_custom_theme_config';

/**
 * Reads stored theme configuration from localStorage or returns default.
 */
export function getStoredTheme(): ThemeConfig {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_THEME, ...parsed };
    }
  } catch (err) {
    console.warn('Failed to parse stored theme config:', err);
  }
  return DEFAULT_THEME;
}

/**
 * Generates a full 11-step 50-950 Tailwind shade palette from ANY arbitrary Hex color.
 */
export function generateShadesFromHex(baseHex: string): ThemeShades {
  const cleanHex = baseHex.startsWith('#') ? baseHex : `#${baseHex}`;
  const hsl = hexToHsl(cleanHex);

  return {
    50: hslToHex(hsl.h, Math.min(100, hsl.s * 0.95), 97),
    100: hslToHex(hsl.h, Math.min(100, hsl.s * 0.95), 92),
    200: hslToHex(hsl.h, Math.min(100, hsl.s * 0.9), 83),
    300: hslToHex(hsl.h, Math.min(100, hsl.s * 0.9), 70),
    400: hslToHex(hsl.h, Math.min(100, hsl.s * 0.92), 58),
    500: cleanHex, // Exact base color
    600: hslToHex(hsl.h, Math.min(100, hsl.s * 0.95), 44),
    700: hslToHex(hsl.h, Math.min(100, hsl.s * 0.95), 35),
    800: hslToHex(hsl.h, Math.min(100, hsl.s * 0.9), 27),
    900: hslToHex(hsl.h, Math.min(100, hsl.s * 0.85), 18),
    950: hslToHex(hsl.h, Math.min(100, hsl.s * 0.8), 10),
  };
}

/**
 * Applies theme CSS variables to document root and body.
 */
export function applyTheme(config: ThemeConfig): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Determine active shades & primary color
  let activeShades: ThemeShades;
  let primaryHex: string;

  if (config.preset === 'custom' && config.customPrimaryHex) {
    primaryHex = config.customPrimaryHex;
    activeShades = generateShadesFromHex(config.customPrimaryHex);
  } else {
    const preset = THEME_PRESETS[config.preset as keyof typeof THEME_PRESETS] || THEME_PRESETS.emerald;
    primaryHex = preset.primaryHex;
    activeShades = preset.shades;
  }

  const surface = SURFACE_TONES[config.surfaceTone] || SURFACE_TONES.slate;
  const radius = RADIUS_VALUES[config.radius] || RADIUS_VALUES.modern;
  const font = FONT_FAMILIES[config.fontFamily] || FONT_FAMILIES.inter;

  // 1. Set Primary Color Shades for Tailwind @theme & CSS vars.
  //    Every color family (indigo, emerald, purple, violet, cyan, amber,
  //    rose, blue) maps to these in index.css, so setting them here
  //    recolors the entire dashboard and every component at once.
  const THEME_COLOR_FAMILIES = ['primary', 'indigo', 'emerald', 'purple', 'violet', 'cyan', 'amber', 'rose', 'blue', 'red', 'orange', 'yellow', 'teal'];
  Object.entries(activeShades).forEach(([shade, hex]) => {
    THEME_COLOR_FAMILIES.forEach(family => {
      root.style.setProperty(`--color-${family}-${shade}`, hex);
    });
    root.style.setProperty(`--primary-${shade}`, hex); // Backward compatibility mapping
  });

  // 2. Main Brand Color & Glow
  root.style.setProperty('--brand-primary', primaryHex);
  root.style.setProperty('--brand-primary-rgb', hexToRgb(primaryHex));
  root.style.setProperty('--app-border-radius', radius.cssRadius);
  root.style.setProperty('--app-font-family', font.fontStack);

  // 3. Dark Mode Surface Overrides
  root.style.setProperty('--dark-surface-bg', surface.darkBg);
  root.style.setProperty('--dark-surface-card', surface.darkCard);
  root.style.setProperty('--dark-surface-border', surface.darkBorder);

  // 4. Glow Effects
  root.style.setProperty(
    '--brand-glow-opacity',
    config.enableGlowEffects ? '0.18' : '0'
  );

  // 5. Density Mode
  if (config.density === 'compact') {
    root.classList.add('density-compact');
  } else {
    root.classList.remove('density-compact');
  }

  // 6. High Contrast Mode
  if (config.highContrast) {
    root.classList.add('theme-high-contrast');
  } else {
    root.classList.remove('theme-high-contrast');
  }

  // 7. Surface tone dataset
  root.dataset.surface = config.surfaceTone;
  root.dataset.themePreset = config.preset;

  // Persist
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Failed to persist theme config:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Color Mathematics Utilities (RGB / HSL Conversion)
// ─────────────────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  let c = hex.replace(/^#/, '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let c = hex.replace(/^#/, '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
