import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  THEME_PRESETS,
  SURFACE_TONES,
  RADIUS_VALUES,
  FONT_FAMILIES,
  QUICK_CUSTOM_SWATCHES,
  ThemePreset,
  SurfaceTone,
  RadiusPreset,
  FontFamilyPreset,
  DensityMode,
  ThemeConfig,
  DEFAULT_THEME,
  generateShadesFromHex,
} from '../../lib/theme';
import {
  Palette,
  Sparkles,
  Check,
  RotateCcw,
  X,
  Sun,
  Moon,
  Layers,
  Sliders,
  Eye,
  CheckCircle2,
  Type,
  Maximize2,
  Minimize2,
  Copy,
  Download,
  Upload,
  Zap,
  CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ThemeCustomizationModal: React.FC = () => {
  const { user } = useAuth();
  const {
    isThemeModalOpen,
    closeThemeModal,
    themeConfig,
    updateThemeConfig,
    resetThemeConfig,
    isDarkMode,
    toggleTheme,
    toast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'surface' | 'typography'>('presets');
  const [hexInput, setHexInput] = useState(themeConfig.customPrimaryHex || '#059669');
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);
  const [hasCopiedJson, setHasCopiedJson] = useState(false);

  if (!isThemeModalOpen) return null;

  const handleSelectPreset = (presetId: ThemePreset) => {
    updateThemeConfig({ preset: presetId });
    toast(`Switched theme preset to ${THEME_PRESETS[presetId as keyof typeof THEME_PRESETS]?.name || 'Custom'}`, 'success');
  };

  const handleCustomHexChange = (hex: string) => {
    setHexInput(hex);
    if (/^#?[0-9A-Fa-f]{6}$/.test(hex)) {
      const clean = hex.startsWith('#') ? hex : `#${hex}`;
      updateThemeConfig({
        preset: 'custom',
        customPrimaryHex: clean,
      });
    }
  };

  const handleSelectSurface = (surface: SurfaceTone) => {
    updateThemeConfig({ surfaceTone: surface });
    toast(`Dark surface tone set to ${SURFACE_TONES[surface].name}`, 'info');
  };

  const handleSelectRadius = (radius: RadiusPreset) => {
    updateThemeConfig({ radius });
    toast(`Corner radius set to ${RADIUS_VALUES[radius].name}`, 'info');
  };

  const handleSelectFont = (font: FontFamilyPreset) => {
    updateThemeConfig({ fontFamily: font });
    toast(`Typography font set to ${FONT_FAMILIES[font].name}`, 'info');
  };

  const handleSelectDensity = (density: DensityMode) => {
    updateThemeConfig({ density });
    toast(`UI density set to ${density === 'compact' ? 'Compact' : 'Comfortable'}`, 'info');
  };

  const handleCopyConfig = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(themeConfig, null, 2));
      setHasCopiedJson(true);
      setTimeout(() => setHasCopiedJson(false), 2500);
      toast('Theme configuration JSON copied to clipboard!', 'success');
    } catch {
      toast('Failed to copy configuration', 'error');
    }
  };

  const handleImportConfig = () => {
    try {
      const parsed = JSON.parse(importJsonText.trim());
      updateThemeConfig(parsed);
      setShowImportBox(false);
      setImportJsonText('');
      toast('Theme configuration loaded and applied successfully!', 'success');
    } catch {
      toast('Invalid JSON format. Please check your syntax and try again.', 'error');
    }
  };

  const handleReset = () => {
    resetThemeConfig();
    setHexInput(DEFAULT_THEME.customPrimaryHex);
    toast('Reset theme configuration to default Emerald Pro styling.', 'info');
  };

  const activeHex =
    themeConfig.preset === 'custom'
      ? themeConfig.customPrimaryHex
      : THEME_PRESETS[themeConfig.preset as keyof typeof THEME_PRESETS]?.primaryHex || '#059669';

  const previewShades =
    themeConfig.preset === 'custom'
      ? generateShadesFromHex(themeConfig.customPrimaryHex)
      : THEME_PRESETS[themeConfig.preset as keyof typeof THEME_PRESETS]?.shades ||
        THEME_PRESETS.emerald.shades;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          onClick={closeThemeModal}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh] transition-colors"
        >
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-md shrink-0 transition-colors"
                style={{ backgroundColor: activeHex }}
              >
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Theme Customization
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Personalize
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Dynamic visual tokens applied platform-wide in real-time.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
              </button>
              <button
                type="button"
                onClick={closeThemeModal}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800/60 active:scale-95 transition-all"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub-Nav Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 bg-white dark:bg-slate-900 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('presets')}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'presets'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Curated Palettes</span>
            </button>

            <button
              onClick={() => setActiveTab('custom')}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'custom'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Custom Hex Color</span>
            </button>

            <button
              onClick={() => setActiveTab('surface')}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'surface'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark Mode Surface</span>
            </button>

            <button
              onClick={() => setActiveTab('typography')}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'typography'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Typography & Geometry</span>
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {/* TAB 1: CURATED COLOR PALETTES */}
            {activeTab === 'presets' && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Select Primary Brand Palette
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(Object.keys(THEME_PRESETS) as (keyof typeof THEME_PRESETS)[]).map((presetKey) => {
                    const preset = THEME_PRESETS[presetKey];
                    const isSelected = themeConfig.preset === presetKey;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all relative group flex items-start gap-3.5 ${
                          isSelected
                            ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {/* Swatch Bubble */}
                        <div
                          className="w-10 h-10 rounded-xl shadow-md shrink-0 flex items-center justify-center text-white"
                          style={{ backgroundColor: preset.primaryHex }}
                        >
                          {isSelected && <Check className="w-5 h-5 drop-shadow-sm" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {preset.name}
                            </h4>
                            <span className="font-mono text-[10px] text-slate-400">
                              {preset.primaryHex}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {preset.description}
                          </p>

                          {/* Color shade strip */}
                          <div className="flex items-center gap-1 mt-2.5">
                            {[100, 300, 500, 700, 900].map((shade) => (
                              <div
                                key={shade}
                                className="w-4 h-2 rounded-sm"
                                style={{ backgroundColor: preset.shades[shade as keyof typeof preset.shades] }}
                              />
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: CUSTOM HEX COLOR PICKER & SHADE GENERATOR */}
            {activeTab === 'custom' && (
              <div className="space-y-5">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Custom Hex Color & Automatic Shade Generator
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Pick your exact company brand color. The platform automatically computes full 50–950 tints and shades.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <input
                        type="color"
                        value={hexInput.startsWith('#') ? hexInput : `#${hexInput}`}
                        onChange={(e) => handleCustomHexChange(e.target.value)}
                        className="w-12 h-12 rounded-xl cursor-pointer border-2 border-slate-300 dark:border-slate-700 bg-transparent p-1 shrink-0"
                        title="Open Native Color Picker"
                      />
                      <div className="relative flex-1 sm:w-40">
                        <input
                          type="text"
                          value={hexInput}
                          maxLength={7}
                          onChange={(e) => handleCustomHexChange(e.target.value)}
                          placeholder="#059669"
                          className="w-full font-mono text-sm uppercase px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCustomHexChange(hexInput)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
                    >
                      Apply Custom Color
                    </button>
                  </div>
                </div>

                {/* Quick Swatches */}
                <div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    Quick Brand Swatches
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {QUICK_CUSTOM_SWATCHES.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() => handleCustomHexChange(swatch)}
                        className={`w-8 h-8 rounded-xl border-2 transition-all flex items-center justify-center ${
                          hexInput.toLowerCase() === swatch.toLowerCase()
                            ? 'border-white ring-2 ring-indigo-500 scale-110 shadow-md'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: swatch }}
                        title={swatch}
                      >
                        {hexInput.toLowerCase() === swatch.toLowerCase() && (
                          <Check className="w-4 h-4 text-white drop-shadow-sm" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generated 50-950 Shade Preview Strip */}
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Derived Color Scale (50 — 950)
                  </div>
                  <div className="grid grid-cols-11 gap-1 p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                    {([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as (keyof typeof previewShades)[]).map(
                      (step) => (
                        <div key={step} className="space-y-1">
                          <div
                            className="h-10 rounded-lg shadow-xs"
                            style={{ backgroundColor: previewShades[step] }}
                          />
                          <div className="text-[9px] font-mono text-slate-400">{step}</div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DARK MODE SURFACE & CONTRAST */}
            {activeTab === 'surface' && (
              <div className="space-y-5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Dark Mode Surface & Background Tone
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(Object.keys(SURFACE_TONES) as SurfaceTone[]).map((surfaceKey) => {
                    const tone = SURFACE_TONES[surfaceKey];
                    const isSelected = themeConfig.surfaceTone === surfaceKey;

                    return (
                      <button
                        key={surfaceKey}
                        type="button"
                        onClick={() => handleSelectSurface(surfaceKey)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div
                          className="w-full h-14 rounded-xl border mb-3 flex items-center justify-center text-white"
                          style={{
                            backgroundColor: tone.darkBg,
                            borderColor: tone.darkBorder,
                          }}
                        >
                          <div
                            className="px-3 py-1 rounded-lg text-[10px] font-bold"
                            style={{ backgroundColor: tone.darkCard }}
                          >
                            Card UI
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {tone.name}
                          </h4>
                          {isSelected && <Check className="w-4 h-4 text-indigo-500" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                          {tone.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Additional Lighting & Contrast Toggles */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Atmospheric Card Glow Effects
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Subtle ambient neon glows surrounding platform headers and cards.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateThemeConfig({ enableGlowEffects: !themeConfig.enableGlowEffects })}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                        themeConfig.enableGlowEffects ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          themeConfig.enableGlowEffects ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700/60">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        High Contrast Mode
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Enhances border visibility and reduces translucent backgrounds for accessibility.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateThemeConfig({ highContrast: !themeConfig.highContrast })}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                        themeConfig.highContrast ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          themeConfig.highContrast ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: TYPOGRAPHY, GEOMETRY & DENSITY */}
            {activeTab === 'typography' && (
              <div className="space-y-6">
                {/* Font Typography Selector */}
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Typography Font Family
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.keys(FONT_FAMILIES) as FontFamilyPreset[]).map((fontKey) => {
                      const font = FONT_FAMILIES[fontKey];
                      const isSelected = themeConfig.fontFamily === fontKey;

                      return (
                        <button
                          key={fontKey}
                          type="button"
                          onClick={() => handleSelectFont(fontKey)}
                          className={`p-3.5 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white" style={{ fontFamily: font.fontStack }}>
                              {font.name}
                            </h4>
                            {isSelected && <Check className="w-4 h-4 text-indigo-500" />}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                            {font.category}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Corner Radius */}
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Corner Radius Style
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(Object.keys(RADIUS_VALUES) as RadiusPreset[]).map((radiusKey) => {
                      const rad = RADIUS_VALUES[radiusKey];
                      const isSelected = themeConfig.radius === radiusKey;

                      return (
                        <button
                          key={radiusKey}
                          type="button"
                          onClick={() => handleSelectRadius(radiusKey)}
                          className={`p-3.5 rounded-2xl border text-center transition-all ${
                            isSelected
                              ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div
                            className="w-10 h-10 mx-auto border-2 border-indigo-500 bg-indigo-500/20 mb-2 flex items-center justify-center text-xs font-bold text-indigo-500"
                            style={{ borderRadius: rad.cssRadius }}
                          >
                            UI
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {rad.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* UI Density Mode */}
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Table & Card Density Mode
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectDensity('comfortable')}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                        themeConfig.density === 'comfortable'
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <Maximize2 className="w-5 h-5 text-indigo-500 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Comfortable (Standard)</div>
                        <p className="text-[11px] text-slate-400">Generous padding for readability</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectDensity('compact')}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                        themeConfig.density === 'compact'
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <Minimize2 className="w-5 h-5 text-indigo-500 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Compact (High-Density)</div>
                        <p className="text-[11px] text-slate-400">Dense data rows for financial operators</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* LIVE INTERACTIVE PREVIEW CARD */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Eye className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Live Interactive Theme Preview</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Primary: {activeHex}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-xl bg-primary-600 text-white text-xs font-bold shadow-md shadow-primary-600/30 hover:opacity-90 transition-opacity"
                >
                  Brand Action
                </button>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary-500/15 text-primary-700 dark:text-primary-300 border border-primary-500/35">
                  Theme Accent
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Completed
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/35 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                  In Progress
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/35">
                  Rejected
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/50">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeThemeModal}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  closeThemeModal();
                  toast('Theme configuration applied successfully!', 'success');
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
              >
                Apply & Save
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
