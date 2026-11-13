/**
 * Client-Side Smart Image Compressor
 * Reduces multi-megabyte photos to ultra-compact WebP/JPEG (typically 6-18 KB)
 * while calculating exact UTF-8 / decoded KB payload sizes for Supabase.
 */

export interface CompressionResult {
  dataUrl: string;
  sizeKb: number;
  originalSizeKb: number;
  savingsPercent: number;
  isUrl: boolean;
}

/**
 * Calculates exact database storage size in Kilobytes (1 KB = 1024 bytes) of a URL or Data URL string.
 */
export function getImageSizeKb(imageStr: string): number {
  if (!imageStr) return 0;
  if (imageStr.startsWith('data:')) {
    const base64Part = imageStr.split(',')[1] || '';
    const bytes = (base64Part.length * 3) / 4;
    return Number((bytes / 1024).toFixed(2));
  }
  if (typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(imageStr).length;
    return Number((bytes / 1024).toFixed(2));
  }
  return Number((imageStr.length / 1024).toFixed(2));
}

function encodeCanvasToBestFormat(canvas: HTMLCanvasElement, quality: number): string {
  try {
    const webp = canvas.toDataURL('image/webp', quality);
    if (webp.startsWith('data:image/webp')) {
      return webp;
    }
  } catch {
    // Fallback to JPEG below
  }
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Compress an uploaded File object down to minimal KB (adaptive targetMaxKb, default <= 15 KB).
 */
export function compressImageFile(
  file: File,
  maxWidth = 700,
  maxHeight = 700,
  quality = 0.65,
  targetMaxKb = 15
): Promise<CompressionResult> {
  const originalSizeKb = Math.max(1, Math.round(file.size / 1024));

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        reject(new Error('Empty file result'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        const renderAttempt = (w: number, h: number, q: number): string => {
          canvas.width = Math.max(160, Math.round(w));
          canvas.height = Math.max(160, Math.round(h));
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          return encodeCanvasToBestFormat(canvas, q);
        };

        let bestDataUrl = renderAttempt(width, height, quality);
        let bestKb = getImageSizeKb(bestDataUrl);

        // Iteratively step quality down to hit ultra-low targetMaxKb
        const qualitySteps = [0.58, 0.48, 0.38, 0.3, 0.24].filter((q) => q < quality);
        for (const q of qualitySteps) {
          if (bestKb <= targetMaxKb) break;
          const candidate = renderAttempt(width, height, q);
          const candidateKb = getImageSizeKb(candidate);
          if (candidateKb < bestKb) {
            bestDataUrl = candidate;
            bestKb = candidateKb;
          }
        }

        // If still larger than targetMaxKb, progressively reduce resolution while staying crisp
        let scale = 0.82;
        for (let step = 0; step < 3 && bestKb > targetMaxKb; step++) {
          const nextW = Math.max(240, Math.round(width * scale));
          const nextH = Math.max(240, Math.round(height * scale));
          const candidate = renderAttempt(nextW, nextH, 0.36);
          const candidateKb = getImageSizeKb(candidate);
          if (candidateKb < bestKb) {
            bestDataUrl = candidate;
            bestKb = candidateKb;
          }
          scale *= 0.8;
        }

        const savingsPercent = originalSizeKb > 0
          ? Math.max(0, Math.round(((originalSizeKb - bestKb) / originalSizeKb) * 100))
          : 0;

        resolve({
          dataUrl: bestDataUrl,
          sizeKb: bestKb,
          originalSizeKb,
          savingsPercent,
          isUrl: false
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
