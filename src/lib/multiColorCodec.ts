import { ProductColorVariant } from '../types';

const BUNDLE_PREFIX = 'mcb1:';
const FRAGMENT_MARKER = '#mc=';

function toUrlSafeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafeBase64(b64: string): string {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Strips any internal #mc=... fragment from a raw URL so re-encoding never nests fragments.
 */
export function stripMultiColorFragment(url: string): string {
  if (!url) return '';
  const idx = url.indexOf(FRAGMENT_MARKER);
  return idx >= 0 ? url.slice(0, idx) : url;
}

interface CompactMultiColorPayload {
  /** Color variants tuples: [colorName, colorHex, imageUrl] */
  v?: [string, string, string][];
  /** Any extra non-variant images */
  e?: string[];
}

/**
 * Encodes a product's multi-color variants & images into STRICTLY ONE single compact link string (`[singleLink]`)
 * for Supabase `products.images` (TEXT[]).
 *
 * - Single HTTP URL -> saved verbatim as `[url]` (~0.06 - 0.14 KB)
 * - Multiple Color HTTP URLs (e.g. White, Red, Blue, Black Jubba) -> saved as 1 single URL with `#mc=...` fragment
 *   so the primary photo loads directly in any browser while all colors live inside 1 Supabase link!
 * - Uploaded WebP/Data images -> packed into 1 single `mcb1:...` string so Supabase always stores length 1!
 */
export function encodeMultiColorSingleLink(
  variants?: ProductColorVariant[],
  images?: string[],
  primaryColor?: string,
  primaryHex?: string
): string[] {
  const cleanVariants: ProductColorVariant[] = (variants || [])
    .map((v) => ({
      colorName: (v.colorName || 'Default').trim(),
      colorHex: (v.colorHex || '#6B1426').trim(),
      image: stripMultiColorFragment((v.image || '').trim())
    }))
    .filter((v) => v.image.length > 0);

  const cleanImages: string[] = (images || [])
    .map((img) => stripMultiColorFragment((img || '').trim()))
    .filter((img) => img.length > 0 && !img.startsWith(BUNDLE_PREFIX));

  const seenVariantImages = new Set(cleanVariants.map((v) => v.image));
  const extraImages = cleanImages.filter((img) => !seenVariantImages.has(img));

  // Case 1: Nothing uploaded yet
  if (cleanVariants.length === 0 && cleanImages.length === 0) {
    return [];
  }

  // Case 2: Only 1 image and <= 1 color -> keep plain single link (0 overhead)
  if (cleanVariants.length <= 1 && cleanImages.length <= 1 && extraImages.length === 0) {
    const singleImg = cleanVariants[0]?.image || cleanImages[0];
    if (!singleImg) return [];
    // If single variant matches product primary color (or no variants array provided), no metadata needed
    if (
      cleanVariants.length === 0 ||
      (cleanVariants[0].colorName === (primaryColor || cleanVariants[0].colorName) &&
        cleanVariants[0].colorHex === (primaryHex || cleanVariants[0].colorHex))
    ) {
      return [singleImg];
    }
  }

  const primaryImg = cleanVariants[0]?.image || cleanImages[0] || '';
  if (!primaryImg) return [];

  const payload: CompactMultiColorPayload = {};
  if (cleanVariants.length > 0) {
    payload.v = cleanVariants.map((v) => [v.colorName, v.colorHex, v.image]);
  }
  if (extraImages.length > 0) {
    payload.e = extraImages;
  }

  const encoded = toUrlSafeBase64(JSON.stringify(payload));

  // If primary is an external URL, attach #mc= fragment so opening the URL directly displays the product photo
  // AND Supabase stores strictly 1 single URL entry in products.images!
  if (/^https?:\/\//i.test(primaryImg)) {
    return [`${primaryImg}${FRAGMENT_MARKER}${encoded}`];
  }

  // For uploaded compressed base64 images, pack all into 1 single bundle string
  return [`${BUNDLE_PREFIX}${encoded}`];
}

/**
 * Decodes Supabase `products.images` back into displayable `images[]` + interactive `colorVariants[]`.
 * Fully backwards-compatible with existing plain image arrays stored previously.
 */
export function decodeMultiColorSingleLink(
  rawImages: string[] | string | null | undefined,
  fallbackColor = 'Royal Burgundy',
  fallbackHex = '#6B1426'
): { images: string[]; colorVariants: ProductColorVariant[] } {
  const list: string[] = Array.isArray(rawImages)
    ? rawImages.filter(Boolean)
    : typeof rawImages === 'string' && rawImages
      ? [rawImages]
      : [];

  if (list.length === 0) {
    return { images: [], colorVariants: [] };
  }

  const variants: ProductColorVariant[] = [];
  const allImages: string[] = [];
  const pushUniqueImage = (img: string) => {
    const clean = (img || '').trim();
    if (clean && !allImages.includes(clean)) {
      allImages.push(clean);
    }
  };

  for (const item of list) {
    const trimmed = String(item || '').trim();
    if (!trimmed) continue;

    if (trimmed.startsWith(BUNDLE_PREFIX)) {
      try {
        const json = fromUrlSafeBase64(trimmed.slice(BUNDLE_PREFIX.length));
        const parsed = JSON.parse(json) as CompactMultiColorPayload;
        if (Array.isArray(parsed.v)) {
          for (const tuple of parsed.v) {
            if (Array.isArray(tuple) && tuple[2]) {
              variants.push({
                colorName: String(tuple[0] || fallbackColor),
                colorHex: String(tuple[1] || fallbackHex),
                image: String(tuple[2])
              });
              pushUniqueImage(String(tuple[2]));
            }
          }
        }
        if (Array.isArray(parsed.e)) {
          for (const extra of parsed.e) {
            pushUniqueImage(String(extra));
          }
        }
        continue;
      } catch {
        // Ignore malformed bundle entry
      }
    }

    const mcIdx = trimmed.indexOf(FRAGMENT_MARKER);
    if (mcIdx > 0) {
      const baseUrl = trimmed.slice(0, mcIdx);
      const b64 = trimmed.slice(mcIdx + FRAGMENT_MARKER.length);
      try {
        const json = fromUrlSafeBase64(b64);
        const parsed = JSON.parse(json) as CompactMultiColorPayload;
        if (Array.isArray(parsed.v) && parsed.v.length > 0) {
          for (const tuple of parsed.v) {
            if (Array.isArray(tuple) && tuple[2]) {
              variants.push({
                colorName: String(tuple[0] || fallbackColor),
                colorHex: String(tuple[1] || fallbackHex),
                image: String(tuple[2])
              });
              pushUniqueImage(String(tuple[2]));
            }
          }
        } else {
          pushUniqueImage(baseUrl);
        }
        if (Array.isArray(parsed.e)) {
          for (const extra of parsed.e) {
            pushUniqueImage(String(extra));
          }
        }
        continue;
      } catch {
        pushUniqueImage(baseUrl);
        continue;
      }
    }

    pushUniqueImage(trimmed);
  }

  return {
    images: allImages,
    colorVariants: variants
  };
}

/**
 * Calculates exact UTF-8 storage size in Kilobytes (KB) for an encoded Supabase `images` array.
 */
export function getSupabaseEncodedPayloadKb(encodedImages: string[]): number {
  const joined = encodedImages.join('');
  if (!joined) return 0;
  const bytes = new TextEncoder().encode(joined).length;
  return Number((bytes / 1024).toFixed(2));
}
