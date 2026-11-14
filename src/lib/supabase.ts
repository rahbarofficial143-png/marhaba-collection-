import { Product, Banner, Category, Order, SupabaseConfig, ProductReview } from '../types';
import { getBuiltInSupabaseDefaults } from './storefrontDefaults';
import { encodeMultiColorSingleLink, decodeMultiColorSingleLink } from './multiColorCodec';

export const SUPABASE_REVIEWS_SQL = `-- ==============================================================================
-- MARHABA COLLECTION: PRODUCT REVIEWS TABLE SQL (Customer & Admin Reviews)
-- Run this in Supabase SQL Editor to enable dedicated public.product_reviews table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.product_reviews (
    id TEXT PRIMARY KEY DEFAULT ('rev_' || substr(md5(random()::text), 1, 8)),
    product_id TEXT NOT NULL,
    category_id TEXT DEFAULT 'sarees',
    user_name TEXT NOT NULL,
    location TEXT DEFAULT 'India',
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    review_image TEXT,
    verified BOOLEAN DEFAULT true,
    date TEXT NOT NULL DEFAULT to_char(now(), 'DD Mon YYYY'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_category_id ON public.product_reviews (category_id);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow All Product Reviews" ON public.product_reviews;
CREATE POLICY "Allow All Product Reviews" ON public.product_reviews
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.product_reviews; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;`;

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- MARHABA COLLECTION: COMPLETE PRODUCTION SUPABASE DATABASE SCHEMA & SEED DATA
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY DEFAULT ('cat_' || substr(md5(random()::text), 1, 8)),
    label TEXT NOT NULL,
    slug TEXT NOT NULL,
    image_url TEXT,
    description TEXT,
    item_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PRODUCTS TABLE
-- Uses category string (no rigid FK to prevent Table Editor insert blocks)
-- Uses TEXT[] for images to keep size in minimal KB without consuming Supabase bucket quota
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY DEFAULT ('prod_' || substr(md5(random()::text), 1, 8)),
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'sarees',
    category_label TEXT NOT NULL DEFAULT 'Pure Silk Sarees',
    artisan_cluster TEXT NOT NULL DEFAULT 'Varanasi',
    artisan_name TEXT NOT NULL DEFAULT 'Marhaba Master Weavers',
    provenance_tag TEXT NOT NULL DEFAULT 'VARANASI WEAVERS',
    supplier_name TEXT DEFAULT 'Marhaba Certified Loom Hub',
    supplier_rating NUMERIC DEFAULT 4.8,
    m_trusted BOOLEAN DEFAULT true,
    color TEXT DEFAULT 'Royal Burgundy',
    color_hex TEXT DEFAULT '#6B1426',
    price NUMERIC NOT NULL,
    original_price NUMERIC NOT NULL,
    discount_percent INTEGER DEFAULT 50,
    rating NUMERIC DEFAULT 4.8,
    review_count INTEGER DEFAULT 120,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    fabric TEXT NOT NULL,
    weave_type TEXT NOT NULL,
    blouse_piece TEXT DEFAULT 'Included (0.8m Unstitched)',
    dimensions TEXT DEFAULT '6.3 meters with blouse',
    care TEXT DEFAULT 'Dry Clean Only',
    dispatch_time TEXT DEFAULT 'Dispatches in 24 hours',
    free_delivery BOOLEAN DEFAULT true,
    ready_to_ship BOOLEAN DEFAULT true,
    is_pure_silk BOOLEAN DEFAULT true,
    is_bridal BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    available_sizes TEXT[] DEFAULT ARRAY['Free Size (Unstitched)'],
    description TEXT NOT NULL,
    reviews JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_fkey;

-- 4. HERO PROMOTIONAL BANNERS TABLE
CREATE TABLE IF NOT EXISTS public.banners (
    id TEXT PRIMARY KEY DEFAULT ('banner_' || substr(md5(random()::text), 1, 8)),
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    badge_text TEXT NOT NULL DEFAULT 'MARHABA EXCLUSIVE',
    cta_text TEXT NOT NULL DEFAULT 'Shop Now',
    category_link TEXT NOT NULL DEFAULT 'sarees',
    image_url TEXT NOT NULL,
    bg_gradient TEXT DEFAULT 'from-[#9F2089] via-[#80182E] to-[#4B0013]',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ORDERS TABLE (Includes UPI 9334808340 and UTR number tracking)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT ('MC-' || floor(random() * 899999 + 100000)::text),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    shipping_address JSONB NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'upi',
    payment_phone TEXT DEFAULT '9334808340',
    utr_number TEXT,
    pricing JSONB NOT NULL,
    coupon_code TEXT,
    status TEXT DEFAULT 'confirmed',
    tracking_number TEXT,
    estimated_delivery_date TEXT,
    items JSONB NOT NULL
);

