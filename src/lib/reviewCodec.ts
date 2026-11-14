import { ProductReview } from '../types';

const BASE_EPOCH_MS = Date.UTC(2024, 0, 1);
const MS_PER_DAY = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Generates a short base36 review ID (~7 chars instead of 22 chars).
 */
export function createCompactReviewId(): string {
  const ts = Math.floor((Date.now() - BASE_EPOCH_MS) / 1000);
  const rand = Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
  return `r${Math.max(1, ts).toString(36)}${rand}`;
}

function escapeField(val: string): string {
  return val
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\p')
    .replace(/\r?\n/g, '\\n');
}

function unescapeField(val: string): string {
  return val.replace(/\\(\\|p|n)/g, (_, ch) => {
    if (ch === 'p') return '|';
    if (ch === 'n') return '\n';
    return '\\';
  });
}

function encodeRatingFlag(rating: number, verified: boolean): string {
  const clamped = Math.max(1, Math.min(5, Math.round(rating || 5)));
  return verified ? String.fromCharCode(64 + clamped) : String(clamped); // A..E or 1..5
}

function decodeRatingFlag(code: string): { rating: number; verified: boolean } {
  if (!code) return { rating: 5, verified: true };
  const c = code.charCodeAt(0);
  if (c >= 65 && c <= 69) {
    return { rating: c - 64, verified: true };
  }
  const num = parseInt(code, 10);
  return {
    rating: Number.isFinite(num) ? Math.max(1, Math.min(5, num)) : 5,
    verified: false
  };
}

function encodeCompactDate(dateStr?: string): string {
  if (!dateStr) {
    const days = Math.max(0, Math.floor((Date.now() - BASE_EPOCH_MS) / MS_PER_DAY));
    return `~${days.toString(36)}`;
  }
  const trimmed = dateStr.trim();
  // Parse "14 Nov 2026" or "14 Nov, 2026"
  const m = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const monthIdx = MONTHS.findIndex((mon) => mon.toLowerCase() === m[2].toLowerCase());
    const year = parseInt(m[3], 10);
    if (monthIdx >= 0 && year >= 2024 && year <= 2099) {
      const utc = Date.UTC(year, monthIdx, day);
      const days = Math.max(0, Math.floor((utc - BASE_EPOCH_MS) / MS_PER_DAY));
      return `~${days.toString(36)}`;
    }
  }
  return escapeField(trimmed);
}

