import React, { useState, useRef, useEffect } from 'react';
import { Upload, Pipette, Palette, Image as ImageIcon, Check, RefreshCw, X, Zap, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { compressImageFile, getImageSizeKb } from '../lib/imageCompressor';

interface ImageColorPickerProps {
  images: string[];
  onChangeImages: (images: string[]) => void;
  selectedColor: string;
  selectedHex: string;
  onChangeColor: (colorName: string, colorHex: string) => void;
  allowMultiple?: boolean;
  onPendingUrlChange?: (url: string) => void;
}

// Preset popular Indian ethnic attire colors
const ETHNIC_COLOR_PRESETS = [
  { name: 'Royal Burgundy', hex: '#6B1426' },
  { name: 'Maroon / Crimson', hex: '#80182E' },
  { name: 'Antique Gold', hex: '#C59B27' },
  { name: 'Rani / Magenta Pink', hex: '#9F2089' },
  { name: 'Emerald Green', hex: '#0B6623' },
  { name: 'Peacock Blue', hex: '#005F73' },
  { name: 'Mustard Yellow', hex: '#E0A926' },
  { name: 'Peach / Blush', hex: '#F4A261' },
  { name: 'Midnight Black', hex: '#1A1A1A' },
  { name: 'Ivory / Cream', hex: '#FAF0E6' }
];

export const ImageColorPicker: React.FC<ImageColorPickerProps> = ({
  images,
  onChangeImages,
  selectedColor,
  selectedHex,
  onChangeColor,
  allowMultiple = true,
  onPendingUrlChange
}) => {
  const [isEyedropperActive, setIsEyedropperActive] = useState(false);
  const [hoverHex, setHoverHex] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [extractedPalette, setExtractedPalette] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlField, setShowUrlField] = useState(true);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionNotice, setCompressionNotice] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagePreviewRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const primaryImage = images[0] || '';

  // Extract color palette from the primary image using an off-screen canvas
  useEffect(() => {
    if (!primaryImage) {
      setExtractedPalette([]);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 64;
      canvas.height = 64;
      ctx.drawImage(img, 0, 0, 64, 64);

      try {
        const imageData = ctx.getImageData(0, 0, 64, 64).data;
        const colorCounts: Record<string, number> = {};

        for (let i = 0; i < imageData.length; i += 16) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];

          if (a < 128) continue;
          // Filter out pure white or pure black backgrounds
          if ((r > 240 && g > 240 && b > 240) || (r < 20 && g < 20 && b < 20)) continue;

          // Round to nearest 16 to group similar colors
          const roundR = Math.round(r / 16) * 16;
          const roundG = Math.round(g / 16) * 16;
          const roundB = Math.round(b / 16) * 16;
          const hex = `#${((1 << 24) + (roundR << 16) + (roundG << 8) + roundB).toString(16).slice(1).toUpperCase()}`;

          colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }

        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([hex]) => hex);

        setExtractedPalette(sortedColors);
      } catch (err) {
        console.warn('Could not extract palette from image due to CORS', err);
      }
    };
    img.src = primaryImage;
  }, [primaryImage]);

  // Handle Drag & Drop Files with Smart Canvas Compression to minimal KB
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
    await processFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await processFiles(files);
    }
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsCompressing(true);
    setCompressionNotice(null);

    try {
      const compressedList: string[] = [];
      let totalSaved = 0;
      let lastSize = 0;

      for (const file of files) {
        const result = await compressImageFile(file, 850, 850, 0.72);
        compressedList.push(result.dataUrl);
        totalSaved += Math.max(0, result.originalSizeKb - result.sizeKb);
        lastSize = result.sizeKb;
      }

      if (allowMultiple) {
        onChangeImages([...images, ...compressedList]);
      } else {
        onChangeImages(compressedList);
      }

      setCompressionNotice(
        `⚡ Compressed to ${lastSize} KB (saved ~${totalSaved} KB)! Minimum KB storage achieved.`
      );
      setTimeout(() => setCompressionNotice(null), 5000);
    } catch (err) {
      console.error('Image compression error', err);
    } finally {
      setIsCompressing(false);
    }
  };

  // Handle Manual URL Add (uses ~0.08 KB)
  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (allowMultiple) {
      onChangeImages([...images, trimmed]);
    } else {
      onChangeImages([trimmed]);
    }
    setUrlInput('');
    onPendingUrlChange?.('');
    setCompressionNotice(`⚡ URL added (${getImageSizeKb(trimmed)} KB) — Minimal Supabase payload!`);
    setTimeout(() => setCompressionNotice(null), 4000);
  };

  const handleRemoveImage = (index: number) => {
    const updated = images.filter((_, idx) => idx !== index);
    onChangeImages(updated);
  };

  // Photoshop-style Eyedropper Click on the Preview Canvas/Image
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase()}`;

    // Nearest name or custom hex
    const matchingPreset = ETHNIC_COLOR_PRESETS.find(
      (p) => p.hex.toLowerCase() === hex.toLowerCase()
    );
    const colorName = matchingPreset ? matchingPreset.name : `Custom (${hex})`;

    onChangeColor(colorName, hex);
    setIsEyedropperActive(false);
    setHoverHex(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEyedropperActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase()}`;

    setHoverHex(hex);
    setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // Draw image to interactive sampling canvas
  const setupCanvas = (imgEl: HTMLImageElement | null) => {
    if (!imgEl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imgEl.naturalWidth || 400;
    canvas.height = imgEl.naturalHeight || 500;
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
  };

  // Browser Native EyeDropper API fallback if available
  const handleNativeEyeDropper = async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          const hex = result.sRGBHex.toUpperCase();
          const match = ETHNIC_COLOR_PRESETS.find((p) => p.hex.toLowerCase() === hex.toLowerCase());
          onChangeColor(match ? match.name : `Sampled (${hex})`, hex);
        }
      } catch (e) {
        console.log('EyeDropper closed or cancelled');
      }
    } else {
      setIsEyedropperActive(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. DROPZONE & IMAGE UPLOADER */}
      <div>
        <label className="block text-xs font-bold text-[#222222] mb-1.5 flex items-center justify-between">
          <span>Product Images (Drag & Drop or Upload)</span>
          <button
            type="button"
            onClick={() => setShowUrlField(!showUrlField)}
            className="text-[11px] text-[#9F2089] hover:underline font-semibold"
          >
            {showUrlField ? 'Hide URL input' : '+ Add via URL'}
          </button>
        </label>

        {/* Drop Area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !isCompressing && fileInputRef.current?.click()}
          className={`border-2 border-dashed ${
            isCompressing ? 'border-[#9F2089] bg-[#FDE5F4]/40' : 'border-[#CCCCCC] hover:border-[#9F2089] bg-[#FAF8F5] hover:bg-[#FDE5F4]/30'
          } rounded-lg p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 group`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple={allowMultiple}
            accept="image/*"
            className="hidden"
          />

          <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-[#E8E8E8] flex items-center justify-center text-[#9F2089] group-hover:scale-110 transition-transform">
            {isCompressing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          </div>

          <div className="text-xs">
            {isCompressing ? (
              <span className="font-bold text-[#9F2089]">Compressing to minimal KB...</span>
            ) : (
              <>
                <span className="font-bold text-[#9F2089]">Click to upload</span> or drag and drop image here
              </>
            )}
          </div>
          <div className="text-[10px] text-[#666666] max-w-sm">
            ⚡ <strong>Smart Auto-Compression:</strong> Any high-res photo is automatically compressed to ~25-45 KB to save Supabase free 2GB storage!
          </div>
        </div>

        {/* Compression feedback notice */}
        {compressionNotice && (
          <div className="mt-2 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{compressionNotice}</span>
          </div>
        )}

        {/* Direct Image URL Input (Always visible & auto-captured on save) */}
        {showUrlField && (
          <div className="mt-2 space-y-1.5 p-2.5 bg-white border border-[#E0E0E0] rounded">
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  onPendingUrlChange?.(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddUrl();
                  }
                }}
                placeholder="Paste image URL here (e.g. https://example.com/photo.jpg)"
                className="flex-1 px-3 py-1.5 text-xs border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleAddUrl}
                className="px-3.5 py-1.5 bg-[#9F2089] text-white text-xs font-bold rounded hover:bg-[#80182E] transition-colors cursor-pointer"
              >
                Add URL
              </button>
            </div>
            <p className="text-[10px] text-[#777777]">
              💡 Web URLs consume only ~0.08 KB in Supabase database rows.
            </p>
          </div>
        )}

        {/* Image Previews Thumbnails Grid with KB size badges */}
        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2.5">
            {images.map((img, idx) => {
              const kbSize = getImageSizeKb(img);
              const isUrlOnly = img.startsWith('http://') || img.startsWith('https://');

              return (
                <div
                  key={idx}
                  className="relative w-20 h-24 rounded-md overflow-hidden border-2 border-[#E8E8E8] bg-white group shadow-xs flex flex-col"
                >
                  <img
                    src={img}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(idx);
                    }}
                    className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xs z-10"
                    title="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* Top-left KB tag */}
                  <div className="absolute top-1 left-1 bg-black/75 backdrop-blur-xs text-white text-[9px] font-mono font-semibold px-1 py-0.5 rounded shadow-xs">
                    {isUrlOnly ? `${kbSize} KB (URL)` : `${kbSize} KB`}
                  </div>

                  {idx === 0 && (
                    <span className="absolute bottom-0 inset-x-0 bg-[#9F2089]/90 text-white text-[8px] font-bold text-center py-0.5 uppercase tracking-wide">
                      Primary
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. PHOTOSHOP-STYLE IMAGE COLOR PICKER & EYEDROPPER */}
      {primaryImage && (
        <div className="bg-[#FAF8F5] border border-[#E8E8E8] rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#222222]">
              <Pipette className="w-4 h-4 text-[#9F2089]" />
              <span>Photoshop Image Color Sampler (Eyedropper)</span>
            </div>

            <button
              type="button"
              onClick={handleNativeEyeDropper}
              className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-colors shadow-2xs ${
                isEyedropperActive
                  ? 'bg-[#9F2089] text-white'
                  : 'bg-white border border-[#9F2089] text-[#9F2089] hover:bg-[#FDE5F4]'
              }`}
            >
              <Pipette className="w-3.5 h-3.5" />
              <span>{isEyedropperActive ? 'Click on image to sample' : 'Pick Color From Image'}</span>
            </button>
          </div>

          <p className="text-[11px] text-[#666666]">
            Upload ki gayi image par kahin bhi click karein jisse fabric ka exact real color code select ho jaye!
          </p>

          {/* Interactive Sampling Canvas Container */}
          <div className="relative border border-[#CCCCCC] rounded bg-white overflow-hidden max-h-48 flex items-center justify-center">
            {/* Hidden source image to load into canvas */}
            <img
              ref={imagePreviewRef}
              src={primaryImage}
              alt="Source"
              className="hidden"
              crossOrigin="anonymous"
              onLoad={(e) => setupCanvas(e.currentTarget)}
            />

            {/* Canvas for pixel-level sampling */}
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={() => setHoverHex(null)}
              className={`max-h-48 w-auto object-contain cursor-crosshair transition-opacity ${
                isEyedropperActive ? 'opacity-100 ring-2 ring-[#9F2089]' : 'opacity-90'
              }`}
              title="Click on any pixel to pick this color"
            />

            {/* Magnifier / Hover Tooltip */}
            {hoverHex && hoverPos && (
              <div
                className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-black/90 text-white text-[10px] px-2 py-1 rounded shadow-lg flex items-center gap-1.5 z-30"
                style={{ left: hoverPos.x, top: hoverPos.y }}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white"
                  style={{ backgroundColor: hoverHex }}
                />
                <span className="font-mono font-bold">{hoverHex}</span>
              </div>
            )}
          </div>

          {/* Extracted Auto-Palette from Image */}
          {extractedPalette.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#555555]">
                Colors auto-detected in this image (Tap to select):
              </span>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {extractedPalette.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => onChangeColor(`Sampled (${hex})`, hex)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-white rounded border border-[#CCCCCC] hover:border-[#9F2089] text-[11px] font-medium transition-all shadow-2xs"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="font-mono text-[10px]">{hex}</span>
                    {selectedHex.toUpperCase() === hex.toUpperCase() && (
                      <Check className="w-3 h-3 text-[#9F2089]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. COLOR SELECTION SWATCHES & CUSTOM PICKER */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-[#222222]">
          Selected Product Color: <strong className="text-[#9F2089]">{selectedColor}</strong> ({selectedHex})
        </label>

        {/* Selected preview bar */}
        <div className="flex items-center gap-3 p-2 bg-white rounded border border-[#E8E8E8]">
          <div
            className="w-7 h-7 rounded-md shadow-xs border border-black/20 shrink-0"
            style={{ backgroundColor: selectedHex }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-[#222222] truncate">{selectedColor}</div>
            <div className="text-[10px] text-[#888888] font-mono">{selectedHex}</div>
          </div>

          {/* HTML5 Native Color Picker */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="customColorPicker" className="text-[11px] text-[#666666] font-medium cursor-pointer">
              Custom:
            </label>
            <input
              id="customColorPicker"
              type="color"
              value={selectedHex}
              onChange={(e) => onChangeColor(`Custom (${e.target.value.toUpperCase()})`, e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
            />
          </div>
        </div>

        {/* Popular Presets */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {ETHNIC_COLOR_PRESETS.map((preset) => {
            const isSelected = selectedHex.toLowerCase() === preset.hex.toLowerCase();
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => onChangeColor(preset.name, preset.hex)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-all ${
                  isSelected
                    ? 'border-[#9F2089] bg-[#FDE5F4] text-[#9F2089] font-bold ring-1 ring-[#9F2089]'
                    : 'border-[#CCCCCC] bg-white text-[#444444] hover:border-[#9F2089]'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                  style={{ backgroundColor: preset.hex }}
                />
                <span className="text-[11px]">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