-- Ensure older tables get any newly added columns seamlessly
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS item_count INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_name TEXT DEFAULT 'Marhaba Certified Loom Hub';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_rating NUMERIC DEFAULT 4.8;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS m_trusted BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'Royal Burgundy';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS color_hex TEXT DEFAULT '#6B1426';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dispatch_time TEXT DEFAULT 'Dispatches in 24 hours';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reviews JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_phone TEXT DEFAULT '9334808340';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utr_number TEXT;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) - PERMISSIVE FOR ANON & AUTHENTICATED
-- ==============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS "Allow All Categories" ON public.categories;
DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;
DROP POLICY IF EXISTS "Allow All Insert Categories" ON public.categories;
DROP POLICY IF EXISTS "Allow All Update Categories" ON public.categories;
DROP POLICY IF EXISTS "Allow All Delete Categories" ON public.categories;

DROP POLICY IF EXISTS "Allow All Products" ON public.products;
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
DROP POLICY IF EXISTS "Allow All Insert Products" ON public.products;
DROP POLICY IF EXISTS "Allow All Update Products" ON public.products;
DROP POLICY IF EXISTS "Allow All Delete Products" ON public.products;

DROP POLICY IF EXISTS "Allow All Banners" ON public.banners;
DROP POLICY IF EXISTS "Public Read Banners" ON public.banners;
DROP POLICY IF EXISTS "Allow All Insert Banners" ON public.banners;
DROP POLICY IF EXISTS "Allow All Update Banners" ON public.banners;
DROP POLICY IF EXISTS "Allow All Delete Banners" ON public.banners;

DROP POLICY IF EXISTS "Allow All Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Read Orders" ON public.orders;
DROP POLICY IF EXISTS "Allow All Insert Orders" ON public.orders;
DROP POLICY IF EXISTS "Allow All Update Orders" ON public.orders;
DROP POLICY IF EXISTS "Allow All Delete Orders" ON public.orders;