function decodeCompactDate(encoded: string): string {
  if (!encoded) return 'Recently';
  if (encoded.startsWith('~')) {
    const days = parseInt(encoded.slice(1), 36);
    if (Number.isFinite(days) && days >= 0) {
      const d = new Date(BASE_EPOCH_MS + days * MS_PER_DAY);
      const dayNum = String(d.getUTCDate()).padStart(2, '0');
      return `${dayNum} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    }
  }
  return unescapeField(encoded);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = typeof btoa === 'function'
    ? btoa(binary)
    : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const norm = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = norm.length % 4 === 0 ? '' : '='.repeat(4 - (norm.length % 4));
  if (typeof atob === 'function') {
    const binary = atob(norm + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(norm + pad, 'base64'));
}

async function deflateRawText(text: string): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const encoder = new TextEncoder();
    const input = encoder.encode(text);
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(input);
    writer.close();
    const res = new Response(cs.readable);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

async function inflateRawBytes(bytes: Uint8Array): Promise<string | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(new Uint8Array(bytes));
    writer.close();
    const res = new Response(ds.readable);
    return await res.text();
  } catch {
    return null;
  }
}

const PHRASE_TOKENS: Array<[string, string]> = [
  ['collection', '^i'],
  ['recommend', '^N'],
  ['stitching', '^m'],
  ['zabardast', '^G'],
  ['original', '^B'],
  ['delivery', '^d'],
  ['matching', '^H'],
  ['showroom', '^M'],
  ['quality', '^c'],
  ['product', '^g'],
  ['shandar', '^h'],
  ['fitting', '^k'],
  ['amazing', '^D'],
  ['awesome', '^E'],
  ['fabric', '^f'],
  ['design', '^l'],
  ['colour', '^I'],
  ['bahut', '^a'],
  ['achha', '^b'],
  ['kapda', '^e'],
  ['jubba', '^y'],
  ['saree', '^z'],
  ['price', '^A'],
  ['worth', '^C'],
  ['ekdum', '^F'],
  ['color', '^J'],
  ['order', '^L'],
  ['fast', '^n'],
  ['good', '^o'],
  ['best', '^p'],
  ['nice', '^q'],
  ['very', '^v'],
  ['pure', '^w'],
  ['silk', '^x'],
  ['time', '^K'],
  ['hai', '^r'],
  ['aur', '^s'],
  ['and', '^t'],
  ['the', '^u']
];

const TOKEN_TO_PHRASE: Record<string, string> = Object.fromEntries(
  PHRASE_TOKENS.map(([word, tok]) => [tok, word])
);

function tokenizeComment(comment: string): string {
  let out = escapeField(comment.trim().replace(/\s+/g, ' ')).replace(/\^/g, '^^');
  for (const [word, tok] of PHRASE_TOKENS) {
    out = out.replace(new RegExp(`\\b${word}\\b`, 'g'), tok);
  }
  return out;
}

function detokenizeComment(encoded: string): string {
  const restored = encoded.replace(/\^(\^|[a-zA-Z])/g, (full, ch) => {
    if (ch === '^') return '^';
    const word = TOKEN_TO_PHRASE[`^${ch}`];
    return word !== undefined ? word : full;
  });
  return unescapeField(restored);
}

/**
 * Compresses review comment text using lossless tokenization + optional deflate-raw (rz1:).
 * Short comments often take just 0.015-0.05 KB (much smaller than a 0.08 KB web URL!).
 */
export async function compressReviewTextAsync(comment: string): Promise<string> {
  const clean = (comment || '').trim().replace(/\s+/g, ' ');
  const tokenized = `tk1:${tokenizeComment(clean)}`;
  const rawBytes = new TextEncoder().encode(clean).length;
  const tokBytes = new TextEncoder().encode(tokenized).length;
  let best = tokBytes < rawBytes ? tokenized : clean;

  if (clean.length >= 64) {
    const deflated = await deflateRawText(clean);
    if (deflated) {
      const rz = `rz1:${toBase64Url(deflated)}`;
      if (rz.length < new TextEncoder().encode(best).length) {
        best = rz;
      }
    }
  }
  return best;
}

export async function decompressReviewTextAsync(stored: string): Promise<string> {
  if (!stored || typeof stored !== 'string') return '';
  if (stored.startsWith('tk1:')) {
    return detokenizeComment(stored.slice(4));
  }
  if (!stored.startsWith('rz1:')) return stored;
  try {
    const bytes = fromBase64Url(stored.slice(4));
    const text = await inflateRawBytes(bytes);
    return text ?? stored;
  } catch {
    return stored;
  }
}

/**
 * Packs one ProductReview into an ultra-compact single string (~0.03-0.07 KB, smaller than a URL).
 * Format: r3|<id>|<rf><dateCode>|<userName>|<locOrEmpty>|<tokenizedComment>[|<reviewImage>]
 */
export function encodeCompactReview(r: ProductReview): string {
  const id = escapeField((r.id || createCompactReviewId()).trim());
  const rf = encodeRatingFlag(r.rating, r.verified !== false);
  const d = encodeCompactDate(r.date);
  const name = escapeField((r.userName || 'Customer').trim());
  const rawLoc = (r.location || '').trim();
  const loc = rawLoc && rawLoc.toLowerCase() !== 'india' ? escapeField(rawLoc) : '';
  const comment = tokenizeComment(r.comment || '');
  const img = r.reviewImage ? escapeField(r.reviewImage.trim()) : '';

  const base = `r3|${id}|${rf}${d}|${name}|${loc}|${comment}`;
  return img ? `${base}|${img}` : base;
}

export async function encodeCompactReviewAsync(r: ProductReview): Promise<string> {
  const packed = encodeCompactReview(r);
  if (packed.length < 90) return packed;
  const deflated = await deflateRawText(packed);
  if (!deflated) return packed;
  const candidate = `rz2:${toBase64Url(deflated)}`;
  const rawBytes = new TextEncoder().encode(packed).length;
  return candidate.length < rawBytes ? candidate : packed;
}

export function decodeCompactReviewSync(
  entry: unknown,
  productId?: string,
  categoryId?: string
): ProductReview | null {
  if (!entry) return null;

  if (typeof entry === 'string') {
    if (entry.startsWith('r3|')) {
      const parts = entry.split('|');
      const [, rawId, rawMeta, rawName, rawLoc, rawComment, rawImg] = parts;
      const { rating, verified } = decodeRatingFlag((rawMeta || 'E')[0]);
      const rawDate = (rawMeta || '').slice(1);
      return {
        id: unescapeField(rawId || createCompactReviewId()),
        productId,
        categoryId,
        userName: unescapeField(rawName || 'Customer'),
        location: rawLoc ? unescapeField(rawLoc) : 'India',
        rating,
        verified,
        date: decodeCompactDate(rawDate),
        comment: detokenizeComment(rawComment || ''),
        reviewImage: rawImg ? unescapeField(rawImg) : undefined
      };
    }

    if (entry.startsWith('rc1|')) {
      const parts = entry.split('|');
      const [, rawId, rawRf, rawDate, rawName, rawLoc, rawComment, rawImg] = parts;
      const { rating, verified } = decodeRatingFlag(rawRf || 'E');
      return {
        id: unescapeField(rawId || createCompactReviewId()),
        productId,
        categoryId,
        userName: unescapeField(rawName || 'Customer'),
        location: rawLoc ? unescapeField(rawLoc) : 'India',
        rating,
        verified,
        date: decodeCompactDate(rawDate || ''),
        comment: unescapeField(rawComment || ''),
        reviewImage: rawImg ? unescapeField(rawImg) : undefined
      };
    }
    return null;
  }

  if (typeof entry === 'object') {
    const obj = entry as Record<string, any>;
    const rawComment = String(obj.comment || '');
    return {
      id: String(obj.id || createCompactReviewId()),
      productId: obj.productId || productId,
      categoryId: obj.categoryId || categoryId,
      userName: String(obj.userName || obj.user_name || 'Verified Customer'),
      location: String(obj.location || 'India'),
      rating: Math.max(1, Math.min(5, Number(obj.rating || 5))),
      date: String(obj.date || 'Recently'),
      comment: rawComment.startsWith('tk1:') ? detokenizeComment(rawComment.slice(4)) : rawComment,
      verified: obj.verified ?? true,
      reviewImage: obj.reviewImage || obj.review_image || undefined
    };
  }

  return null;
}

export async function decodeCompactReviewAsync(
  entry: unknown,
  productId?: string,
  categoryId?: string
): Promise<ProductReview | null> {
  if (typeof entry === 'string' && entry.startsWith('rz2:')) {
    try {
      const bytes = fromBase64Url(entry.slice(4));
      const inflated = await inflateRawBytes(bytes);
      if (inflated) {
        return decodeCompactReviewSync(inflated, productId, categoryId);
      }
    } catch {
      // fall through
    }
  }
  const decoded = decodeCompactReviewSync(entry, productId, categoryId);
  if (decoded && (decoded.comment.startsWith('rz1:') || decoded.comment.startsWith('tk1:'))) {
    decoded.comment = await decompressReviewTextAsync(decoded.comment);
  }
  return decoded;
}

/**
 * Encodes an entire product's reviews list into compact strings for PostgreSQL JSONB storage.
 */
export function encodeCompactReviewsList(reviews?: ProductReview[]): string[] {
  if (!Array.isArray(reviews) || reviews.length === 0) return [];
  return reviews.map(encodeCompactReview);
}

export async function encodeCompactReviewsListAsync(reviews?: ProductReview[]): Promise<string[]> {
  if (!Array.isArray(reviews) || reviews.length === 0) return [];
  return Promise.all(reviews.map(encodeCompactReviewAsync));
}

export function decodeCompactReviewsListSync(
  rawReviews: unknown,
  productId?: string,
  categoryId?: string
): ProductReview[] {
  if (!Array.isArray(rawReviews)) return [];
  return rawReviews
    .map((entry) => decodeCompactReviewSync(entry, productId, categoryId))
    .filter(Boolean) as ProductReview[];
}

export async function decodeCompactReviewsListAsync(
  rawReviews: unknown,
  productId?: string,
  categoryId?: string
): Promise<ProductReview[]> {
  if (!Array.isArray(rawReviews)) return [];
  const list = await Promise.all(
    rawReviews.map((entry) => decodeCompactReviewAsync(entry, productId, categoryId))
  );
  return list.filter(Boolean) as ProductReview[];
}

/**
 * Calculates exact UTF-8 storage size in KB of the compacted review stored in Supabase.
 */
export function getCompactReviewKb(r: ProductReview): number {
  const packed = encodeCompactReview(r);
  const bytes =
    typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(packed).length
      : packed.length;
  return Number((bytes / 1024).toFixed(3));
}
