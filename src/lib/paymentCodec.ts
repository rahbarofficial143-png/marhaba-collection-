import { PaymentAccount } from '../types';

function escapeField(val: string): string {
  return encodeURIComponent((val || '').trim());
}

function unescapeField(val: string): string {
  try {
    return decodeURIComponent(val || '');
  } catch {
    return val || '';
  }
}

export function buildPaymentAccountId(existingId?: string): string {
  if (existingId && existingId.trim()) return existingId.trim();
  return `pay_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Compact synchronous packing for secondary payment fields (upiId, accountHolder).
 * Keeps Supabase rows tiny (typically 0.02 - 0.05 KB for metadata).
 */
export function encodeCompactPaymentMeta(account: PaymentAccount): string {
  const parts = [
    escapeField(account.upiId || ''),
    escapeField(account.accountHolder || '')
  ];
  return `p1|${parts.join('|')}`;
}

function uint8ToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUint8(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encodeCompactPaymentMetaAsync(account: PaymentAccount): Promise<string> {
  const raw = encodeCompactPaymentMeta(account);
  if (typeof CompressionStream === 'undefined') {
    return raw;
  }
  try {
    const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const buf = await new Response(stream).arrayBuffer();
    const compressed = `pz1:${uint8ToBase64Url(new Uint8Array(buf))}`;
    return compressed.length < raw.length ? compressed : raw;
  } catch {
    return raw;
  }
}

function parseP1(raw: string): { upiId: string; accountHolder: string } {
  if (!raw.startsWith('p1|')) {
    return { upiId: '', accountHolder: '' };
  }
  const parts = raw.slice(3).split('|');
  return {
    upiId: unescapeField(parts[0] || ''),
    accountHolder: unescapeField(parts[1] || '')
  };
}

export function decodeCompactPaymentMetaSync(packed: string): { upiId: string; accountHolder: string } {
  if (!packed || typeof packed !== 'string') {
    return { upiId: '', accountHolder: '' };
  }
  if (packed.startsWith('p1|')) {
    return parseP1(packed);
  }
  return { upiId: '', accountHolder: '' };
}

export async function decodeCompactPaymentMetaAsync(packed: string): Promise<{ upiId: string; accountHolder: string }> {
  if (!packed || typeof packed !== 'string') {
    return { upiId: '', accountHolder: '' };
  }
  if (packed.startsWith('p1|')) {
    return parseP1(packed);
  }
  if (packed.startsWith('pz1:') && typeof DecompressionStream !== 'undefined') {
    try {
      const bytes = base64UrlToUint8(packed.slice(4));
      const stream = new Blob([bytes.buffer as ArrayBuffer]).stream().pipeThrough(
        new DecompressionStream('deflate-raw')
      );
      const text = await new Response(stream).text();
      return parseP1(text);
    } catch {
      return { upiId: '', accountHolder: '' };
    }
  }
  return { upiId: '', accountHolder: '' };
}

/**
 * Computes exact total byte size (in KB) of a payment row in Supabase.
 */
export function getPaymentRowKb(account: PaymentAccount): number {
  const combined = `${account.id}|${account.phone}|${account.bankName}|${account.qrImageUrl}|${encodeCompactPaymentMeta(account)}`;
  const bytes =
    typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(combined).length
      : combined.length;
  return Number((bytes / 1024).toFixed(2));
}