-- Unrestricted CRUD for Storefront & Admin Table Editor
CREATE POLICY "Allow All Categories" ON public.categories FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Products" ON public.products FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Banners" ON public.banners FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Orders" ON public.orders FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- ==============================================================================
-- 7. INITIAL CATEGORIES (Clean structure, no preloaded stock images)
-- ==============================================================================
INSERT INTO public.categories (id, label, slug, image_url, description)
VALUES
  ('all', 'All Ethnic', 'all', '', 'Complete Marhaba Collection handcrafted ethnic & festive apparel'),
  ('sarees', 'Pure Sarees', 'sarees', '', 'Pure Katan Banarasi, Kanchipuram, Chanderi & Organza Sarees'),
  ('lehengas', 'Bridal Lehengas', 'lehengas', '', 'Micro-Velvet, Raw Silk & Zardozi Wedding Lehengas'),
  ('anarkalis', 'Kurti & Suits', 'anarkalis', '', 'Lucknowi Chikankari, Shararas & Flowing Anarkali Sets'),
  ('mens', 'Men’s Royal Ethnic', 'mens', '', 'Raw Silk Sherwanis, Nehru Jackets & Silk Kurta Pajamas'),
  ('jewellery', 'Heritage Jewellery', 'jewellery', '', '22K Gold Micron Plated Kundan Polki Chokers & Jhumkas'),
  ('dupattas', 'Artisanal Dupattas', 'dupattas', '', 'Banarasi Zari Weave & Handloom Chanderi Stoles'),
  ('western', 'Indo-Western Fusion', 'western', '', 'Contemporary Ethnic Co-ord Sets, Tunics & Capes')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 8. PRODUCT REVIEWS TABLE (Customer & Admin Managed Product Reviews)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id TEXT PRIMARY KEY DEFAULT ('rev_' || substr(md5(random()::text), 1, 8)),
    product_id TEXT NOT NULL,
    category_id TEXT DEFAULT 'sarees',
    user_name TEXT NOT NULL,
    location TEXT DEFAULT 'India',
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    review_image TEXT,
    verified BOOLEAN DEFAULT true,
    date TEXT NOT NULL DEFAULT to_char(now(), 'DD Mon YYYY'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_category_id ON public.product_reviews (category_id);
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Product Reviews" ON public.product_reviews;
CREATE POLICY "Allow All Product Reviews" ON public.product_reviews FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- ==============================================================================
-- 9. REALTIME PUBLICATION (Enables instant sync events on connected clients)
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.categories; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.products; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.banners; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.product_reviews; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- ==============================================================================
-- SUCCESS: Tables & RLS are active! Add products, banners & reviews freely.
-- ==============================================================================
`;

const SUPABASE_CONFIG_KEY = 'marhaba_supabase_config';

export function hasLocalSupabaseOverride(): boolean {
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Boolean(parsed && parsed.url && parsed.anonKey);
    }
  } catch {
    // ignore storage errors
  }
  return false;
}

export function getSupabaseConfig(): SupabaseConfig {
  try {
    // Allow storefront share links (?sb_url=...&sb_key=...) to auto-configure user devices
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const sharedUrl = params.get('sb_url');
      const sharedKey = params.get('sb_key');
      if (sharedUrl && sharedKey) {
        const sharedCfg: SupabaseConfig = {
          url: sharedUrl.trim(),
          anonKey: sharedKey.trim(),
          isConnected: true,
          autoSync: true
        };
        localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(sharedCfg));
        params.delete('sb_url');
        params.delete('sb_key');
        const cleanQuery = params.toString();
        const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', cleanUrl);
        return sharedCfg;
      }
    }

    const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading Supabase config', e);
  }
  const envUrl = ((import.meta as any).env?.VITE_SUPABASE_URL || '').trim();
  const envKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '').trim();
  if (envUrl && envKey) {
    return {
      url: envUrl,
      anonKey: envKey,
      isConnected: true,
      autoSync: true
    };
  }
  const builtIn = getBuiltInSupabaseDefaults();
  return {
    url: builtIn.url,
    anonKey: builtIn.anonKey,
    isConnected: Boolean(builtIn.url && builtIn.anonKey),
    autoSync: true
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  try {
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving Supabase config', e);
  }
}

export function clearSupabaseConfig(): void {
  try {
    localStorage.removeItem(SUPABASE_CONFIG_KEY);
  } catch (e) {
    console.error('Error clearing Supabase config', e);
  }
}

export async function fetchServerSupabaseConfig(): Promise<SupabaseConfig | null> {
  try {
    const res = await fetch('/api/supabase-config', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.configured && data?.url && data?.anonKey) {
      return {
        url: cleanSupabaseUrl(data.url),
        anonKey: String(data.anonKey).trim(),
        isConnected: true,
        autoSync: true
      };
    }
  } catch (err) {
    console.warn('Could not fetch server Supabase config', err);
  }
  return null;
}

export async function saveServerSupabaseConfig(url: string, anonKey: string): Promise<boolean> {
  try {
    const res = await fetch('/api/supabase-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: cleanSupabaseUrl(url),
        anonKey: anonKey.trim()
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not persist Supabase config on server', err);
    return false;
  }
}

export async function clearServerSupabaseConfig(): Promise<boolean> {
  try {
    const res = await fetch('/api/supabase-config', { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn('Could not clear server Supabase config', err);
    return false;
  }
}

export async function fetchStorefrontDataFromServer(): Promise<{
  categories: Category[] | null;
  products: Product[] | null;
  banners: Banner[] | null;
  reviews: ProductReview[] | null;
} | null> {
  try {
    const res = await fetch('/api/storefront-data', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.configured) return null;
    return {
      categories: Array.isArray(data.categories) ? data.categories.map(rowToCategory) : null,
      products: Array.isArray(data.products) ? data.products.map(rowToProduct) : null,
      banners: Array.isArray(data.banners) ? data.banners.map(rowToBanner) : null,
      reviews: Array.isArray(data.reviews) ? data.reviews.map(rowToReview) : null
    };
  } catch (err) {
    console.warn('Could not fetch storefront fallback data from server', err);
    return null;
  }
}

// Clean URL helper
export function cleanSupabaseUrl(url: string): string {
  let clean = url.trim().replace(/\/+$/, '');
  clean = clean.replace(/\/rest\/v1$/i, '');
  if (clean && !/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`;
  }
  return clean;
}

function buildSupabaseHeaders(anonKey: string, extra?: Record<string, string>): Record<string, string> {
  const cleanKey = anonKey.trim();
  const headers: Record<string, string> = {
    'apikey': cleanKey,
    ...extra
  };
  // Legacy anon/service JWT keys require Bearer Authorization; new sb_publishable_ keys only use apikey
  if (cleanKey.split('.').length === 3) {
    headers['Authorization'] = `Bearer ${cleanKey}`;
  }
  return headers;
}

