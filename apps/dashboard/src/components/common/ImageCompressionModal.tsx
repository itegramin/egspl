import React, { useState, useEffect, useRef, useId } from 'react';
import {
  X,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FileCheck,
  Sparkles,
  Sliders,
  Crop,
  Check,
  RefreshCw,
  Info,
  Maximize2,
  FileText,
} from 'lucide-react';
import {
  CropArea,
  EnhancementOptions,
  CompressionResult,
  loadImage,
  formatBytes,
  processAndCompressImage,
  MAX_ALLOWED_FILE_SIZE_BYTES,
} from '../../lib/imageCompression';

interface ImageCompressionModalProps {
  isOpen: boolean;
  file: File | null;
  initialDataUrl?: string;
  onApply: (result: CompressionResult) => void;
  onClose: () => void;
}

type AspectRatioPreset = 'free' | '1:1' | '4:3' | '16:9' | '3:4';

export const ImageCompressionModal: React.FC<ImageCompressionModalProps> = ({
  isOpen,
  file,
  initialDataUrl,
  onApply,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'adjust' | 'crop' | 'compress'>('adjust');
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(file?.size || 0);

  // Form controls & IDs for accessibility
  const brightnessId = useId();
  const contrastId = useId();
  const saturationId = useId();

  // Adjustments State
  const [enhancements, setEnhancements] = useState<EnhancementOptions>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    rotation: 0,
    flipH: false,
    isDocumentMode: false,
  });

  // Cropping State
  const [aspectRatio, setAspectRatio] = useState<AspectRatioPreset>('free');
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });
  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const cropStartRef = useRef<{ x: number; y: number; crop: CropArea } | null>(null);

  // Compression & Format State
  const [format, setFormat] = useState<'image/webp' | 'image/jpeg'>('image/webp');
  const [qualityPreset, setQualityPreset] = useState<'high' | 'balanced' | 'max'>('high');

  // Preview & Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewResult, setPreviewResult] = useState<CompressionResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Load the initial image when modal opens or file changes
  useEffect(() => {
    if (!isOpen || (!file && !initialDataUrl)) {
      setImageElement(null);
      setPreviewResult(null);
      return;
    }

    let isMounted = true;
    const source = file || initialDataUrl!;
    setOriginalSize(file?.size || 1024 * 1024); // default 1MB if dataURL without file

    loadImage(source)
      .then((img) => {
        if (isMounted) {
          setImageElement(img);
          // Auto-enable document mode hint if it looks like a document/receipt aspect ratio
          const isDocAspect = img.naturalHeight > img.naturalWidth * 1.25;
          if (isDocAspect) {
            setAspectRatio('3:4');
          }
        }
      })
      .catch((err) => {
        if (isMounted) setPreviewError(err.message || 'Could not load image');
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, file, initialDataUrl]);

  // Re-run compression & preview generation whenever parameters change
  useEffect(() => {
    if (!imageElement) return;

    let isMounted = true;
    setIsProcessing(true);
    setPreviewError(null);

    const qualityMap = {
      high: 0.9,
      balanced: 0.8,
      max: 0.65,
    };

    const timer = setTimeout(() => {
      processAndCompressImage(
        imageElement,
        cropArea.width < 100 || cropArea.height < 100 || cropArea.x > 0 || cropArea.y > 0 ? cropArea : null,
        enhancements,
        originalSize,
        file?.name || 'document.png',
        {
          format,
          quality: qualityMap[qualityPreset],
          maxSizeBytes: MAX_ALLOWED_FILE_SIZE_BYTES,
        }
      )
        .then((res) => {
          if (isMounted) {
            setPreviewResult(res);
            setIsProcessing(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setPreviewError(err.message || 'Compression error');
            setIsProcessing(false);
          }
        });
    }, 120); // Debounce to prevent lag during rapid slider dragging

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [imageElement, enhancements, cropArea, format, qualityPreset, originalSize, file]);

  if (!isOpen) return null;

  // Aspect ratio handlers
  const applyPreset = (preset: AspectRatioPreset) => {
    setAspectRatio(preset);
    if (preset === 'free') {
      setCropArea({ x: 0, y: 0, width: 100, height: 100 });
      return;
    }

    if (!imageElement) return;
    const imgW = imageElement.naturalWidth;
    const imgH = imageElement.naturalHeight;

    let targetRatio = 1;
    if (preset === '1:1') targetRatio = 1;
    if (preset === '4:3') targetRatio = 4 / 3;
    if (preset === '16:9') targetRatio = 16 / 9;
    if (preset === '3:4') targetRatio = 3 / 4;

    const currentRatio = imgW / imgH;
    if (currentRatio > targetRatio) {
      // Image is wider than target ratio
      const newWidthPct = Math.round((targetRatio / currentRatio) * 100);
      const newXPct = Math.round((100 - newWidthPct) / 2);
      setCropArea({ x: newXPct, y: 0, width: newWidthPct, height: 100 });
    } else {
      // Image is taller than target ratio
      const newHeightPct = Math.round((currentRatio / targetRatio) * 100);
      const newYPct = Math.round((100 - newHeightPct) / 2);
      setCropArea({ x: 0, y: newYPct, width: 100, height: newHeightPct });
    }
  };

  // Rotation & Flipping
  const rotateCw = () => {
    setEnhancements((prev) => ({ ...prev, rotation: (prev.rotation + 90) % 360 }));
  };

  const rotateCcw = () => {
    setEnhancements((prev) => ({ ...prev, rotation: (prev.rotation + 270) % 360 }));
  };

  const toggleFlipH = () => {
    setEnhancements((prev) => ({ ...prev, flipH: !prev.flipH }));
  };

  const toggleDocumentMode = () => {
    setEnhancements((prev) => ({
      ...prev,
      isDocumentMode: !prev.isDocumentMode,
    }));
  };

  const resetAll = () => {
    setEnhancements({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      rotation: 0,
      flipH: false,
      isDocumentMode: false,
    });
    setCropArea({ x: 0, y: 0, width: 100, height: 100 });
    setAspectRatio('free');
  };

  const handleApply = () => {
    if (!previewResult) return;
    onApply(previewResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[850px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* ── Modal Header ────────────────────────────────────────────── */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Optimize & Enhance Image
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Target &lt; 500 KB
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[280px] sm:max-w-sm">
                {file?.name || 'Uploaded document / screenshot'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetAll}
              className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
              title="Reset all changes"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Main Work Area: Left Preview Canvas, Right Controls ───────── */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Visual Canvas Viewport (7 Cols) */}
          <div
            ref={canvasContainerRef}
            className="lg:col-span-7 bg-slate-950/95 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none border-b lg:border-b-0 lg:border-r border-slate-800"
          >
            {isProcessing && (
              <div className="absolute top-4 left-4 z-20 px-2.5 py-1 rounded-full bg-slate-900/90 border border-indigo-500/50 text-indigo-300 text-xs flex items-center gap-2 backdrop-blur-md shadow-lg">
                <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                <span>Optimizing...</span>
              </div>
            )}

            {previewResult ? (
              <div className="relative max-w-full max-h-full flex items-center justify-center">
                <img
                  src={previewResult.dataUrl}
                  alt="Optimized preview"
                  className="max-h-[380px] lg:max-h-[520px] w-auto max-w-full object-contain rounded-lg shadow-2xl transition-all duration-150"
                  style={{
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
                  }}
                />

                {/* Crop boundary overlay indication if crop is active */}
                {activeTab === 'crop' && (cropArea.width < 100 || cropArea.height < 100) && (
                  <div className="absolute inset-0 pointer-events-none border-2 border-indigo-400 border-dashed rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded shadow">
                      Crop: {cropArea.width}% × {cropArea.height}%
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-xs">Loading image viewport...</span>
              </div>
            )}

            {/* Viewport Info Bar */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <span>
                  Res: <strong className="text-slate-200">{previewResult?.width || 0} × {previewResult?.height || 0} px</strong>
                </span>
                <span>
                  Format: <strong className="text-slate-200">{format === 'image/webp' ? 'WebP' : 'JPEG'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Check className="w-3.5 h-3.5" />
                <span>Ready for upload</span>
              </div>
            </div>
          </div>

          {/* Controls & Metrics Sidebar (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col h-full overflow-y-auto bg-white dark:bg-slate-900">
            {/* Tab navigation: Enhance vs Crop vs Compression */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 p-2 gap-1.5 shrink-0 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => setActiveTab('adjust')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'adjust'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Enhance</span>
              </button>
              <button
                onClick={() => setActiveTab('crop')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'crop'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Crop & Rotate</span>
              </button>
              <button
                onClick={() => setActiveTab('compress')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'compress'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Size & Quality</span>
              </button>
            </div>

            {/* Tab Content Body */}
            <div className="flex-1 p-5 space-y-5 overflow-y-auto">
              {/* ── TAB 1: ENHANCE & ADJUSTMENTS ───────────────────────── */}
              {activeTab === 'adjust' && (
                <div className="space-y-4">
                  {/* 1-Click Document Auto-Enhancer Mode */}
                  <div
                    onClick={toggleDocumentMode}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      enhancements.isDocumentMode
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          enhancements.isDocumentMode
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          Document & Slip Mode
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 font-semibold">
                            Recommended
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          High-contrast filter optimized for faded bank deposit slips, receipts & cheques
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                        enhancements.isDocumentMode
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-400 dark:border-slate-600'
                      }`}
                    >
                      {enhancements.isDocumentMode && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Manual Sliders */}
                  {!enhancements.isDocumentMode && (
                    <div className="space-y-4 pt-1">
                      {/* Brightness */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1.5">
                          <label htmlFor={brightnessId} className="text-slate-700 dark:text-slate-300">Brightness</label>
                          <span className="text-indigo-600 dark:text-indigo-400">
                            {enhancements.brightness > 0 ? `+${enhancements.brightness}` : enhancements.brightness}%
                          </span>
                        </div>
                        <input
                          id={brightnessId}
                          type="range"
                          min="-40"
                          max="40"
                          value={enhancements.brightness}
                          onChange={(e) =>
                            setEnhancements((prev) => ({ ...prev, brightness: Number(e.target.value) }))
                          }
                          className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Contrast */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1.5">
                          <label htmlFor={contrastId} className="text-slate-700 dark:text-slate-300">Contrast</label>
                          <span className="text-indigo-600 dark:text-indigo-400">
                            {enhancements.contrast > 0 ? `+${enhancements.contrast}` : enhancements.contrast}%
                          </span>
                        </div>
                        <input
                          id={contrastId}
                          type="range"
                          min="-40"
                          max="50"
                          value={enhancements.contrast}
                          onChange={(e) =>
                            setEnhancements((prev) => ({ ...prev, contrast: Number(e.target.value) }))
                          }
                          className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Saturation */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1.5">
                          <label htmlFor={saturationId} className="text-slate-700 dark:text-slate-300">Saturation</label>
                          <span className="text-indigo-600 dark:text-indigo-400">
                            {enhancements.saturation > 0 ? `+${enhancements.saturation}` : enhancements.saturation}%
                          </span>
                        </div>
                        <input
                          id={saturationId}
                          type="range"
                          min="-100"
                          max="80"
                          value={enhancements.saturation}
                          onChange={(e) =>
                            setEnhancements((prev) => ({ ...prev, saturation: Number(e.target.value) }))
                          }
                          className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 2: CROP & ROTATE ───────────────────────────────── */}
              {activeTab === 'crop' && (
                <div className="space-y-4">
                  {/* Rotation & Orientation Bar */}
                  <div>
                    <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Orientation & Rotation
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={rotateCcw}
                        className="py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium flex items-center justify-center gap-1.5 text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Rotate 90° L</span>
                      </button>
                      <button
                        onClick={rotateCw}
                        className="py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium flex items-center justify-center gap-1.5 text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Rotate 90° R</span>
                      </button>
                      <button
                        onClick={toggleFlipH}
                        className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                          enhancements.flipH
                            ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-500 text-indigo-600'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                        <span>Flip H</span>
                      </button>
                    </div>
                  </div>

                  {/* Aspect Ratio Presets */}
                  <div>
                    <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Aspect Ratio Presets
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'free', label: 'Full / Free' },
                        { id: '3:4', label: '3:4 Document' },
                        { id: '4:3', label: '4:3 Receipt' },
                        { id: '1:1', label: '1:1 Square' },
                        { id: '16:9', label: '16:9 Screen' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => applyPreset(preset.id as AspectRatioPreset)}
                          className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                            aspectRatio === preset.id
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: COMPRESSION & SIZE ──────────────────────────── */}
              {activeTab === 'compress' && (
                <div className="space-y-4">
                  {/* Format Selection */}
                  <div>
                    <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Target Output Format
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setFormat('image/webp')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          format === 'image/webp'
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs">WebP Format</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                            Recommended
                          </span>
                        </div>
                        <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-1">
                          Up to 40% smaller file size with high fidelity
                        </p>
                      </button>

                      <button
                        onClick={() => setFormat('image/jpeg')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          format === 'image/jpeg'
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs">JPEG Format</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Standard
                          </span>
                        </div>
                        <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-1">
                          Universal backward-compatible format
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Quality Preset */}
                  <div>
                    <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Compression Profile
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'high', label: 'High Quality', desc: '~300-450 KB' },
                        { id: 'balanced', label: 'Balanced', desc: '~150-250 KB' },
                        { id: 'max', label: 'Max Compact', desc: '&lt; 120 KB' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setQualityPreset(p.id as any)}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            qualityPreset === p.id
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold'
                              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="text-xs">{p.label}</div>
                          <div className="text-[10px] opacity-75 mt-0.5">{p.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Compression KPI Card (Always Visible at bottom) ───── */}
              <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Azure SWA Optimized
                  </span>
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                    -{previewResult?.compressionRatio || 0}% Saved
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-emerald-200/60 dark:border-emerald-900/40">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Original:</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      {formatBytes(originalSize)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Optimized:</span>
                    <p className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
                      {formatBytes(previewResult?.size || 0)}
                      <span className="text-[10px] ml-1 font-normal text-slate-400">(&lt; 500 KB)</span>
                    </p>
                  </div>
                </div>
              </div>

              {previewError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
                  {previewError}
                </div>
              )}
            </div>

            {/* ── Modal Footer: Cancel / Apply & Attach ─────────────── */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50/50 dark:bg-slate-900/80 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!previewResult || isProcessing}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                <FileCheck className="w-4 h-4" />
                <span>Apply & Attach ({formatBytes(previewResult?.size || 0)})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
