/**
 * Client-Side Smart Image Compressor
 * Reduces multi-megabyte images to ultra-compact WebP/JPEG format (20-45 KB)
 * Preserves high visual fidelity for ethnic fabrics while saving Supabase bandwidth and database storage.
 */

export interface CompressionResult {
  dataUrl: string;
  sizeKb: number;
  originalSizeKb: number;
  savingsPercent: number;
  isUrl: boolean;
}

/**
 * Calculates approximate size in Kilobytes of a URL or Data URL string
 */
export function getImageSizeKb(imageStr: string): number {
  if (!imageStr) return 0;
  if (imageStr.startsWith('http://') || imageStr.startsWith('https://')) {
    // Pure URL string takes only ~50-150 bytes in database
    return Number((imageStr.length / 1024).toFixed(2));
  }
  if (imageStr.startsWith('data:')) {
    const base64Part = imageStr.split(',')[1] || '';
    const bytes = (base64Part.length * 3) / 4;
    return Math.round((bytes / 1024) * 10) / 10;
  }
  return Number((imageStr.length / 1024).toFixed(2));
}

/**
 * Compress an uploaded File object down to minimal KB (typically 25-45 KB)
 */
export function compressImageFile(
  file: File,
  maxWidth = 850,
  maxHeight = 850,
  quality = 0.72
): Promise<CompressionResult> {
  const originalSizeKb = Math.round(file.size / 1024);

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

        // Scale down proportionally
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
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // High quality bicubic resampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Try modern WebP first, fallback to JPEG
        let compressedDataUrl = '';
        try {
          compressedDataUrl = canvas.toDataURL('image/webp', quality);
          // If browser doesn't support webp export, it returns image/png which is large
          if (!compressedDataUrl.startsWith('data:image/webp')) {
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }
        } catch {
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        const sizeKb = getImageSizeKb(compressedDataUrl);
        const savingsPercent = originalSizeKb > 0
          ? Math.max(0, Math.round(((originalSizeKb - sizeKb) / originalSizeKb) * 100))
          : 0;

        resolve({
          dataUrl: compressedDataUrl,
          sizeKb,
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