let lastSupabaseErrorMessage: string | null = null;
export function getLastSupabaseError(): string | null {
  return lastSupabaseErrorMessage;
}

// Diagnostic connection tester with informative error messages
export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  if (!url.trim() || !key.trim()) {
    return { success: false, message: 'Please provide both Supabase URL and Anon API key.' };
  }

  const base = cleanSupabaseUrl(url);
  if (!base.startsWith('https://') && !base.startsWith('http://')) {
    return { success: false, message: 'URL must start with https:// (e.g. https://xyzcompany.supabase.co)' };
  }

  try {
    const res = await fetch(`${base}/rest/v1/categories?select=id&limit=1`, {
      method: 'GET',
      headers: buildSupabaseHeaders(key)
    });

    if (res.status === 200) {
      lastSupabaseErrorMessage = null;
      return { success: true, message: 'Connected successfully! Supabase database and tables are verified.' };
    }

    if (res.status === 401 || res.status === 403) {
      return { success: false, message: 'Invalid Anon API Key or RLS Policy blocking access. Run the SQL script below.' };
    }

    if (res.status === 404) {
      return { success: false, message: 'Table "categories" not found. Please run the SQL schema script in Supabase SQL Editor.' };
    }

    const errText = await res.text();
    return { success: false, message: `Supabase returned status ${res.status}: ${errText}` };
  } catch (err: any) {
    return { success: false, message: `Network error connecting to Supabase: ${err.message || 'CORS or unreachable URL'}` };
  }
}

// ---------------------------------------------------------------------------
// DATA MAPPERS (CamelCase React <-> SnakeCase Supabase PostgreSQL)
// ---------------------------------------------------------------------------

export function productToRow(p: Product): Record<string, any> {
  const singleEncodedImages = encodeMultiColorSingleLink(
    p.colorVariants,
    p.images,
    p.color,
    p.colorHex
  );
  const primaryVariantColor = p.colorVariants?.[0]?.colorName || p.color || 'Royal Burgundy';
  const primaryVariantHex = p.colorVariants?.[0]?.colorHex || p.colorHex || '#6B1426';

  return {
    id: p.id,
    title: p.title,
    category: p.category,
    category_label: p.categoryLabel,
    artisan_cluster: p.artisanCluster,
    artisan_name: p.artisanName,
    provenance_tag: p.provenanceTag,
    supplier_name: p.supplierName || 'Marhaba Certified Loom Hub',
    supplier_rating: p.supplierRating ?? 4.8,
    m_trusted: p.mTrusted ?? true,
    color: primaryVariantColor,
    color_hex: primaryVariantHex,
    price: p.price,
    original_price: p.originalPrice,
    discount_percent: p.discountPercent,
    rating: p.rating,
    review_count: p.reviewCount,
    images: singleEncodedImages,
    fabric: p.fabric,
    weave_type: p.weaveType,
    blouse_piece: p.blousePiece,
    dimensions: p.dimensions,
    care: p.care,
    dispatch_time: p.dispatchTime || 'Dispatches in 24 hours',
    free_delivery: p.freeDelivery,
    ready_to_ship: p.readyToShip,
    is_pure_silk: p.isPureSilk,
    is_bridal: p.isBridal,
    featured: p.featured ?? false,
    available_sizes: p.availableSizes || ['Free Size (Unstitched)'],
    description: p.description,
    reviews: p.reviews || []
  };
}

