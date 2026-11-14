import { UserProfile } from '../types';

function escapePipe(val: string): string {
  return val
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\p')
    .replace(/\r?\n/g, '\\n');
}

function unescapePipe(val: string): string {
  return val.replace(/\\(\\|p|n)/g, (_, ch) => {
    if (ch === 'p') return '|';
    if (ch === 'n') return '\n';
    return '\\';
  });
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

async function deflateRaw(text: string): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const input = new TextEncoder().encode(text);
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(input);
    writer.close();
    const buf = await new Response(cs.readable).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

async function inflateRaw(bytes: Uint8Array): Promise<string | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(new Uint8Array(bytes));
    writer.close();
    return await new Response(ds.readable).text();
  } catch {
    return null;
  }
}

const ADDR_TOKENS: Array<[string, string]> = [
  ['Apartment', '^A'],
  ['apartment', '^a'],
  ['Residency', '^R'],
  ['residency', '^r'],
  ['Mohalla', '^M'],
  ['mohalla', '^m'],
  ['Village', '^V'],
  ['village', '^v'],
  ['Colony', '^C'],
  ['colony', '^c'],
  ['Nagar', '^N'],
  ['nagar', '^n'],
  ['Street', '^S'],
  ['street', '^s'],
  ['Station', '^T'],
  ['station', '^t'],
  ['Masjid', '^J'],
  ['masjid', '^j'],
  ['Market', '^K'],
  ['market', '^k'],
  ['District', '^D'],
  ['district', '^d'],
  ['Bazaar', '^Z'],
  ['bazaar', '^z'],
  ['Chowk', '^W'],
  ['chowk', '^w'],
  ['Bihar', '^B'],
  ['India', '^I'],
  ['Near', '^E'],
  ['near', '^e'],
  ['Ward', '^Q'],
  ['ward', '^q'],
  ['Road', '^O'],
  ['road', '^o'],
  ['Post', '^P'],
  ['post', '^p']
];

const ADDR_TOKEN_MAP: Record<string, string> = Object.fromEntries(
  ADDR_TOKENS.map(([w, t]) => [t, w])
);

function tokenizeAddr(text: string): string {
  let out = escapePipe((text || '').trim().replace(/\s+/g, ' ')).replace(/\^/g, '^^');
  for (const [word, tok] of ADDR_TOKENS) {
    out = out.replace(new RegExp(`\\b${word}\\b`, 'g'), tok);
  }
  return out;
}

function detokenizeAddr(encoded: string): string {
  const restored = encoded.replace(/\^(\^|[a-zA-Z])/g, (full, ch) => {
    if (ch === '^') return '^';
    const word = ADDR_TOKEN_MAP[`^${ch}`];
    return word !== undefined ? word : full;
  });
  return unescapePipe(restored);
}

/**
 * Generates deterministic compact user ID based on phone if not already assigned.
 */
export function buildStableUserId(phone: string, existingId?: string): string {
  if (existingId && existingId.trim()) return existingId.trim();
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 6) {
    return `u_${Number(digits).toString(36)}`;
  }
  return `u_${Date.now().toString(36)}`;
}

/**
 * Packs all address fields into a single ultra-compact string (typically 0.04-0.08 KB).
 * Format: u1|<buildingOrVillage>|<fullAddress>|<landmark>|<city>|<state>|<pincode>
 */
export function encodeCompactUserAddress(u: UserProfile): string {
  const bldg = tokenizeAddr(u.buildingOrVillage || '');
  const addr = tokenizeAddr(u.fullAddress || '');
  const lm = tokenizeAddr(u.landmark || '');
  const city = tokenizeAddr(u.city || '');
  const state = tokenizeAddr(u.state || '');
  const pin = escapePipe((u.pincode || '').trim());
  return `u1|${bldg}|${addr}|${lm}|${city}|${state}|${pin}`;
}

export async function encodeCompactUserAddressAsync(u: UserProfile): Promise<string> {
  const packed = encodeCompactUserAddress(u);
  if (packed.length < 75) return packed;
  const deflated = await deflateRaw(packed);
  if (!deflated) return packed;
  const candidate = `uz1:${toBase64Url(deflated)}`;
  const rawBytes = new TextEncoder().encode(packed).length;
  return candidate.length < rawBytes ? candidate : packed;
}

export function decodeCompactUserAddressSync(
  packed: string
): Pick<UserProfile, 'buildingOrVillage' | 'fullAddress' | 'landmark' | 'city' | 'state' | 'pincode'> {
  if (!packed || typeof packed !== 'string' || !packed.startsWith('u1|')) {
    return {
      buildingOrVillage: '',
      fullAddress: packed || '',
      landmark: undefined,
      city: '',
      state: '',
      pincode: ''
    };
  }
  const [, bldg, addr, lm, city, state, pin] = packed.split('|');
  const cleanLm = lm ? detokenizeAddr(lm) : '';
  return {
    buildingOrVillage: detokenizeAddr(bldg || ''),
    fullAddress: detokenizeAddr(addr || ''),
    landmark: cleanLm || undefined,
    city: detokenizeAddr(city || ''),
    state: detokenizeAddr(state || ''),
    pincode: unescapePipe(pin || '')
  };
}

export async function decodeCompactUserAddressAsync(
  packed: string
): Promise<Pick<UserProfile, 'buildingOrVillage' | 'fullAddress' | 'landmark' | 'city' | 'state' | 'pincode'>> {
  if (typeof packed === 'string' && packed.startsWith('uz1:')) {
    try {
      const bytes = fromBase64Url(packed.slice(4));
      const inflated = await inflateRaw(bytes);
      if (inflated) {
        return decodeCompactUserAddressSync(inflated);
      }
    } catch {
      // fall through
    }
  }
  return decodeCompactUserAddressSync(packed);
}

/**
 * Exact KB footprint of the compacted address payload stored in Supabase.
 */
export function getCompactUserKb(u: UserProfile): number {
  const packed = encodeCompactUserAddress(u);
  const fullCompact = `${u.id || buildStableUserId(u.phone)}|${u.fullName}|${u.phone}|${u.age}|${packed}`;
  const bytes =
    typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(fullCompact).length
      : fullCompact.length;
  return Number((bytes / 1024).toFixed(3));
}
