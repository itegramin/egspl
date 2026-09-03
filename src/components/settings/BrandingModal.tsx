import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Building2,
  ImageOff,
  Check,
  RotateCcw,
  Upload,
  Link,
  Sparkles,
  ShieldCheck,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_BRAND = {
  brandName: 'E-Gramin Dashboard',
  brandTagline: 'Client Management',
  brandLogoUrl: '',
};

export const BrandingModal: React.FC = () => {
  const { isBrandingModalOpen, closeBrandingModal, themeConfig, updateThemeConfig, toast } = useApp();

  const [localBrand, setLocalBrand] = useState({
    brandName: themeConfig.brandName || DEFAULT_BRAND.brandName,
    brandTagline: themeConfig.brandTagline || DEFAULT_BRAND.brandTagline,
    brandLogoUrl: themeConfig.brandLogoUrl || DEFAULT_BRAND.brandLogoUrl,
  });
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<'identity' | 'logo'>('identity');

  if (!isBrandingModalOpen) return null;

  const isDirty =
    localBrand.brandName !== (themeConfig.brandName || DEFAULT_BRAND.brandName) ||
    localBrand.brandTagline !== (themeConfig.brandTagline || DEFAULT_BRAND.brandTagline) ||
    localBrand.brandLogoUrl !== (themeConfig.brandLogoUrl || DEFAULT_BRAND.brandLogoUrl);

  const handleSave = () => {
    updateThemeConfig({
      brandName: localBrand.brandName.trim() || DEFAULT_BRAND.brandName,
      brandTagline: localBrand.brandTagline.trim() || DEFAULT_BRAND.brandTagline,
      brandLogoUrl: localBrand.brandLogoUrl.trim(),
    });
    toast('Branding configuration saved and applied across the portal.', 'success');
    closeBrandingModal();
  };

  const handleReset = () => {
    setLocalBrand({ ...DEFAULT_BRAND });
    setLogoPreviewError(false);
    toast('Branding reset to default E-Gramin identity.', 'info');
  };

  const handleCopyConfig = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(localBrand, null, 2));
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2500);
      toast('Branding JSON copied to clipboard!', 'success');
    } catch {
      toast('Failed to copy configuration', 'error');
    }
  };

  const logoIsValid = localBrand.brandLogoUrl.trim().length > 0 && !logoPreviewError;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          onClick={closeBrandingModal}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 text-white flex items-center justify-center shadow-md shadow-violet-500/30 shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                    Portal Branding
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                    Admin Only
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure the portal brand identity — name, tagline, and logo.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeBrandingModal}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800/60 active:scale-95 transition-all"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Admin notice banner */}
          <div className="px-6 py-2.5 bg-violet-50 dark:bg-violet-950/30 border-b border-violet-200/60 dark:border-violet-800/40 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
            <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">
              Changes are global — all users see the updated brand identity immediately upon save.
            </span>
          </div>

          {/* Section Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 px-5 bg-white dark:bg-slate-900 text-xs font-semibold">
            <button
              onClick={() => setActiveSection('identity')}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                activeSection === 'identity'
                  ? 'border-violet-600 text-violet-600 dark:text-violet-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Identity</span>
            </button>
            <button
              onClick={() => setActiveSection('logo')}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                activeSection === 'logo'
                  ? 'border-violet-600 text-violet-600 dark:text-violet-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Link className="w-3.5 h-3.5" />
              <span>Logo & Icon</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {activeSection === 'identity' && (
              <div className="space-y-5">
                {/* Live preview */}
                <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Sidebar Preview</div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/25 shrink-0 overflow-hidden">
                      {logoIsValid ? (
                        <img
                          src={localBrand.brandLogoUrl}
                          alt="Logo"
                          className="w-full h-full object-contain"
                          onError={() => setLogoPreviewError(true)}
                        />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm tracking-tight truncate">
                        {localBrand.brandName || DEFAULT_BRAND.brandName}
                      </div>
                      <div className="text-[11px] text-violet-300/90 font-medium tracking-wide mt-0.5 truncate">
                        {localBrand.brandTagline || DEFAULT_BRAND.brandTagline}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Brand Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Brand Name <span className="font-normal text-slate-400">(shown in sidebar header)</span>
                  </label>
                  <input
                    type="text"
                    value={localBrand.brandName}
                    onChange={(e) => setLocalBrand(p => ({ ...p, brandName: e.target.value }))}
                    maxLength={48}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    placeholder="E-Gramin Dashboard"
                  />
                  <div className="text-right text-[10px] text-slate-400 mt-1">{localBrand.brandName.length}/48</div>
                </div>

                {/* Tagline */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Portal Tagline <span className="font-normal text-slate-400">(shown below brand name)</span>
                  </label>
                  <input
                    type="text"
                    value={localBrand.brandTagline}
                    onChange={(e) => setLocalBrand(p => ({ ...p, brandTagline: e.target.value }))}
                    maxLength={48}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    placeholder="Client Management"
                  />
                  <div className="text-right text-[10px] text-slate-400 mt-1">{localBrand.brandTagline.length}/48</div>
                </div>
              </div>
            )}

            {activeSection === 'logo' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Logo Image URL <span className="font-normal text-slate-400">(replaces the sidebar icon)</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="url"
                        value={localBrand.brandLogoUrl}
                        onChange={(e) => {
                          setLogoPreviewError(false);
                          setLocalBrand(p => ({ ...p, brandLogoUrl: e.target.value }));
                        }}
                        className="w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all font-mono"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    {localBrand.brandLogoUrl && (
                      <button
                        type="button"
                        onClick={() => { setLocalBrand(p => ({ ...p, brandLogoUrl: '' })); setLogoPreviewError(false); }}
                        className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Must be a publicly accessible image URL (PNG, SVG, or WebP). Recommended: 36×36px.
                  </p>
                </div>

                {/* Logo Preview */}
                <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 flex flex-col items-center justify-center gap-3 bg-slate-50/60 dark:bg-slate-800/30">
                  {localBrand.brandLogoUrl && !logoPreviewError ? (
                    <>
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md bg-white dark:bg-slate-800 flex items-center justify-center">
                        <img
                          src={localBrand.brandLogoUrl}
                          alt="Brand logo preview"
                          className="w-full h-full object-contain"
                          onError={() => setLogoPreviewError(true)}
                          onLoad={() => setLogoPreviewError(false)}
                        />
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Logo loaded successfully
                      </span>
                    </>
                  ) : logoPreviewError ? (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
                        <ImageOff className="w-8 h-8 text-rose-400" />
                      </div>
                      <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                        Could not load image — check the URL
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Upload className="w-7 h-7 text-slate-400" />
                      </div>
                      <span className="text-xs text-slate-400 text-center">
                        Enter a logo URL above to preview it here
                      </span>
                    </>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/40">
                  <p className="text-xs text-violet-700 dark:text-violet-300">
                    <span className="font-bold">Tip:</span> When no logo URL is set, the sidebar shows the default sparkle icon with your active brand gradient color.
                  </p>
                </div>
              </div>
            )}

            {/* JSON Export */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Branding JSON Export</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Copy the current branding config for backup or transfer.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyConfig}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"
                >
                  {hasCopied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {hasCopied ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/50">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Default
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeBrandingModal}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-violet-600/25 transition-all active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                Save Branding
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