export function rowToProduct(row: any): Product {
  const decoded = decodeMultiColorSingleLink(
    row.images,
    row.color || 'Royal Burgundy',
    row.color_hex || '#6B1426'
  );

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    categoryLabel: row.category_label || row.category,
    artisanCluster: row.artisan_cluster || 'Varanasi',
    artisanName: row.artisan_name || 'Marhaba Master Weavers',
    provenanceTag: row.provenance_tag || 'VARANASI WEAVERS',
    supplierName: row.supplier_name,
    supplierRating: Number(row.supplier_rating || 4.8),
    mTrusted: row.m_trusted ?? true,
    color: decoded.colorVariants[0]?.colorName || row.color,
    colorHex: decoded.colorVariants[0]?.colorHex || row.color_hex,
    colorVariants: decoded.colorVariants.length > 0 ? decoded.colorVariants : undefined,
    price: Number(row.price),
    originalPrice: Number(row.original_price),
    discountPercent: Number(row.discount_percent || 50),
    rating: Number(row.rating || 4.8),
    reviewCount: Number(row.review_count || 120),
    images: decoded.images,
    fabric: row.fabric || 'Pure Silk',
    weaveType: row.weave_type || 'Handloom Weave',
    blousePiece: row.blouse_piece || 'Included',
    dimensions: row.dimensions || '6.3 meters with blouse',
    care: row.care || 'Dry Clean Only',
    dispatchTime: row.dispatch_time || 'Dispatches in 24 hours',
    freeDelivery: Boolean(row.free_delivery),
    readyToShip: Boolean(row.ready_to_ship),
    isPureSilk: Boolean(row.is_pure_silk),
    isBridal: Boolean(row.is_bridal),
    featured: Boolean(row.featured),
    availableSizes: Array.isArray(row.available_sizes) ? row.available_sizes : ['Free Size'],
    description: row.description || '',
    reviews: Array.isArray(row.reviews) ? row.reviews : []
  };
}

export function categoryToRow(c: Category): Record<string, any> {
  return {
    id: c.id,
    label: c.label,
    slug: c.slug,
    image_url: c.imageUrl,
    description: c.description,
    item_count: c.itemCount ?? 0
  };
}

export function rowToCategory(row: any): Category {
  return {
    id: row.id,
    label: row.label,
    slug: row.slug,
    imageUrl: row.image_url,
    description: row.description,
    itemCount: row.item_count ?? 0
  };
}

export function bannerToRow(b: Banner): Record<string, any> {
  return {
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    badge_text: b.badgeText,
    cta_text: b.ctaText,
    category_link: b.categoryLink,
    image_url: b.imageUrl,
    bg_gradient: b.bgGradient,
    active: b.active
  };
}

export function rowToBanner(row: any): Banner {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    badgeText: row.badge_text,
    ctaText: row.cta_text,
    categoryLink: row.category_link,
    imageUrl: row.image_url,
    bgGradient: row.bg_gradient,
    active: Boolean(row.active)
  };
}

export function orderToRow(o: Order): Record<string, any> {
  return {
    id: o.id,
    created_at: o.createdAt,
    shipping_address: o.shippingAddress,
    payment_method: o.paymentMethod,
    payment_phone: o.paymentPhone || '9334808340',
    utr_number: o.utrNumber,
    pricing: o.pricing,
    coupon_code: o.couponCode,
    status: o.status,
    tracking_number: o.trackingNumber,
    estimated_delivery_date: o.estimatedDeliveryDate,
    items: o.items
  };
}

export function rowToOrder(row: any): Order {
  return {
    id: row.id,
    createdAt: row.created_at,
    shippingAddress: row.shipping_address,
    paymentMethod: row.payment_method,
    paymentPhone: row.payment_phone || '9334808340',
    utrNumber: row.utr_number,
    pricing: row.pricing,
    couponCode: row.coupon_code,
    status: row.status,
    trackingNumber: row.tracking_number,
    estimatedDeliveryDate: row.estimated_delivery_date,
    items: row.items || []
  };
}

export function reviewToRow(r: ProductReview, productId: string, categoryId?: string): Record<string, any> {
  return {
    id: r.id,
    product_id: r.productId || productId,
    category_id: r.categoryId || categoryId || 'sarees',
    user_name: r.userName,
    location: r.location || 'India',
    rating: Math.max(1, Math.min(5, Math.round(Number(r.rating || 5)))),
    comment: r.comment,
    review_image: r.reviewImage || null,
    verified: Boolean(r.verified),
    date: r.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  };
}

export function rowToReview(row: any): ProductReview {
  return {
    id: row.id,
    productId: row.product_id,
    categoryId: row.category_id,
    userName: row.user_name || 'Verified Customer',
    location: row.location || 'India',
    rating: Number(row.rating || 5),
    comment: row.comment || '',
    reviewImage: row.review_image || undefined,
    verified: row.verified ?? true,
    date: row.date || 'Recently'
  };
}

export function calculateProductRatingSummary(
  reviews: ProductReview[],
  fallbackRating = 4.8,
  fallbackCount = 0
): { rating: number; reviewCount: number } {
  if (!reviews || reviews.length === 0) {
    return { rating: fallbackRating, reviewCount: fallbackCount };
  }
  const sum = reviews.reduce((acc, r) => acc + Math.max(1, Math.min(5, Number(r.rating || 5))), 0);
  return {
    rating: Number((sum / reviews.length).toFixed(1)),
    reviewCount: reviews.length
  };
}

