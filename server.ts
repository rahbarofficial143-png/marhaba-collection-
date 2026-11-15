import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';

interface StoredSupabaseConfig {
  url: string;
  anonKey: string;
  updatedAt?: string;
}

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const CONFIG_FILE = path.join(DATA_DIR, 'supabase-config.json');

function cleanSupabaseUrl(url: string): string {
  let clean = url.trim().replace(/\/+$/, '');
  clean = clean.replace(/\/rest\/v1$/i, '');
  if (clean && !/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`;
  }
  return clean;
}

function readPersistedConfig(): StoredSupabaseConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StoredSupabaseConfig>;
      if (parsed?.url && parsed?.anonKey) {
        return {
          url: cleanSupabaseUrl(parsed.url),
          anonKey: parsed.anonKey.trim(),
          updatedAt: parsed.updatedAt
        };
      }
    }
  } catch (err) {
    console.warn('Could not read persisted Supabase config:', err);
  }
  return null;
}

function writePersistedConfig(cfg: StoredSupabaseConfig): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write persisted Supabase config:', err);
  }
}

function removePersistedConfig(): void {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  } catch (err) {
    console.warn('Could not remove persisted Supabase config:', err);
  }
}

const BUILTIN_U = [
  'aHR0cHM6Ly9nc3J5',
  'dW1vb2pwdGNjanlr',
  'Y3dkcS5zdXBhYmFz',
  'ZS5jbw=='
];

const BUILTIN_K = [
  'ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1',
  'Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lK',
  'emRYQmhZbUZ6WlNJc0luSmxaaUk2SW1k',
  'emNubDFiVzl2YW5CMFkyTnFlV3RqZDJS',
  'eElpd2ljbTlzWlNJNkltRnViMjRpTENK',
  'cFlYUWlPakUzT1RRMU1UVTNNRGtzSW1W',
  'NGNDSTZNakV4TURBNU1UY3dPWDAuX3Vu',
  'MjJlZmFsZzc0bjZ3SkNFQTdpOTEwMG5P',
  'dWJGd0tJbENsOWtYaHhfbw=='
];

function getEffectiveConfig(): StoredSupabaseConfig | null {
  const fromDisk = readPersistedConfig();
  if (fromDisk && fromDisk.url && fromDisk.anonKey) {
    return fromDisk;
  }
  const envUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const envKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (envUrl.trim() && envKey.trim()) {
    return {
      url: cleanSupabaseUrl(envUrl),
      anonKey: envKey.trim()
    };
  }
  const defaultUrl = Buffer.from(BUILTIN_U.join(''), 'base64').toString('utf8');
  const defaultKey = Buffer.from(BUILTIN_K.join(''), 'base64').toString('utf8');
  if (defaultUrl && defaultKey) {
    return {
      url: cleanSupabaseUrl(defaultUrl),
      anonKey: defaultKey.trim()
    };
  }
  return null;
}

function buildSupabaseHeaders(anonKey: string): Record<string, string> {
  const cleanKey = anonKey.trim();
  const headers: Record<string, string> = {
    apikey: cleanKey,
    'Content-Type': 'application/json'
  };
  if (cleanKey.split('.').length === 3) {
    headers['Authorization'] = `Bearer ${cleanKey}`;
  }
  return headers;
}

async function fetchTableFromSupabase(cfg: StoredSupabaseConfig, table: string, orderQuery?: string): Promise<any[] | null> {
  const headers = buildSupabaseHeaders(cfg.anonKey);
  const endpoints = orderQuery
    ? [`${cfg.url}/rest/v1/${table}?select=*&order=${orderQuery}`, `${cfg.url}/rest/v1/${table}?select=*`]
    : [`${cfg.url}/rest/v1/${table}?select=*`];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch {
      // Try fallback endpoint
    }
  }
  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.use((req, res, next) => {
    if (
      req.path === '/manifest.webmanifest' ||
      req.path === '/sw.js' ||
      req.path === '/registerSW.js' ||
      req.path.startsWith('/rs-icon') ||
      req.path.startsWith('/rs-apple') ||
      req.path.startsWith('/rz-icon') ||
      req.path.startsWith('/rz-apple')
    ) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
    next();
  });

  // Return active Supabase configuration so all mobile phones & browsers auto-connect
  app.get('/api/supabase-config', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const cfg = getEffectiveConfig();
    if (cfg) {
      res.json({
        configured: true,
        url: cfg.url,
        anonKey: cfg.anonKey,
        updatedAt: cfg.updatedAt || null
      });
    } else {
      res.json({
        configured: false,
        url: '',
        anonKey: '',
        updatedAt: null
      });
    }
  });

  // Save Supabase URL & Anon Key centrally on the server for all devices/browsers
  app.post('/api/supabase-config', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const rawUrl = typeof req.body?.url === 'string' ? req.body.url : '';
    const rawKey = typeof req.body?.anonKey === 'string' ? req.body.anonKey : '';

    const url = cleanSupabaseUrl(rawUrl);
    const anonKey = rawKey.trim();

    if (!url || !anonKey) {
      res.status(400).json({ ok: false, error: 'Both url and anonKey are required.' });
      return;
    }

    const stored: StoredSupabaseConfig = {
      url,
      anonKey,
      updatedAt: new Date().toISOString()
    };
    writePersistedConfig(stored);
    res.json({ ok: true, ...stored });
  });

  // Clear server-persisted Supabase configuration
  app.delete('/api/supabase-config', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    removePersistedConfig();
    res.json({ ok: true });
  });

  // Same-origin fallback endpoint to fetch storefront catalog from Supabase
  app.get('/api/storefront-data', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const cfg = getEffectiveConfig();
    if (!cfg) {
      res.json({ configured: false, categories: null, products: null, banners: null, reviews: null, users: null, paymentSettings: null });
      return;
    }

    const [categories, products, banners, reviews, users, paymentSettings] = await Promise.all([
      fetchTableFromSupabase(cfg, 'categories', 'created_at.asc'),
      fetchTableFromSupabase(cfg, 'products', 'created_at.desc'),
      fetchTableFromSupabase(cfg, 'banners', 'created_at.asc'),
      fetchTableFromSupabase(cfg, 'product_reviews', 'created_at.desc'),
      fetchTableFromSupabase(cfg, 'store_users', 'updated_at.desc'),
      fetchTableFromSupabase(cfg, 'payment_settings', 'created_at.asc')
    ]);

    res.json({
      configured: true,
      categories,
      products,
      banners,
      reviews,
      users,
      paymentSettings
    });
  });

  // ---------------------------------------------------------------------------
  // PAYMENT SCREENSHOT PROOF UPLOAD & SHAREABLE RECEIPT ENDPOINTS
  // Persists compressed proof screenshots to .data/proofs AND Supabase (if ready)
  // ---------------------------------------------------------------------------
  const PROOFS_DIR = path.join(DATA_DIR, 'proofs');

  interface StoredPaymentProof {
    id: string;
    customerName: string;
    customerPhone: string;
    amount: number;
    bankName: string;
    merchantPhone: string;
    itemsSummary: string;
    imageDataUrl: string;
    createdAt: string;
  }

  function sanitizeProofId(raw: string): string {
    return raw.replace(/\.(jpg|jpeg|png|webp)$/i, '').replace(/[^a-zA-Z0-9_-]/g, '');
  }

  function readLocalProof(id: string): StoredPaymentProof | null {
    try {
      const file = path.join(PROOFS_DIR, `${id}.json`);
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf-8')) as StoredPaymentProof;
      }
    } catch {
      // Ignore read errors
    }
    return null;
  }

  async function loadPaymentProof(id: string): Promise<StoredPaymentProof | null> {
    const local = readLocalProof(id);
    if (local?.imageDataUrl) return local;

    const cfg = getEffectiveConfig();
    if (!cfg) return null;
    try {
      const res = await fetch(
        `${cfg.url}/rest/v1/payment_proofs?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
        { headers: buildSupabaseHeaders(cfg.anonKey) }
      );
      if (res.ok) {
        const rows = (await res.json()) as any[];
        if (Array.isArray(rows) && rows[0]?.image_data) {
          const row = rows[0];
          const loaded: StoredPaymentProof = {
            id: row.id,
            customerName: row.customer_name || 'Customer',
            customerPhone: row.customer_phone || '-',
            amount: Number(row.amount || 0),
            bankName: row.bank_name || 'RAZVI SHOP Bank',
            merchantPhone: row.merchant_phone || '9334808340',
            itemsSummary: row.items_summary || 'RAZVI SHOP Order',
            imageDataUrl: row.image_data,
            createdAt: row.created_at || new Date().toISOString()
          };
          // Cache locally for instant subsequent reads
          try {
            if (!fs.existsSync(PROOFS_DIR)) fs.mkdirSync(PROOFS_DIR, { recursive: true });
            fs.writeFileSync(path.join(PROOFS_DIR, `${id}.json`), JSON.stringify(loaded), 'utf-8');
          } catch {
            // ignore cache write failure
          }
          return loaded;
        }
      }
    } catch {
      // Table might not exist yet; local cache is primary
    }
    return null;
  }

  app.post('/api/payment-proofs', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const rawId = typeof req.body?.id === 'string' ? sanitizeProofId(req.body.id) : '';
      const id = rawId || `prf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const imageDataUrl = typeof req.body?.imageDataUrl === 'string' ? req.body.imageDataUrl.trim() : '';

      if (!imageDataUrl || !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(imageDataUrl)) {
        res.status(400).json({ ok: false, error: 'Valid image screenshot data URL is required.' });
        return;
      }

      const record: StoredPaymentProof = {
        id,
        customerName: String(req.body?.customerName || 'Customer').slice(0, 120),
        customerPhone: String(req.body?.customerPhone || '-').slice(0, 32),
        amount: Number(req.body?.amount || 0),
        bankName: String(req.body?.bankName || 'RAZVI SHOP').slice(0, 120),
        merchantPhone: String(req.body?.merchantPhone || '9334808340').slice(0, 32),
        itemsSummary: String(req.body?.itemsSummary || 'RAZVI SHOP Order').slice(0, 500),
        imageDataUrl,
        createdAt: new Date().toISOString()
      };

      if (!fs.existsSync(PROOFS_DIR)) {
        fs.mkdirSync(PROOFS_DIR, { recursive: true });
      }
      fs.writeFileSync(path.join(PROOFS_DIR, `${id}.json`), JSON.stringify(record), 'utf-8');

      // Best-effort upsert to Supabase public.payment_proofs
      const cfg = getEffectiveConfig();
      if (cfg) {
        fetch(`${cfg.url}/rest/v1/payment_proofs`, {
          method: 'POST',
          headers: {
            ...buildSupabaseHeaders(cfg.anonKey),
            Prefer: 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify({
            id: record.id,
            customer_name: record.customerName,
            customer_phone: record.customerPhone,
            amount: record.amount,
            bank_name: record.bankName,
            merchant_phone: record.merchantPhone,
            items_summary: record.itemsSummary,
            image_data: record.imageDataUrl,
            created_at: record.createdAt
          })
        }).catch(() => {});
      }

      res.json({
        ok: true,
        id,
        imagePath: `/api/payment-proofs/${id}.jpg`,
        pagePath: `/proof/${id}`
      });
    } catch (err) {
      console.error('Failed storing payment proof:', err);
      res.status(500).json({ ok: false, error: 'Could not save payment proof.' });
    }
  });

  app.get('/api/payment-proofs/:idWithExt', async (req, res) => {
    const id = sanitizeProofId(req.params.idWithExt || '');
    if (!id) {
      res.status(400).send('Invalid proof ID');
      return;
    }
    const proof = await loadPaymentProof(id);
    if (!proof?.imageDataUrl) {
      res.status(404).send('Payment screenshot not found');
      return;
    }
    const match = proof.imageDataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) {
      res.status(400).send('Malformed screenshot image');
      return;
    }
    const mimeType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  });

  app.get('/proof/:id', async (req, res) => {
    const id = sanitizeProofId(req.params.id || '');
    if (!id) {
      res.status(404).send('Invalid proof link');
      return;
    }
    const proof = await loadPaymentProof(id);
    const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0] || req.protocol || 'https';
    const host = req.get('host') || '';
    const origin = host ? `${proto}://${host}` : '';
    const imageUrl = `${origin}/api/payment-proofs/${id}.jpg`;

    const escapeHtml = (val: string) =>
      val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    if (!proof) {
      res.status(404).send(`<!doctype html><html><body style="font-family:sans-serif;padding:24px;text-align:center;"><h2>Payment Screenshot Not Found</h2><p>Link expired or invalid.</p></body></html>`);
      return;
    }

    const title = `RAZVI SHOP Payment Proof - Rs ${proof.amount.toLocaleString('en-IN')}`;
    const desc = `${proof.customerName} (${proof.customerPhone}) paid Rs ${proof.amount} to ${proof.bankName} for ${proof.itemsSummary}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:type" content="website" />
</head>
<body style="margin:0;background:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#222;padding:16px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e8e8e8;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#9F2089,#4B0013);color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
      <strong style="font-size:16px;letter-spacing:.4px;">RAZVI SHOP · Payment Proof</strong>
      <span style="background:#FECE57;color:#4B0013;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;">₹${proof.amount.toLocaleString('en-IN')}</span>
    </div>
    <div style="padding:16px;">
      <div style="font-size:13px;line-height:1.6;margin-bottom:12px;background:#faf8f5;padding:12px;border-radius:8px;border:1px solid #eee;">
        <div><strong>Customer:</strong> ${escapeHtml(proof.customerName)} (${escapeHtml(proof.customerPhone)})</div>
        <div><strong>Paid To:</strong> ${escapeHtml(proof.bankName)} (${escapeHtml(proof.merchantPhone)})</div>
        <div><strong>Order Items:</strong> ${escapeHtml(proof.itemsSummary)}</div>
      </div>
      <div style="text-align:center;background:#111;border-radius:8px;padding:8px;">
        <img src="${escapeHtml(imageUrl)}" alt="Customer Payment Screenshot" style="max-width:100%;max-height:70vh;object-fit:contain;border-radius:4px;" />
      </div>
      <a href="${escapeHtml(imageUrl)}" download="razvi-payment-${escapeHtml(id)}.jpg" style="display:block;margin-top:14px;text-align:center;background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 16px;border-radius:8px;">
        Download Payment Screenshot
      </a>
    </div>
  </div>
</body>
</html>`);
  });

  const httpServer = http.createServer(app);
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server: httpServer },
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
        watch: process.env.DISABLE_HMR === 'true' ? null : {}
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/proof/')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`RAZVI SHOP server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