export function mergeRemoteReviewsIntoProducts(
  products: Product[],
  remoteReviews: ProductReview[] | null
): Product[] {
  if (!remoteReviews || remoteReviews.length === 0) {
    return products;
  }
  const byProduct = new Map<string, ProductReview[]>();
  for (const rev of remoteReviews) {
    if (!rev.productId) continue;
    const list = byProduct.get(rev.productId) || [];
    list.push(rev);
    byProduct.set(rev.productId, list);
  }

  return products.map((p) => {
    const tableReviews = byProduct.get(p.id) || [];
    if (tableReviews.length === 0) return p;

    const mergedMap = new Map<string, ProductReview>();
    for (const r of p.reviews || []) {
      mergedMap.set(r.id, r);
    }
    for (const r of tableReviews) {
      mergedMap.set(r.id, { ...r, productId: p.id, categoryId: r.categoryId || p.category });
    }
    const mergedList = Array.from(mergedMap.values());
    const summary = calculateProductRatingSummary(mergedList, p.rating, p.reviewCount);
    return {
      ...p,
      reviews: mergedList,
      rating: summary.rating,
      reviewCount: summary.reviewCount
    };
  });
}

// ---------------------------------------------------------------------------
// REAL LIVE REST SYNC OPERATIONS
// ---------------------------------------------------------------------------

async function postgrestRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: any,
  config?: SupabaseConfig,
  preferHeader?: string
): Promise<any> {
  const cfg = config || getSupabaseConfig();
  if (!cfg.url || !cfg.anonKey) return null;

  const base = cleanSupabaseUrl(cfg.url);
  const url = `${base}/rest/v1/${endpoint}`;

  const headers = buildSupabaseHeaders(cfg.anonKey, {
    'Content-Type': 'application/json'
  });

  if (method === 'POST') {
    // PostgREST Upsert Header
    headers['Prefer'] = preferHeader || 'resolution=merge-duplicates,return=representation';
  } else if (method === 'PATCH' || method === 'DELETE') {
    headers['Prefer'] = preferHeader || 'return=representation';
  }

  const res = await fetch(url, {
    method,
    headers,
    cache: 'no-store',
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const errorText = await res.text();
    lastSupabaseErrorMessage = `Supabase Error (${res.status}): ${errorText}`;
    console.error(`PostgREST ${method} ${endpoint} failed (${res.status}):`, errorText);
    throw new Error(lastSupabaseErrorMessage);
  }

  lastSupabaseErrorMessage = null;
  if (method === 'DELETE') return true;
  const text = await res.text();
  return text ? JSON.parse(text) : true;
}

async function upsertResilient(
  table: string,
  rowOrRows: Record<string, any> | Record<string, any>[],
  config?: SupabaseConfig,
  preferHeader?: string
): Promise<any> {
  let payload = Array.isArray(rowOrRows)
    ? rowOrRows.map((r) => ({ ...r }))
    : { ...rowOrRows };

  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      return await postgrestRequest(table, 'POST', payload, config, preferHeader);
    } catch (err: any) {
      const msg = String(err?.message || '');
      const match = msg.match(/Could not find the '([^']+)' column/i);
      if (match && match[1]) {
        const badCol = match[1];
        if (Array.isArray(payload)) {
          payload = payload.map((r) => {
            const copy = { ...r };
            delete copy[badCol];
            return copy;
          });
        } else {
          delete payload[badCol];
        }
        continue;
      }
      throw err;
    }
  }
  return await postgrestRequest(table, 'POST', payload, config, preferHeader);
}

async function fetchTableWithFallback(
  table: string,
  orderBy: string,
  config?: SupabaseConfig
): Promise<any[] | null> {
  try {
    const rows = await postgrestRequest(`${table}?select=*&order=${orderBy}`, 'GET', undefined, config);
    if (Array.isArray(rows)) return rows;
  } catch {
    try {
      const rows = await postgrestRequest(`${table}?select=*`, 'GET', undefined, config);
      if (Array.isArray(rows)) return rows;
    } catch (err) {
      console.warn(`Could not fetch ${table} from Supabase`, err);
    }
  }
  return null;
}

/**
 * Fetch all products directly from Supabase Table Editor
 */
export async function fetchProductsFromSupabase(config?: SupabaseConfig): Promise<Product[] | null> {
  const rows = await fetchTableWithFallback('products', 'created_at.desc', config);
  return rows ? rows.map(rowToProduct) : null;
}

/**
 * Fetch all categories directly from Supabase Table Editor
 */
export async function fetchCategoriesFromSupabase(config?: SupabaseConfig): Promise<Category[] | null> {
  const rows = await fetchTableWithFallback('categories', 'created_at.asc', config);
  return rows ? rows.map(rowToCategory) : null;
}

/**
 * Fetch all banners directly from Supabase Table Editor
 */
export async function fetchBannersFromSupabase(config?: SupabaseConfig): Promise<Banner[] | null> {
  const rows = await fetchTableWithFallback('banners', 'created_at.asc', config);
  return rows ? rows.map(rowToBanner) : null;
}

/**
 * Fetch all orders directly from Supabase Table Editor
 */
export async function fetchOrdersFromSupabase(config?: SupabaseConfig): Promise<Order[] | null> {
  const rows = await fetchTableWithFallback('orders', 'created_at.desc', config);
  return rows ? rows.map(rowToOrder) : null;
}

/**
 * Upsert a Product into Supabase Table Editor
 */
export async function saveProductToSupabase(product: Product, config?: SupabaseConfig): Promise<boolean> {
  try {
    // Ensure referenced category exists in Supabase to satisfy any foreign key constraint (products_category_fkey)
    if (product.category) {
      await upsertResilient(
        'categories',
        {
          id: product.category,
          label: product.categoryLabel || product.category,
          slug: product.category,
          image_url: '',
          description: ''
        },
        config,
        'resolution=ignore-duplicates,return=representation'
      ).catch((e) => console.warn('Category pre-sync notice:', e));
    }

    const row = productToRow(product);
    await upsertResilient('products', row, config);
    return true;
  } catch (err) {
    console.error('Failed saving product to Supabase', err);
    return false;
  }
}

/**
 * Delete a Product from Supabase Table Editor
 */
export async function deleteProductFromSupabase(productId: string, config?: SupabaseConfig): Promise<boolean> {
  try {
    await postgrestRequest(`products?id=eq.${encodeURIComponent(productId)}`, 'DELETE', undefined, config);
    return true;
  } catch (err) {
    console.error('Failed deleting product from Supabase', err);
    return false;
  }
}

/**
 * Upsert a Category into Supabase Table Editor
 */
export async function saveCategoryToSupabase(category: Category, config?: SupabaseConfig): Promise<boolean> {
  try {
    const row = categoryToRow(category);
    await upsertResilient('categories', row, config);
    return true;
  } catch (err) {
    console.error('Failed saving category to Supabase', err);
    return false;
  }
}

/**
 * Delete a Category from Supabase Table Editor
 */
export async function deleteCategoryFromSupabase(categoryId: string, config?: SupabaseConfig): Promise<boolean> {
  try {
    await postgrestRequest(`categories?id=eq.${encodeURIComponent(categoryId)}`, 'DELETE', undefined, config);
    return true;
  } catch (err) {
    console.error('Failed deleting category from Supabase', err);
    return false;
  }
}

/**
 * Upsert a Banner into Supabase Table Editor
 */
export async function saveBannerToSupabase(banner: Banner, config?: SupabaseConfig): Promise<boolean> {
  try {
    const row = bannerToRow(banner);
    await upsertResilient('banners', row, config);
    return true;
  } catch (err) {
    console.error('Failed saving banner to Supabase', err);
    return false;
  }
}

/**
 * Delete a Banner from Supabase Table Editor
 */
export async function deleteBannerFromSupabase(bannerId: string, config?: SupabaseConfig): Promise<boolean> {
  try {
    await postgrestRequest(`banners?id=eq.${encodeURIComponent(bannerId)}`, 'DELETE', undefined, config);
    return true;
  } catch (err) {
    console.error('Failed deleting banner from Supabase', err);
    return false;
  }
}

/**
 * Upsert an Order into Supabase Table Editor
 */
export async function saveOrderToSupabase(order: Order, config?: SupabaseConfig): Promise<boolean> {
  try {
    const row = orderToRow(order);
    await upsertResilient('orders', row, config);
    return true;
  } catch (err) {
    console.error('Failed saving order to Supabase', err);
    return false;
  }
}

/**
 * Delete an Order from Supabase Table Editor
 */
export async function deleteOrderFromSupabase(orderId: string, config?: SupabaseConfig): Promise<boolean> {
  try {
    await postgrestRequest(`orders?id=eq.${encodeURIComponent(orderId)}`, 'DELETE', undefined, config);
    return true;
  } catch (err) {
    console.error('Failed deleting order from Supabase', err);
    return false;
  }
}

/**
 * Fetch all product reviews from public.product_reviews (returns null if table is not yet created)
 */
export async function fetchReviewsFromSupabase(config?: SupabaseConfig): Promise<ProductReview[] | null> {
  try {
    const cfg = config || getSupabaseConfig();
    if (!cfg.url || !cfg.anonKey) return null;
    const base = cleanSupabaseUrl(cfg.url);
    const res = await fetch(`${base}/rest/v1/product_reviews?select=*&order=created_at.desc`, {
      method: 'GET',
      headers: buildSupabaseHeaders(cfg.anonKey),
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows.map(rowToReview) : null;
  } catch {
    return null;
  }
}

/**
 * Dual-sync Review Save (Upserts into public.product_reviews if present AND updates products.reviews JSONB)
 */
export async function saveReviewToSupabase(
  review: ProductReview,
  updatedProduct: Product,
  config?: SupabaseConfig
): Promise<boolean> {
  const productSaved = await saveProductToSupabase(updatedProduct, config);

  // Also write to dedicated public.product_reviews table if the SQL table exists
  try {
    const row = reviewToRow(review, updatedProduct.id, updatedProduct.category);
    await upsertResilient('product_reviews', row, config);
  } catch {
    // Table may not be created yet; products.reviews JSONB already guarantees full persistence
  }

  return productSaved;
}

/**
 * Dual-sync Review Delete (Deletes from public.product_reviews AND updates products.reviews JSONB)
 */
export async function deleteReviewFromSupabase(
  reviewId: string,
  updatedProduct: Product,
  config?: SupabaseConfig
): Promise<boolean> {
  const productSaved = await saveProductToSupabase(updatedProduct, config);

  try {
    await postgrestRequest(`product_reviews?id=eq.${encodeURIComponent(reviewId)}`, 'DELETE', undefined, config);
  } catch {
    // Table may not be created yet; products.reviews JSONB already synced
  }

  return productSaved;
}

/**
 * 1-Click Master Batch Sync: Pushes all local categories, products, banners, orders to Supabase
 */
export async function batchSyncAllToSupabase(
  categories: Category[],
  products: Product[],
  banners: Banner[],
  orders: Order[],
  config?: SupabaseConfig
): Promise<{ success: boolean; message: string; details: { categories: number; products: number; banners: number; orders: number } }> {
  const cfg = config || getSupabaseConfig();
  if (!cfg.url || !cfg.anonKey) {
    return {
      success: false,
      message: 'Supabase URL or Anon key is missing. Please enter them above.',
      details: { categories: 0, products: 0, banners: 0, orders: 0 }
    };
  }

  try {
    // 1. Sync Categories first (including any category referenced by products)
    const categoryIds = new Set(categories.map((c) => c.id));
    const missingCategories: Category[] = [];
    for (const p of products) {
      if (p.category && !categoryIds.has(p.category)) {
        categoryIds.add(p.category);
        missingCategories.push({
          id: p.category,
          label: p.categoryLabel || p.category,
          slug: p.category,
          imageUrl: '',
          description: ''
        });
      }
    }
    const allCategoriesToSync = [...categories, ...missingCategories];
    if (allCategoriesToSync.length > 0) {
      const catRows = allCategoriesToSync.map(categoryToRow);
      await upsertResilient('categories', catRows, cfg);
    }

    // 2. Sync Banners
    if (banners.length > 0) {
      const bannerRows = banners.map(bannerToRow);
      await upsertResilient('banners', bannerRows, cfg);
    }

    // 3. Sync Products
    if (products.length > 0) {
      const prodRows = products.map(productToRow);
      await upsertResilient('products', prodRows, cfg);
    }

    // 4. Sync Orders if any
    if (orders.length > 0) {
      const orderRows = orders.map(orderToRow);
      await upsertResilient('orders', orderRows, cfg);
    }

    return {
      success: true,
      message: `Successfully synchronized to Supabase Table Editor! Rows updated: ${categories.length} Categories, ${products.length} Products, ${banners.length} Banners, ${orders.length} Orders.`,
      details: {
        categories: categories.length,
        products: products.length,
        banners: banners.length,
        orders: orders.length
      }
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Sync failed: ${err.message || 'Make sure the SQL Schema has been executed in Supabase SQL editor.'}`,
      details: { categories: 0, products: 0, banners: 0, orders: 0 }
    };
  }
}
