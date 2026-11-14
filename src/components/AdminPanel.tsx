import React, { useState } from 'react';
import { 
  Plus, Edit, Trash2, ArrowLeft, Image as ImageIcon, Package, 
  ShoppingBag, Check, X, RefreshCw, FolderTree, Database, 
  Copy, ExternalLink, ShieldCheck, CheckCircle2, AlertCircle, Zap, Upload, LogOut, User,
  Eye, EyeOff, KeyRound, Link2, Star, MessageSquare
} from 'lucide-react';
import { Product, Banner, Order, Category, SupabaseConfig, ProductColorVariant, ProductReview } from '../types';
import { ImageColorPicker } from './ImageColorPicker';
import { encodeMultiColorSingleLink, getSupabaseEncodedPayloadKb } from '../lib/multiColorCodec';
import { 
  SUPABASE_SQL_SCHEMA, 
  SUPABASE_REVIEWS_SQL,
  getSupabaseConfig, 
  saveSupabaseConfig, 
  clearSupabaseConfig,
  fetchServerSupabaseConfig,
  saveServerSupabaseConfig,
  clearServerSupabaseConfig,
  cleanSupabaseUrl,
  getLastSupabaseError,
  testSupabaseConnection,
  saveProductToSupabase,
  deleteProductFromSupabase,
  saveCategoryToSupabase,
  deleteCategoryFromSupabase,
  saveBannerToSupabase,
  deleteBannerFromSupabase,
  saveOrderToSupabase,
  deleteOrderFromSupabase,
  batchSyncAllToSupabase
} from '../lib/supabase';
import { compressImageFile, getImageSizeKb } from '../lib/imageCompressor';

interface AdminPanelProps {
  products: Product[];
  categories: Category[];
  banners: Banner[];
  orders: Order[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAddCategory: (category: Category) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onAddBanner: (banner: Banner) => void;
  onUpdateBanner: (banner: Banner) => void;
  onDeleteBanner: (bannerId: string) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onDeleteOrder: (orderId: string) => void;
  onSaveProductReview: (productId: string, review: ProductReview) => Promise<boolean>;
  onDeleteProductReview: (productId: string, reviewId: string) => Promise<boolean>;
  onResetToDemo: () => void;
  onRefreshFromSupabase?: () => void;
  onClose: () => void;
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products,
  categories,
  banners,
  orders,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddBanner,
  onUpdateBanner,
  onDeleteBanner,
  onUpdateOrderStatus,
  onDeleteOrder,
  onSaveProductReview,
  onDeleteProductReview,
  onResetToDemo,
  onRefreshFromSupabase,
  onClose,
  onLogout
}) => {
  const initialSupabaseCfg = getSupabaseConfig();
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'banners' | 'orders' | 'reviews' | 'supabase'>(
    initialSupabaseCfg.url && initialSupabaseCfg.anonKey ? 'products' : 'supabase'
  );
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Product Add/Edit Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState('');
  const [customClusters, setCustomClusters] = useState<string[]>(() => {
    const defaults = ['Varanasi', 'Surat', 'Chanderi', 'Kanchipuram', 'Jaipur', 'Bhagalpur', 'Lucknow', 'Maheshwar'];
    try {
      const saved = localStorage.getItem('marhaba_custom_clusters');
      const parsed = saved ? JSON.parse(saved) : [];
      const fromProducts = products.map((p) => p.artisanCluster).filter(Boolean);
      return Array.from(new Set([...defaults, ...(Array.isArray(parsed) ? parsed : []), ...fromProducts]));
    } catch {
      return defaults;
    }
  });
  const [isAddingCluster, setIsAddingCluster] = useState(false);
  const [newClusterInput, setNewClusterInput] = useState('');

  const handleAddCustomCluster = () => {
    const clean = newClusterInput.trim();
    if (!clean) return;
    setCustomClusters((prev) => {
      const next = prev.some((c) => c.toLowerCase() === clean.toLowerCase()) ? prev : [...prev, clean];
      try {
        localStorage.setItem('marhaba_custom_clusters', JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
    const matchedExisting = customClusters.find((c) => c.toLowerCase() === clean.toLowerCase()) || clean;
    setProductForm((prev) => ({
      ...prev,
      artisanCluster: matchedExisting,
      provenanceTag: `${matchedExisting.toUpperCase()} WEAVERS`
    }));
    setNewClusterInput('');
    setIsAddingCluster(false);
    showToast(`Weaving Cluster "${matchedExisting}" added & selected!`);
  };
  const [productForm, setProductForm] = useState({
    title: '',
    category: 'sarees',
    categoryLabel: 'Pure Silk Sarees',
    artisanCluster: 'Varanasi',
    provenanceTag: 'VARANASI WEAVERS',
    supplierName: 'Marhaba Master Loom Collective',
    color: 'Royal Burgundy',
    colorHex: '#6B1426',
    colorVariants: [] as ProductColorVariant[],
    price: 1299,
    originalPrice: 2999,
    discountPercent: 57,
    images: [] as string[],
    fabric: 'Handloom Katan Silk',
    weaveType: 'Kadwa Brocade Zari',
    blousePiece: 'Included (0.8m Unstitched)',
    dimensions: '6.3 meters with blouse',
    care: 'Dry Clean Only',
    description: 'Exclusive Marhaba Collection master-weaver creation with pure zari highlights.',
    freeDelivery: true,
    readyToShip: true,
    isPureSilk: true,
    isBridal: false,
    mTrusted: true
  });
  const [variantCompressingIdx, setVariantCompressingIdx] = useState<number | null>(null);

  // Category Add/Edit Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    label: '',
    slug: '',
    imageUrl: '',
    description: ''
  });

  // Banner Add/Edit Modal State
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    subtitle: '',
    badgeText: 'MARHABA FESTIVE DROP',
    ctaText: 'Shop Now',
    categoryLink: 'sarees',
    imageUrl: '',
    bgGradient: 'from-[#9F2089] via-[#80182E] to-[#4B0013]',
    active: true
  });

  // Supabase Configuration State
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(initialSupabaseCfg);
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [supabaseTesting, setSupabaseTesting] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<string | null>(null);
  const [testErrorMessage, setTestErrorMessage] = useState<string | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [categoryCompressing, setCategoryCompressing] = useState(false);
  const [bannerCompressing, setBannerCompressing] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  // Customer Reviews Manager State (Category -> Product -> Reviews)
  const [selectedReviewCategory, setSelectedReviewCategory] = useState<string>('all');
  const [selectedReviewProductId, setSelectedReviewProductId] = useState<string>(() => products[0]?.id || '');
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({
    userName: '',
    location: 'India',
    rating: 5,
    comment: '',
    verified: true,
    reviewImage: '',
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  });
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewImgCompressing, setReviewImgCompressing] = useState(false);
  const [showReviewsSqlBox, setShowReviewsSqlBox] = useState(false);
  const [copiedReviewsSql, setCopiedReviewsSql] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const getActiveCfg = (): SupabaseConfig => {
    if (supabaseConfig.url.trim() && supabaseConfig.anonKey.trim()) {
      const normalized: SupabaseConfig = {
        ...supabaseConfig,
        url: cleanSupabaseUrl(supabaseConfig.url),
        anonKey: supabaseConfig.anonKey.trim(),
        autoSync: true
      };
      saveSupabaseConfig(normalized);
      return normalized;
    }
    return getSupabaseConfig();
  };

  // Filtered Products for Admin
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
                          p.artisanCluster.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
                          p.provenanceTag.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
                          (p.color || '').toLowerCase().includes(searchProductQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // ==========================================
  // PRODUCT HANDLERS
  // ==========================================
  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setPendingImageUrl('');
    const extraVariants =
      p.colorVariants && p.colorVariants.length > 1
        ? p.colorVariants.slice(1).map((v) => ({ ...v }))
        : [];
    const extraUrls = new Set(extraVariants.map((v) => v.image));
    const primaryImages =
      p.images.length > 0
        ? p.images.filter((img, idx) => idx === 0 || !extraUrls.has(img))
        : [];

    setProductForm({
      title: p.title,
      category: p.category,
      categoryLabel: p.categoryLabel,
      artisanCluster: p.artisanCluster,
      provenanceTag: p.provenanceTag,
      supplierName: p.supplierName || 'Marhaba Certified Supplier',
      color: p.colorVariants?.[0]?.colorName || p.color || 'Royal Burgundy',
      colorHex: p.colorVariants?.[0]?.colorHex || p.colorHex || '#6B1426',
      colorVariants: extraVariants,
      price: p.price,
      originalPrice: p.originalPrice,
      discountPercent: p.discountPercent,
      images: primaryImages,
      fabric: p.fabric,
      weaveType: p.weaveType,
      blousePiece: p.blousePiece,
      dimensions: p.dimensions,
      care: p.care,
      description: p.description,
      freeDelivery: p.freeDelivery,
      readyToShip: p.readyToShip,
      isPureSilk: p.isPureSilk,
      isBridal: p.isBridal,
      mTrusted: p.mTrusted ?? true
    });
    setIsProductModalOpen(true);
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setPendingImageUrl('');
    setProductForm({
      title: '',
      category: categories[1]?.id || 'sarees',
      categoryLabel: categories[1]?.label || 'Pure Silk Sarees',
      artisanCluster: 'Varanasi',
      provenanceTag: 'VARANASI WEAVERS',
      supplierName: 'Marhaba Direct Loom Collective',
      color: 'Royal Burgundy',
      colorHex: '#6B1426',
      colorVariants: [],
      price: 1299,
      originalPrice: 2999,
      discountPercent: 57,
      images: [],
      fabric: 'Handloom Pure Silk Blend',
      weaveType: 'Kadwa Brocade Zari',
      blousePiece: 'Included (0.8m Unstitched)',
      dimensions: '6.3 meters with blouse',
      care: 'Dry Clean Only',
      description: 'Exclusive Marhaba Collection design crafted with generational loom precision.',
      freeDelivery: true,
      readyToShip: true,
      isPureSilk: true,
      isBridal: false,
      mTrusted: true
    });
    setIsProductModalOpen(true);
  };

  const handleAddColorVariantRow = (colorName = 'White', colorHex = '#FFFFFF') => {
    setProductForm((prev) => ({
      ...prev,
      colorVariants: [...prev.colorVariants, { colorName, colorHex, image: '' }]
    }));
  };

  const handleUpdateColorVariantRow = (idx: number, patch: Partial<ProductColorVariant>) => {
    setProductForm((prev) => ({
      ...prev,
      colorVariants: prev.colorVariants.map((v, i) => (i === idx ? { ...v, ...patch } : v))
    }));
  };

  const handleRemoveColorVariantRow = (idx: number) => {
    setProductForm((prev) => ({
      ...prev,
      colorVariants: prev.colorVariants.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const calculatedDiscount = Math.round(
      ((productForm.originalPrice - productForm.price) / productForm.originalPrice) * 100
    );

    const targetCategory = categories.find((c) => c.id === productForm.category);
    const categoryLabel = targetCategory ? targetCategory.label : productForm.categoryLabel;

    const trimmedPending = pendingImageUrl.trim();
    const basePrimaryImages =
      trimmedPending && !productForm.images.includes(trimmedPending)
        ? [...productForm.images, trimmedPending]
        : productForm.images;

    const cleanExtraVariants: ProductColorVariant[] = productForm.colorVariants
      .map((v) => ({
        colorName: (v.colorName || 'Color').trim(),
        colorHex: v.colorHex || '#6B1426',
        image: (v.image || '').trim()
      }))
      .filter((v) => v.image.length > 0);

    const primaryImage = basePrimaryImages[0] || cleanExtraVariants[0]?.image || '';
    const allColorVariants: ProductColorVariant[] = [];
    if (cleanExtraVariants.length > 0) {
      if (basePrimaryImages[0]) {
        allColorVariants.push({
          colorName: productForm.color || 'Default',
          colorHex: productForm.colorHex || '#6B1426',
          image: basePrimaryImages[0]
        });
      }
      allColorVariants.push(...cleanExtraVariants);
    } else if (primaryImage) {
      allColorVariants.push({
        colorName: productForm.color || 'Default',
        colorHex: productForm.colorHex || '#6B1426',
        image: primaryImage
      });
    }

    const finalImages = Array.from(
      new Set([...basePrimaryImages, ...cleanExtraVariants.map((v) => v.image)].filter(Boolean))
    );

    const singleEncodedPreview = encodeMultiColorSingleLink(
      allColorVariants,
      finalImages,
      productForm.color,
      productForm.colorHex
    );
    const savedKb = getSupabaseEncodedPayloadKb(singleEncodedPreview);
    const colorCountLabel =
      allColorVariants.length > 1
        ? `${allColorVariants.length} Colors in 1 Link · ${savedKb} KB`
        : `1 Link · ${savedKb} KB`;

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        title: productForm.title,
        category: productForm.category,
        categoryLabel,
        artisanCluster: productForm.artisanCluster,
        provenanceTag: productForm.provenanceTag,
        supplierName: productForm.supplierName,
        color: productForm.color,
        colorHex: productForm.colorHex,
        colorVariants: allColorVariants.length > 0 ? allColorVariants : undefined,
        price: Number(productForm.price),
        originalPrice: Number(productForm.originalPrice),
        discountPercent: calculatedDiscount > 0 ? calculatedDiscount : productForm.discountPercent,
        images: finalImages,
        fabric: productForm.fabric,
        weaveType: productForm.weaveType,
        blousePiece: productForm.blousePiece,
        dimensions: productForm.dimensions,
        care: productForm.care,
        description: productForm.description,
        freeDelivery: productForm.freeDelivery,
        readyToShip: productForm.readyToShip,
        isPureSilk: productForm.isPureSilk,
        isBridal: productForm.isBridal,
        mTrusted: productForm.mTrusted
      };
      onUpdateProduct(updated);
      const cfg = getActiveCfg();
      if (cfg.url && cfg.anonKey) {
        saveProductToSupabase(updated, cfg).then((ok) => {
          const errDetail = getLastSupabaseError();
          showToast(
            ok
              ? `Product updated in Supabase (${colorCountLabel})!`
              : `Updated locally, Supabase error: ${errDetail || 'Sync failed'}`,
            ok ? 'success' : 'error'
          );
        });
      } else {
        showToast(`Product updated locally (${colorCountLabel})!`, 'info');
      }
    } else {
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        title: productForm.title,
        category: productForm.category,
        categoryLabel,
        artisanCluster: productForm.artisanCluster,
        artisanName: `${productForm.artisanCluster} Master Weavers`,
        provenanceTag: productForm.provenanceTag,
        supplierName: productForm.supplierName,
        color: productForm.color,
        colorHex: productForm.colorHex,
        colorVariants: allColorVariants.length > 0 ? allColorVariants : undefined,
        price: Number(productForm.price),
        originalPrice: Number(productForm.originalPrice),
        discountPercent: calculatedDiscount > 0 ? calculatedDiscount : 50,
        rating: 4.8,
        reviewCount: 142,
        images: finalImages,
        fabric: productForm.fabric,
        weaveType: productForm.weaveType,
        blousePiece: productForm.blousePiece,
        dimensions: productForm.dimensions,
        care: productForm.care,
        dispatchTime: 'Dispatches in 24 hours',
        freeDelivery: productForm.freeDelivery,
        readyToShip: productForm.readyToShip,
        isPureSilk: productForm.isPureSilk,
        isBridal: productForm.isBridal,
        featured: true,
        availableSizes: ['Free Size (Unstitched)'],
        description: productForm.description,
        mTrusted: productForm.mTrusted,
        reviews: []
      };
      onAddProduct(newProd);
      const cfg = getActiveCfg();
      if (cfg.url && cfg.anonKey) {
        saveProductToSupabase(newProd, cfg).then((ok) => {
          const errDetail = getLastSupabaseError();
          showToast(
            ok
              ? `New product saved to Supabase (${colorCountLabel})!`
              : `Added locally, Supabase error: ${errDetail || 'Save failed'}`,
            ok ? 'success' : 'error'
          );
        });
      } else {
        showToast(`Product added locally (${colorCountLabel})!`, 'info');
      }
    }
    setPendingImageUrl('');
    setIsProductModalOpen(false);
  };

  const handleDeleteProductWithSync = (productId: string) => {
    onDeleteProduct(productId);
    const cfg = getActiveCfg();
    if (cfg.url && cfg.anonKey) {
      deleteProductFromSupabase(productId, cfg).then((ok) => {
        const errDetail = getLastSupabaseError();
        showToast(
          ok ? 'Product deleted from store & Supabase!' : `Deleted locally, Supabase error: ${errDetail || 'Delete failed'}`,
          ok ? 'success' : 'error'
        );
      });
    } else {
      showToast('Product deleted from store.');
    }
  };

  // ==========================================
  // CATEGORY HANDLERS
  // ==========================================
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      label: '',
      slug: '',
      imageUrl: '',
      description: ''
    });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({
      label: cat.label,
      slug: cat.slug,
      imageUrl: cat.imageUrl || '',
      description: cat.description || ''
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = (categoryForm.slug || categoryForm.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();

    if (editingCategory) {
      const updated: Category = {
        ...editingCategory,
        label: categoryForm.label,
        slug,
        imageUrl: categoryForm.imageUrl.trim(),
        description: categoryForm.description
      };
      onUpdateCategory(updated);
      const cfg = getActiveCfg();
      if (cfg.url && cfg.anonKey) {
        saveCategoryToSupabase(updated, cfg).then((ok) => {
          const errDetail = getLastSupabaseError();
          showToast(
            ok ? 'Category updated in Supabase!' : `Updated locally, Supabase error: ${errDetail || 'Sync failed'}`,
            ok ? 'success' : 'error'
          );
        });
      } else {
        showToast('Category updated locally!');
      }
    } else {
      const newCat: Category = {
        id: slug || `cat-${Date.now()}`,
        label: categoryForm.label,
        slug,
        imageUrl: categoryForm.imageUrl.trim(),
        description: categoryForm.description,
        itemCount: 0
      };
      onAddCategory(newCat);
      const cfg = getActiveCfg();
      if (cfg.url && cfg.anonKey) {
        saveCategoryToSupabase(newCat, cfg).then((ok) => {
          const errDetail = getLastSupabaseError();
          showToast(
            ok ? 'Category saved to Supabase!' : `Added locally, Supabase error: ${errDetail || 'Save failed'}`,
            ok ? 'success' : 'error'
          );
        });
      } else {
        showToast('Category added locally!');
      }
    }
    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategoryWithSync = (categoryId: string) => {
    onDeleteCategory(categoryId);
    const cfg = getActiveCfg();
    if (cfg.url && cfg.anonKey) {
      deleteCategoryFromSupabase(categoryId, cfg).then((ok) => {
        const errDetail = getLastSupabaseError();
        showToast(
          ok ? 'Category deleted from store & Supabase!' : `Deleted locally, Supabase error: ${errDetail || 'Delete failed'}`,
          ok ? 'success' : 'error'
        );
      });
    } else {
      showToast('Category deleted from store.');
    }
  };

  // ==========================================
  // BANNER HANDLERS
  // ==========================================
  const handleOpenAddBanner = () => {
    setEditingBanner(null);
    setBannerForm({
      title: '',
      subtitle: '',
      badgeText: 'MARHABA EXCLUSIVE',
      ctaText: 'Shop Now',
      categoryLink: categories[1]?.id || 'sarees',
      imageUrl: '',
      bgGradient: 'from-[#9F2089] via-[#80182E] to-[#4B0013]',
      active: true
    });
    setIsBannerModalOpen(true);
  };

  const handleOpenEditBanner = (b: Banner) => {
    setEditingBanner(b);
    setBannerForm({
      title: b.title,
      subtitle: b.subtitle,
      badgeText: b.badgeText,
      ctaText: b.ctaText,
      categoryLink: b.categoryLink,
      imageUrl: b.imageUrl,
      bgGradient: b.bgGradient,
      active: b.active
    });
    setIsBannerModalOpen(true);
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBannerUrl = bannerForm.imageUrl.trim();
    if (!cleanBannerUrl) {
      showToast('Please upload a banner image or paste an image URL.', 'error');
      return;
    }
    if (editingBanner) {
      const updated = { ...editingBanner, ...bannerForm, imageUrl: cleanBannerUrl };
      onUpdateBanner(updated);
      const cfg = getActiveCfg();
      if (cfg.url && cfg.anonKey) {
        saveBannerToSupabase(updated, cfg).then((ok) => {
          const errDetail = getLastSupabaseError();
          showToast(
            ok ? 'Banner updated in Supabase!' : `Updated locally, Supabase error: ${errDetail || 'Sync failed'}`,
            ok ? 'success' : 'error'
          );
        });
      } else {
        showToast('Banner updated locally!');
      }
    } else {
      const newBanner = { id: `banner-${Date.now()}`, ...bannerForm, imageUrl: cleanBannerUrl };
      onAddBanner(newBanner);
      const cfg = getActiveCfg();
      if (cfg.url && cfg.anonKey) {
        saveBannerToSupabase(newBanner, cfg).then((ok) => {
          const errDetail = getLastSupabaseError();
          showToast(
            ok ? 'Banner saved to Supabase!' : `Added locally, Supabase error: ${errDetail || 'Save failed'}`,
            ok ? 'success' : 'error'
          );
        });
      } else {
        showToast('Banner added locally!');
      }
    }
    setIsBannerModalOpen(false);
  };

  const handleDeleteBannerWithSync = (bannerId: string) => {
    onDeleteBanner(bannerId);
    const cfg = getActiveCfg();
    if (cfg.url && cfg.anonKey) {
      deleteBannerFromSupabase(bannerId, cfg).then((ok) => {
        const errDetail = getLastSupabaseError();
        showToast(
          ok ? 'Banner deleted from store & Supabase!' : `Deleted locally, Supabase error: ${errDetail || 'Delete failed'}`,
          ok ? 'success' : 'error'
        );
      });
    } else {
      showToast('Banner deleted from store.');
    }
  };

  const handleDeleteOrderWithSync = (orderId: string) => {
    setPendingConfirm({
      title: `Delete Order #${orderId}?`,
      message: `Order #${orderId} ko permanently delete karein? Yeh store aur Supabase Table Editor dono se delete ho jayega.`,
      confirmLabel: 'Yes, Delete Order',
      onConfirm: () => {
        onDeleteOrder(orderId);
        const cfg = getActiveCfg();
        if (cfg.url && cfg.anonKey) {
          deleteOrderFromSupabase(orderId, cfg).then((ok) => {
            showToast(
              ok ? `Order #${orderId} Supabase se delete ho gaya!` : `Deleted locally, Supabase delete failed.`,
              ok ? 'success' : 'error'
            );
          });
        } else {
          showToast(`Order #${orderId} delete kar diya gaya.`);
        }
      }
    });
  };

  // ==========================================
  // SUPABASE CONNECT & TEST & MASTER SYNC
  // ==========================================
  React.useEffect(() => {
    if (supabaseConfig.url.trim() && supabaseConfig.anonKey.trim()) {
      fetchServerSupabaseConfig().then((serverCfg) => {
        if (!serverCfg) {
          saveServerSupabaseConfig(supabaseConfig.url, supabaseConfig.anonKey);
        }
      });
    }
  }, []);

  const handleSaveSupabaseOnly = async () => {
    const trimmedUrl = cleanSupabaseUrl(supabaseConfig.url);
    const trimmedKey = supabaseConfig.anonKey.trim();
    if (!trimmedUrl || !trimmedKey) {
      showToast('Please enter both Supabase URL and Anon Key.', 'error');
      return;
    }
    const updated: SupabaseConfig = {
      ...supabaseConfig,
      url: trimmedUrl,
      anonKey: trimmedKey,
      isConnected: true,
      autoSync: true,
      lastSyncedAt: new Date().toISOString()
    };
    setSupabaseConfig(updated);
    saveSupabaseConfig(updated);
    await saveServerSupabaseConfig(trimmedUrl, trimmedKey);
    setSupabaseTestResult(null);
    setTestErrorMessage(null);
    showToast('Supabase URL & Anon Key saved for all devices! Syncing live data...');
    if (onRefreshFromSupabase) {
      onRefreshFromSupabase();
    }
    window.dispatchEvent(new Event('marhaba-supabase-config-updated'));
  };

  const handleTestSupabase = async () => {
    const trimmedUrl = cleanSupabaseUrl(supabaseConfig.url);
    const trimmedKey = supabaseConfig.anonKey.trim();
    if (!trimmedUrl || !trimmedKey) {
      showToast('Please enter both Supabase URL and Anon Key.', 'error');
      return;
    }
    setSupabaseTesting(true);
    setSupabaseTestResult(null);
    setTestErrorMessage(null);

    const res = await testSupabaseConnection(trimmedUrl, trimmedKey);
    setSupabaseTesting(false);

    // Always persist the trimmed URL & Key in localStorage AND on the server so every browser/mobile sees it
    const savedCfg: SupabaseConfig = {
      ...supabaseConfig,
      url: trimmedUrl,
      anonKey: trimmedKey,
      isConnected: res.success,
      autoSync: true,
      lastSyncedAt: res.success ? new Date().toISOString() : supabaseConfig.lastSyncedAt
    };
    setSupabaseConfig(savedCfg);
    saveSupabaseConfig(savedCfg);
    await saveServerSupabaseConfig(trimmedUrl, trimmedKey);
    window.dispatchEvent(new Event('marhaba-supabase-config-updated'));

    if (res.success) {
      setSupabaseTestResult('success');
      showToast('Connected & Saved for all browsers & mobile! Table Editor is ready.');
      if (onRefreshFromSupabase) {
        onRefreshFromSupabase();
      }
    } else {
      setSupabaseTestResult('error');
      setTestErrorMessage(res.message);
      showToast('URL & Key saved, lekin Supabase check mein error aaya — neeche message dekhein.', 'error');
    }
  };

  const handleClearSupabase = async () => {
    clearSupabaseConfig();
    await clearServerSupabaseConfig();
    const emptyCfg: SupabaseConfig = { url: '', anonKey: '', isConnected: false, autoSync: true };
    setSupabaseConfig(emptyCfg);
    setSupabaseTestResult(null);
    setTestErrorMessage(null);
    setSyncResult(null);
    showToast('Supabase credentials cleared.', 'info');
    window.dispatchEvent(new Event('marhaba-supabase-config-updated'));
  };

  const handleSyncAllToSupabase = async () => {
    const cfg = getActiveCfg();
    if (cfg.url && cfg.anonKey) {
      await saveServerSupabaseConfig(cfg.url, cfg.anonKey);
    }
    setSyncingAll(true);
    setSyncResult(null);
    const res = await batchSyncAllToSupabase(categories, products, banners, orders, cfg);
    setSyncingAll(false);
    setSyncResult(res);
    if (res.success) {
      const connectedCfg: SupabaseConfig = { ...cfg, isConnected: true, lastSyncedAt: new Date().toISOString() };
      setSupabaseConfig(connectedCfg);
      saveSupabaseConfig(connectedCfg);
      showToast('Synchronized all data to Supabase Table Editor!');
    }
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    showToast('SQL Schema copied to clipboard!');
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  const handleCopyReviewsSql = () => {
    navigator.clipboard.writeText(SUPABASE_REVIEWS_SQL);
    setCopiedReviewsSql(true);
    showToast('Reviews SQL copied to clipboard!');
    setTimeout(() => setCopiedReviewsSql(false), 2500);
  };

  const totalReviewsCount = products.reduce(
    (sum, p) => sum + (Array.isArray(p.reviews) ? p.reviews.length : 0),
    0
  );

  const reviewCategoryProducts = products.filter(
    (p) => selectedReviewCategory === 'all' || p.category === selectedReviewCategory
  );

  const activeReviewProduct =
    reviewCategoryProducts.find((p) => p.id === selectedReviewProductId) ||
    reviewCategoryProducts[0] ||
    null;

  const openAddReviewForm = () => {
    setEditingReviewId(null);
    setReviewForm({
      userName: '',
      location: 'Kishanganj, Bihar',
      rating: 5,
      comment: '',
      verified: true,
      reviewImage: '',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    });
    setIsReviewFormOpen(true);
  };

  const openEditReviewForm = (rev: ProductReview) => {
    setEditingReviewId(rev.id);
    setReviewForm({
      userName: rev.userName,
      location: rev.location || 'India',
      rating: rev.rating,
      comment: rev.comment,
      verified: rev.verified !== false,
      reviewImage: rev.reviewImage || '',
      date: rev.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    });
    setIsReviewFormOpen(true);
  };

  const handleAdminSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReviewProduct) return;
    const cleanName = reviewForm.userName.trim();
    const cleanComment = reviewForm.comment.trim();
    if (!cleanName || !cleanComment) return;

    setReviewSaving(true);
    const reviewPayload: ProductReview = {
      id: editingReviewId || `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      productId: activeReviewProduct.id,
      categoryId: activeReviewProduct.category,
      userName: cleanName,
      location: reviewForm.location.trim() || 'India',
      rating: Math.min(5, Math.max(1, Math.round(reviewForm.rating))),
      comment: cleanComment,
      verified: reviewForm.verified,
      date: reviewForm.date.trim() || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      reviewImage: reviewForm.reviewImage.trim() || undefined
    };

    const synced = await onSaveProductReview(activeReviewProduct.id, reviewPayload);
    setReviewSaving(false);
    setIsReviewFormOpen(false);
    setEditingReviewId(null);
    showToast(
      synced
        ? editingReviewId
          ? 'Review updated & synced to Supabase!'
          : 'New customer review added & synced to Supabase!'
        : 'Review saved locally! Connect Supabase or run Reviews SQL for cloud sync.',
      synced ? 'success' : 'info'
    );
  };

  const handleReviewImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReviewImgCompressing(true);
    try {
      const compressed = await compressImageFile(file, 450, 450, 0.6, 12);
      setReviewForm((prev) => ({ ...prev, reviewImage: compressed.dataUrl }));
      showToast(`Review photo compressed (${compressed.sizeKb.toFixed(1)} KB)`);
    } catch {
      showToast('Photo compress nahi ho paya, URL paste karein.', 'error');
    } finally {
      setReviewImgCompressing(false);
      e.target.value = '';
    }
  };

  const totalRevenue = orders.reduce((sum, o) => sum + o.pricing.finalTotal, 0);

  return (
    <div className="min-h-screen bg-[#F4F4F6] text-[#222222] overflow-x-hidden w-full">
      {/* Floating Realtime Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-3 left-3 sm:left-auto sm:right-4 z-50 bg-[#1E1E2E] text-white px-3.5 py-2.5 rounded-lg shadow-2xl border border-white/20 flex items-center gap-2 text-xs font-semibold animate-fadeIn">
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span className="truncate sm:whitespace-normal">{toastMessage.text}</span>
        </div>
      )}

      {/* Admin Top Header */}
      <header className="sticky top-0 z-40 bg-[#9F2089] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <button
              onClick={onClose}
              className="rounded-full hover:bg-white/20 transition-colors flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-white/15 px-2 py-1 sm:px-3 sm:py-1.5 shrink-0 cursor-pointer"
              title="Back to Storefront Preview"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">Back</span>
              <span className="hidden sm:inline">Back to Storefront</span>
            </button>

            <div className="min-w-0 flex items-center gap-1.5">
              <span className="font-editorial text-sm sm:text-2xl font-bold tracking-tight text-white truncate">
                Marhaba Collection
              </span>
              <span className="bg-[#FECE57] text-[#4B0013] text-[8px] sm:text-[10px] font-black px-1 sm:px-1.5 py-0.5 rounded uppercase shrink-0">
                <span className="sm:hidden">Admin</span>
                <span className="hidden sm:inline">Admin &amp; Inventory Suite</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <span className="hidden lg:inline-flex items-center gap-1.5 bg-black/20 text-[#FECE57] text-[11px] px-3 py-1 rounded-full font-mono font-bold border border-white/10">
              <User className="w-3.5 h-3.5 text-[#FECE57]" />
              <span>Owner: RAHBAR786</span>
            </span>

            <button
              onClick={() => setActiveTab('supabase')}
              className="flex items-center gap-1 text-[10px] sm:text-xs bg-white/15 hover:bg-white/25 px-2 py-1 sm:px-3 sm:py-1.5 rounded font-bold transition-colors border border-white/20 shrink-0 cursor-pointer"
              title="Enter or edit Supabase URL & Anon Key"
            >
              <Database className="w-3.5 h-3.5 text-[#3ECF8E]" />
              <span className="hidden sm:inline">
                {supabaseConfig.url && supabaseConfig.anonKey ? 'Supabase' : 'Connect Supabase'}
              </span>
            </button>

            {onRefreshFromSupabase && (
              <button
                onClick={() => {
                  onRefreshFromSupabase();
                  showToast('Refreshed live store data from Supabase!');
                }}
                className="hidden lg:flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded font-medium transition-colors"
                title="Reload latest data from Supabase"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Supabase</span>
              </button>
            )}

            <button
              onClick={() => {
                setPendingConfirm({
                  title: 'Clear Local Store Data?',
                  message: 'Sabhi products aur banners local store se hata diye jayenge.',
                  confirmLabel: 'Clear Store',
                  onConfirm: () => {
                    onResetToDemo();
                    showToast('Storefront cleared! Ready for fresh uploads.');
                  }
                });
              }}
              className="hidden lg:flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded font-medium transition-colors"
              title="Clear all local products & banners"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Store</span>
            </button>

            <button
              onClick={onClose}
              className="px-2 py-1 sm:px-3.5 sm:py-1.5 bg-white text-[#9F2089] font-bold text-[10px] sm:text-xs rounded shadow-xs hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            >
              <span className="sm:hidden">Store</span>
              <span className="hidden sm:inline">Live Store</span>
            </button>

            <button
              onClick={onLogout}
              className="px-2 py-1 sm:px-3 sm:py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] sm:text-xs rounded shadow-xs flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
              title="Logout from Admin Panel"
            >
              <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Admin KPI Ribbon */}
        <div className="bg-[#80182E] text-white/90 text-[10px] sm:text-xs px-2.5 sm:px-6 py-1.5 sm:py-2 border-t border-white/10">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-6">
              <div>
                <span className="text-white/65">Products:</span>{' '}
                <strong className="text-white">{products.length}</strong>
              </div>
              <div>
                <span className="text-white/65">Categories:</span>{' '}
                <strong className="text-white">{categories.length}</strong>
              </div>
              <div>
                <span className="text-white/65">Banners:</span>{' '}
                <strong className="text-white">{banners.length}</strong>
              </div>
              <div>
                <span className="text-white/65">UPI:</span>{' '}
                <strong className="text-[#FECE57] font-mono">9334808340</strong>
              </div>
              <div>
                <span className="text-white/65">Orders:</span>{' '}
                <strong className="text-white">{orders.length}</strong>{' '}
                <span className="text-white/80">(₹{totalRevenue.toLocaleString('en-IN')})</span>
              </div>
            </div>
            <div className="text-[11px] text-white/70 italic hidden md:block">
              Photoshop Eyedropper &amp; Drag-Drop Uploader active
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-[#E8E8E8] text-[#222222]">
          <div className="max-w-7xl mx-auto px-2.5 sm:px-6 flex gap-2 sm:gap-5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-2.5 sm:py-3 px-1.5 sm:px-2 text-[11px] sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
                activeTab === 'products'
                  ? 'border-[#9F2089] text-[#9F2089]'
                  : 'border-transparent text-[#666666] hover:text-[#222222]'
              }`}
            >
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Products ({products.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`py-2.5 sm:py-3 px-1.5 sm:px-2 text-[11px] sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
                activeTab === 'categories'
                  ? 'border-[#9F2089] text-[#9F2089]'
                  : 'border-transparent text-[#666666] hover:text-[#222222]'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Categories ({categories.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('banners')}
              className={`py-2.5 sm:py-3 px-1.5 sm:px-2 text-[11px] sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
                activeTab === 'banners'
                  ? 'border-[#9F2089] text-[#9F2089]'
                  : 'border-transparent text-[#666666] hover:text-[#222222]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Banners ({banners.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`py-2.5 sm:py-3 px-1.5 sm:px-2 text-[11px] sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
                activeTab === 'orders'
                  ? 'border-[#9F2089] text-[#9F2089]'
                  : 'border-transparent text-[#666666] hover:text-[#222222]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Orders ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-2.5 sm:py-3 px-1.5 sm:px-2 text-[11px] sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
                activeTab === 'reviews'
                  ? 'border-[#9F2089] text-[#9F2089]'
                  : 'border-transparent text-[#666666] hover:text-[#222222]'
              }`}
            >
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
              <span>Reviews ({totalReviewsCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('supabase')}
              className={`py-2.5 sm:py-3 px-1.5 sm:px-2 text-[11px] sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
                activeTab === 'supabase'
                  ? 'border-[#9F2089] text-[#9F2089]'
                  : 'border-transparent text-[#666666] hover:text-[#222222]'
              }`}
            >
              <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C59B27]" />
              <span>Supabase SQL</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Body */}
      <main className="max-w-7xl mx-auto px-2.5 sm:px-6 py-4 sm:py-6">
        {/* Quick 2-Column Supabase URL & Anon Key Bar on other tabs when not yet configured */}
        {activeTab !== 'supabase' && (!supabaseConfig.url || !supabaseConfig.anonKey) && (
          <div className="mb-5 bg-white p-4 rounded-lg border-2 border-[#3ECF8E] shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#3ECF8E]" />
                <h3 className="font-bold text-xs sm:text-sm text-[#222222]">
                  Supabase URL &amp; Anon Key Enter Karein (Live Cloud Sync)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('supabase')}
                className="text-[11px] font-bold text-[#9F2089] hover:underline"
              >
                Full Setup &amp; SQL Schema →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#222222] mb-1">
                  Column 1: Supabase Project URL
                </label>
                <input
                  type="url"
                  value={supabaseConfig.url}
                  onChange={(e) => setSupabaseConfig({ ...supabaseConfig, url: e.target.value })}
                  placeholder="https://your-project-ref.supabase.co"
                  className="w-full px-3 py-2 text-xs border border-[#CCCCCC] rounded focus:border-[#3ECF8E] focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#222222] mb-1">
                  Column 2: Supabase Anon Key
                </label>
                <div className="relative">
                  <input
                    type={showAnonKey ? 'text' : 'password'}
                    value={supabaseConfig.anonKey}
                    onChange={(e) => setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value })}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full pl-3 pr-9 py-2 text-xs border border-[#CCCCCC] rounded focus:border-[#3ECF8E] focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAnonKey(!showAnonKey)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#666666] hover:text-[#222222]"
                    title={showAnonKey ? 'Hide Anon Key' : 'Show Anon Key'}
                  >
                    {showAnonKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={supabaseTesting || !supabaseConfig.url.trim() || !supabaseConfig.anonKey.trim()}
                className="px-4 py-1.5 bg-[#3ECF8E] hover:bg-[#2EB875] text-[#111C2D] font-bold text-xs rounded transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {supabaseTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Test &amp; Save Connection</span>
              </button>
              <button
                type="button"
                onClick={handleSaveSupabaseOnly}
                disabled={!supabaseConfig.url.trim() || !supabaseConfig.anonKey.trim()}
                className="px-3.5 py-1.5 bg-[#9F2089] hover:bg-[#80182E] text-white font-bold text-xs rounded transition-colors disabled:opacity-50 cursor-pointer"
              >
                Save Keys
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: PRODUCTS (with Dropzone & Photoshop Eyedropper)       */}
        {/* ============================================================ */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="bg-white p-3 sm:p-4 rounded-lg border border-[#E8E8E8] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shadow-xs">
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <input
                  type="text"
                  placeholder="Search product, color, cluster..."
                  value={searchProductQuery}
                  onChange={(e) => setSearchProductQuery(e.target.value)}
                  className="flex-1 min-w-0 sm:max-w-sm px-2.5 sm:px-3 py-2 text-xs border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                />

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-2 sm:px-3 py-2 text-xs border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none cursor-pointer bg-white max-w-[125px] sm:max-w-none shrink-0"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleOpenAddProduct}
                className="px-4 py-2 bg-[#9F2089] hover:bg-[#80182E] text-white text-xs font-bold rounded shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Product</span>
              </button>
            </div>

            <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] text-[#554243] font-bold border-b border-[#E8E8E8] uppercase tracking-wider text-[10px] sm:text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-4">Product</th>
                      <th className="hidden sm:table-cell py-3 px-4">Category</th>
                      <th className="hidden md:table-cell py-3 px-4">Color</th>
                      <th className="hidden sm:table-cell py-3 px-4">Price / MRP</th>
                      <th className="hidden md:table-cell py-3 px-4">Discount</th>
                      <th className="hidden lg:table-cell py-3 px-4">Provenance / Supplier</th>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFEAE2]">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 sm:py-3 sm:px-4">
                          <div className="flex items-center gap-2.5 sm:gap-3">
                            {p.images[0] ? (
                              <img
                                src={p.images[0]}
                                alt={p.title}
                                className="w-11 h-13 sm:w-12 sm:h-14 object-cover rounded border border-[#E8E8E8] shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-11 h-13 sm:w-12 sm:h-14 rounded border border-[#E8E8E8] bg-[#FAF8F5] flex items-center justify-center shrink-0">
                                <Package className="w-5 h-5 text-[#CCCCCC]" />
                              </div>
                            )}
                            <div className="min-w-0 max-w-[180px] xs:max-w-[220px] sm:max-w-xs">
                              <div className="font-bold text-[#222222] truncate text-xs">{p.title}</div>
                              <div className="text-[10px] sm:text-[11px] text-[#666666] truncate mt-0.5">
                                {p.colorVariants && p.colorVariants.length > 1 ? `${p.colorVariants.length} Colors (1 Link)` : `${p.images.length} Image`} ·{' '}
                                <span className="font-mono text-[#038D63] font-semibold">
                                  {getSupabaseEncodedPayloadKb(
                                    encodeMultiColorSingleLink(p.colorVariants, p.images, p.color, p.colorHex)
                                  )} KB
                                </span>
                              </div>
                              <div className="sm:hidden flex items-center gap-2 mt-0.5 text-[11px]">
                                <span className="font-extrabold text-[#222222]">₹{p.price.toLocaleString('en-IN')}</span>
                                <span className="text-[10px] text-[#888888] line-through">₹{p.originalPrice.toLocaleString('en-IN')}</span>
                                <span className="text-[10px] font-bold text-[#9F2089]">{p.discountPercent}% OFF</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="hidden sm:table-cell py-3 px-4">
                          <span className="px-2 py-0.5 bg-[#FAF8F5] text-[#80182E] border border-[#EFEAE2] rounded text-[11px] font-semibold">
                            {p.categoryLabel || p.category}
                          </span>
                        </td>

                        <td className="hidden md:table-cell py-3 px-4">
                          {p.colorVariants && p.colorVariants.length > 1 ? (
                            <div className="space-y-1">
                              <div className="flex items-center -space-x-1">
                                {p.colorVariants.slice(0, 5).map((v, i) => (
                                  <span
                                    key={i}
                                    title={v.colorName}
                                    className="w-4 h-4 rounded-full border-2 border-white shadow-2xs"
                                    style={{ backgroundColor: v.colorHex || '#6B1426' }}
                                  />
                                ))}
                              </div>
                              <div className="text-[10px] font-bold text-[#9F2089]">
                                {p.colorVariants.length} Colors · 1 Link
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                                style={{ backgroundColor: p.colorHex || '#6B1426' }}
                              />
                              <span className="text-xs font-medium text-[#333333]">{p.color || 'Multi'}</span>
                            </div>
                          )}
                        </td>

                        <td className="hidden sm:table-cell py-3 px-4">
                          <div className="font-extrabold text-[#222222] text-sm tabular-nums">
                            ₹{p.price.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-[#887173] line-through tabular-nums">
                            ₹{p.originalPrice.toLocaleString('en-IN')}
                          </div>
                        </td>

                        <td className="hidden md:table-cell py-3 px-4">
                          <span className="px-1.5 py-0.5 bg-[#9F2089]/10 text-[#9F2089] rounded font-bold text-xs">
                            {p.discountPercent}% OFF
                          </span>
                        </td>

                        <td className="hidden lg:table-cell py-3 px-4">
                          <div className="font-semibold text-[#C59B27] text-[11px] uppercase">
                            {p.provenanceTag}
                          </div>
                          <div className="text-[10px] text-[#666666]">
                            {p.supplierName || p.artisanCluster}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditProduct(p)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit product"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setPendingConfirm({
                                  title: 'Delete Product?',
                                  message: `Kya aap "${p.title}" ko permanently delete karna chahte hain?`,
                                  confirmLabel: 'Yes, Delete',
                                  onConfirm: () => handleDeleteProductWithSync(p.id)
                                });
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Delete product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredProducts.length === 0 && (
                <div className="p-8 text-center text-[#666666]">
                  No products found. Click "Add New Product" to create one!
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: CATEGORIES (Add, Edit, Delete with Dropzone)           */}
        {/* ============================================================ */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-[#E8E8E8] flex items-center justify-between shadow-xs">
              <div>
                <h3 className="font-bold text-sm text-[#222222]">Category Management</h3>
                <p className="text-xs text-[#666666]">
                  Add custom categories with images. They appear dynamically in the store navigation and filter rails!
                </p>
              </div>

              <button
                onClick={handleOpenAddCategory}
                className="px-4 py-2 bg-[#9F2089] hover:bg-[#80182E] text-white text-xs font-bold rounded shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((cat) => {
                const count = products.filter((p) => p.category === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="bg-white border border-[#E8E8E8] rounded-lg p-3.5 shadow-xs flex flex-col justify-between hover:border-[#9F2089] transition-all"
                  >
                    <div className="space-y-2">
                      <div className="aspect-[4/3] rounded-md overflow-hidden bg-slate-100 border border-[#E8E8E8] flex items-center justify-center">
                        {cat.imageUrl ? (
                          <img
                            src={cat.imageUrl}
                            alt={cat.label}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="text-center text-[#999999] p-3">
                            <FolderTree className="w-7 h-7 mx-auto mb-1 opacity-60" />
                            <span className="text-[10px] font-medium">No Image Uploaded</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-[#222222]">{cat.label}</h4>
                          <span className="text-[10px] font-mono text-[#888888]">Slug: {cat.slug || cat.id}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-[#FAF8F5] text-[#9F2089] font-bold text-xs rounded border border-[#E8E8E8]">
                          {count} SKUs
                        </span>
                      </div>

                      {cat.description && (
                        <p className="text-[11px] text-[#666666] line-clamp-2">
                          {cat.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 mt-2 border-t border-[#E8E8E8] flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEditCategory(cat)}
                        className="px-2.5 py-1 text-xs font-semibold bg-white border border-[#CCCCCC] rounded hover:border-[#9F2089] text-[#222222] flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3 text-blue-600" />
                        <span>Edit</span>
                      </button>

                      {cat.id !== 'all' && (
                        <button
                          onClick={() => {
                            setPendingConfirm({
                              title: 'Delete Category?',
                              message: `Kya aap category "${cat.label}" ko delete karna chahte hain?`,
                              confirmLabel: 'Yes, Delete',
                              onConfirm: () => handleDeleteCategoryWithSync(cat.id)
                            });
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-white border border-red-200 text-red-600 rounded hover:bg-red-50 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: BANNERS                                               */}
        {/* ============================================================ */}
        {activeTab === 'banners' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-[#E8E8E8] flex items-center justify-between shadow-xs">
              <div>
                <h3 className="font-bold text-sm text-[#222222]">Hero Promo Banners</h3>
                <p className="text-xs text-[#666666]">
                  Control banners displayed on the Marhaba Collection homepage carousel.
                </p>
              </div>

              <button
                onClick={handleOpenAddBanner}
                className="px-4 py-2 bg-[#9F2089] hover:bg-[#80182E] text-white text-xs font-bold rounded shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Banner</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {banners.map((b) => (
                <div
                  key={b.id}
                  className="bg-white border border-[#E8E8E8] rounded-lg overflow-hidden shadow-xs flex flex-col justify-between"
                >
                  <div className="relative aspect-[16/6] bg-slate-100 overflow-hidden">
                    <img
                      src={b.imageUrl}
                      alt={b.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-center p-4 text-white">
                      <span className="text-[10px] bg-[#FECE57] text-[#4B0013] font-black px-2 py-0.5 rounded w-fit mb-1">
                        {b.badgeText}
                      </span>
                      <h4 className="font-editorial text-lg font-bold leading-tight">{b.title}</h4>
                      <p className="text-xs text-white/90 line-clamp-1 mt-0.5">{b.subtitle}</p>
                      <div className="mt-2 text-xs font-bold text-[#FECE57] underline">
                        {b.ctaText} →
                      </div>
                    </div>

                    <div className="absolute top-2 right-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-xs ${
                          b.active ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'
                        }`}
                      >
                        {b.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#FAF8F5] border-t border-[#E8E8E8] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#888888]">Category: </span>
                      <strong className="text-[#222222] capitalize">{b.categoryLink}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditBanner(b)}
                        className="px-2.5 py-1 text-xs font-semibold bg-white border border-[#CCCCCC] rounded hover:border-[#9F2089] text-[#222222] flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5 text-blue-600" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => {
                          setPendingConfirm({
                            title: 'Delete Banner?',
                            message: `Kya aap banner "${b.title}" ko delete karna chahte hain?`,
                            confirmLabel: 'Yes, Delete',
                            onConfirm: () => handleDeleteBannerWithSync(b.id)
                          });
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-white border border-red-200 text-red-600 rounded hover:bg-red-50 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: ORDERS (with UPI Phone 9334808340 and UTR Tracking)   */}
        {/* ============================================================ */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-[#E8E8E8] shadow-xs flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#222222]">Customer Orders & UPI Payments</h3>
                <p className="text-xs text-[#666666]">
                  Live feed of customer orders with address, PhonePe/UPI verification on phone number <strong className="text-[#9F2089]">9334808340</strong>, and UTR transaction numbers.
                </p>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-lg border border-[#E8E8E8] text-[#666666]">
                <ShoppingBag className="w-12 h-12 text-[#CCCCCC] mx-auto mb-2" />
                <h4 className="font-bold text-sm text-[#222222]">No orders placed yet</h4>
                <p className="text-xs mt-1">Place a test order in the storefront to verify the checkout flow.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="bg-white rounded-lg border border-[#E8E8E8] p-4 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E8E8E8] gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm text-[#222222]">Order #{o.id}</strong>
                          <span className="text-xs text-[#888888]">
                            · {new Date(o.createdAt).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="text-xs text-[#666666] mt-0.5">
                          Recipient: <strong>{o.shippingAddress.fullName}</strong> ({o.shippingAddress.phone}) · {o.shippingAddress.addressLine}, {o.shippingAddress.city}, {o.shippingAddress.state} - {o.shippingAddress.pincode}
                        </div>
                        {o.utrNumber && (
                          <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>UPI UTR / Reference: <strong>{o.utrNumber}</strong> (Paid to 9334808340)</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-[#9F2089]">
                            ₹{o.pricing.finalTotal.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-[#775A00] uppercase font-bold">
                            Payment: {o.paymentMethod.toUpperCase()}
                          </div>
                        </div>

                        {/* Status dropdown */}
                        <select
                          value={o.status}
                          onChange={(e) =>
                            onUpdateOrderStatus(o.id, e.target.value as Order['status'])
                          }
                          className="px-2.5 py-1.5 text-xs font-bold border rounded bg-[#FAF8F5] border-[#CCCCCC] focus:border-[#9F2089]"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="artisan_packing">Packed / Loom Packing</option>
                          <option value="loom_inspection">Quality Inspected</option>
                          <option value="dispatched">Shipped / Dispatched</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                        </select>

                        {/* Delete Order Button */}
                        <button
                          onClick={() => handleDeleteOrderWithSync(o.id)}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Delete Order Permanently from Store & Supabase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Delete Order</span>
                        </button>
                      </div>
                    </div>

                    {/* Order items */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {o.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2.5 p-2 bg-[#FAF8F5] rounded border border-[#EFEAE2] text-xs"
                        >
                          {item.product.images[0] ? (
                            <img
                              src={item.product.images[0]}
                              alt={item.product.title}
                              className="w-10 h-12 object-cover rounded border border-[#E8E8E8]"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-12 rounded border border-[#E8E8E8] bg-white flex items-center justify-center shrink-0">
                              <ShoppingBag className="w-4 h-4 text-[#CCCCCC]" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-[#222222] truncate">{item.product.title}</div>
                            <div className="text-[10px] text-[#666666]">
                              Qty: {item.quantity} · Size: {item.selectedSize}
                            </div>
                            <div className="text-xs font-extrabold text-[#80182E] tabular-nums">
                              ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: SUPABASE CLOUD SYNC & FULL SQL SCHEMA SETUP           */}
        {/* ============================================================ */}
        {activeTab === 'supabase' && (
          <div className="space-y-5">
            {/* Supabase Connection Setup Card */}
            <div className="bg-white p-5 rounded-lg border border-[#E8E8E8] shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-[#3ECF8E]" />
                    <h3 className="font-bold text-base text-[#222222]">
                      Supabase Cloud Database & Storage Optimization
                    </h3>
                  </div>
                  <p className="text-xs text-[#666666] mt-1 max-w-2xl leading-relaxed">
                    Marhaba Collection automatically stores data in your browser immediately, and also provides 1-click sync with your Supabase database. To preserve your free 2GB Supabase tier limit, images are stored via lightweight URL pointers in the database!
                  </p>
                </div>

                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-[#FAF8F5] border border-[#CCCCCC] hover:border-[#3ECF8E] text-[#222222] text-xs font-semibold rounded flex items-center gap-1 shrink-0"
                >
                  <span>Open Supabase Dashboard</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* API Credentials Input Form (Two Columns: Supabase URL & Anon Key) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#E8E8E8]">
                <div className="bg-[#FAF8F5] p-3.5 rounded-lg border border-[#E8E8E8]">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-[#222222] mb-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[#3ECF8E]" />
                    <span>Column 1: Supabase Project URL *</span>
                  </label>
                  <input
                    type="url"
                    value={supabaseConfig.url}
                    onChange={(e) => setSupabaseConfig({ ...supabaseConfig, url: e.target.value })}
                    placeholder="https://your-project-ref.supabase.co"
                    className="w-full px-3 py-2.5 text-xs bg-white border border-[#CCCCCC] rounded focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E] focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-[#777777] mt-1 block">
                    Supabase Dashboard ➔ Project Settings ➔ Data API / API ➔ Project URL
                  </span>
                </div>

                <div className="bg-[#FAF8F5] p-3.5 rounded-lg border border-[#E8E8E8]">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-[#222222] mb-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#9F2089]" />
                    <span>Column 2: Supabase Anon Public Key *</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAnonKey ? 'text' : 'password'}
                      value={supabaseConfig.anonKey}
                      onChange={(e) => setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value })}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full pl-3 pr-10 py-2.5 text-xs bg-white border border-[#CCCCCC] rounded focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E] focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAnonKey(!showAnonKey)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#666666] hover:text-[#222222] cursor-pointer"
                      title={showAnonKey ? 'Hide Anon Key' : 'Show Anon Key'}
                    >
                      {showAnonKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-[#777777] mt-1 block">
                    Supabase Dashboard ➔ Project Settings ➔ API Keys ➔ anon public key
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleTestSupabase}
                    disabled={supabaseTesting || !supabaseConfig.url.trim() || !supabaseConfig.anonKey.trim()}
                    className="px-4 py-2 bg-[#3ECF8E] hover:bg-[#2EB875] text-[#111C2D] font-bold text-xs rounded transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    {supabaseTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Test &amp; Save Supabase Connection</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSupabaseOnly}
                    disabled={!supabaseConfig.url.trim() || !supabaseConfig.anonKey.trim()}
                    className="px-4 py-2 bg-[#111C2D] hover:bg-[#222222] text-white font-bold text-xs rounded transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-[#3ECF8E]" />
                    <span>Save URL &amp; Key</span>
                  </button>

                  <button
                    onClick={handleSyncAllToSupabase}
                    disabled={syncingAll || !supabaseConfig.url.trim() || !supabaseConfig.anonKey.trim()}
                    className="px-4 py-2 bg-[#9F2089] hover:bg-[#80182E] text-white font-bold text-xs rounded transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    {syncingAll ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-[#FECE57]" />}
                    <span>1-Click Sync All Store Data to Supabase Table Editor</span>
                  </button>

                  {(supabaseConfig.url || supabaseConfig.anonKey) && (
                    <button
                      type="button"
                      onClick={handleClearSupabase}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs rounded transition-colors flex items-center gap-1 cursor-pointer"
                      title="Clear saved Supabase URL and Anon Key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Keys</span>
                    </button>
                  )}

                  {supabaseConfig.url && supabaseConfig.anonKey && (
                    <button
                      type="button"
                      onClick={() => {
                        const shareUrl = `${window.location.origin}/?sb_url=${encodeURIComponent(supabaseConfig.url.trim())}&sb_key=${encodeURIComponent(supabaseConfig.anonKey.trim())}`;
                        navigator.clipboard?.writeText(shareUrl);
                        setCopiedShareLink(true);
                        setTimeout(() => setCopiedShareLink(false), 3000);
                      }}
                      className="px-4 py-2 bg-white border border-[#9F2089] text-[#9F2089] hover:bg-[#FDE5F4] font-bold text-xs rounded transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedShareLink ? 'Customer Live-Sync Link Copied!' : 'Copy Customer Live-Sync Store Link'}</span>
                    </button>
                  )}
                </div>

                <span className="text-[11px] text-[#777777]">
                  Status: <strong className={supabaseConfig.isConnected ? 'text-emerald-700' : 'text-[#888888]'}>
                    {supabaseConfig.isConnected ? '● Connected & Live Sync Active' : '○ Offline / Local Persistence Active'}
                  </strong>
                </span>
              </div>

              <div className="p-3 bg-[#FAF8F5] border border-[#E8E8E8] rounded text-[11px] text-[#555555] leading-relaxed">
                <strong className="text-[#222222]">Cross-Device Live Sync:</strong> Customers using the installed Mobile App or browser automatically sync new products, banners, categories, and order updates every 10 seconds &amp; in real time. Share the <strong>Customer Live-Sync Store Link</strong> above (or configure <code>VITE_SUPABASE_URL</code> &amp; <code>VITE_SUPABASE_ANON_KEY</code> in deployment secrets) so every customer device connects automatically.
              </div>

              {/* Status and Diagnostic Results */}
              {supabaseTestResult === 'success' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <strong>Connected to Supabase!</strong> All tables (categories, products, banners, orders) are verified and accessible.
                  </div>
                </div>
              )}

              {supabaseTestResult === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Connection Error</span>
                  </div>
                  <p className="text-[11px] text-red-700 font-mono">
                    {testErrorMessage || 'Connection failed. Please run the SQL schema script below in Supabase SQL Editor.'}
                  </p>
                </div>
              )}

              {syncResult && (
                <div className={`p-3 rounded text-xs border ${
                  syncResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                } flex items-start gap-2`}>
                  {syncResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />}
                  <div>
                    <div className="font-bold">{syncResult.success ? 'Sync Successful!' : 'Sync Notice'}</div>
                    <div className="text-[11px] mt-0.5">{syncResult.message}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Storage Optimization & Low-KB Architecture Explanation */}
            <div className="bg-gradient-to-r from-[#FAF8F5] to-[#FDE5F4]/40 border border-[#E8E8E8] p-5 rounded-lg shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#9F2089]" />
                <h4 className="font-bold text-sm text-[#222222]">
                  Minimal KB Storage Architecture (Saves Supabase Free 2GB Quota)
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#555555]">
                <div className="p-3 bg-white rounded border border-[#E8E8E8] space-y-1">
                  <strong className="text-[#222222] block font-bold">⚡ Smart Canvas Compression</strong>
                  <p className="text-[11px] leading-relaxed">
                    When you drop or upload an image, it is automatically compressed down to ~25-45 KB on the fly using bicubic resampling and WebP/JPEG format.
                  </p>
                </div>
                <div className="p-3 bg-white rounded border border-[#E8E8E8] space-y-1">
                  <strong className="text-[#222222] block font-bold">🔗 Ultra-Low KB Web URLs</strong>
                  <p className="text-[11px] leading-relaxed">
                    Hosted web image URLs take only ~0.08 KB per row in PostgreSQL. Storing 1,000 products uses less than 1 MB of database space!
                  </p>
                </div>
                <div className="p-3 bg-white rounded border border-[#E8E8E8] space-y-1">
                  <strong className="text-[#222222] block font-bold">🛡️ Zero Storage Bucket Quota</strong>
                  <p className="text-[11px] leading-relaxed">
                    By storing lightweight URL arrays directly in PostgreSQL columns, your free 2GB Supabase object storage bucket remains 100% untouched and clean!
                  </p>
                </div>
              </div>
            </div>

            {/* Step-by-Step Instructions in Easy Hinglish */}
            <div className="bg-white p-5 rounded-lg border border-[#E8E8E8] shadow-xs space-y-3">
              <h4 className="font-bold text-sm text-[#222222] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#9F2089]" />
                <span>Supabase Table Editor Setup Guide (Sirf 1 Baar Karna Hai)</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-[#FAF8F5] rounded border border-[#E8E8E8] space-y-1">
                  <span className="w-5 h-5 rounded-full bg-[#9F2089] text-white flex items-center justify-center font-bold text-[10px]">1</span>
                  <strong className="text-[#222222] block font-bold">Copy SQL Schema</strong>
                  <p className="text-[11px] text-[#666666]">Neeche diye gaye purple button par click karein aur SQL copy karein.</p>
                </div>
                <div className="p-3 bg-[#FAF8F5] rounded border border-[#E8E8E8] space-y-1">
                  <span className="w-5 h-5 rounded-full bg-[#9F2089] text-white flex items-center justify-center font-bold text-[10px]">2</span>
                  <strong className="text-[#222222] block font-bold">Supabase SQL Editor</strong>
                  <p className="text-[11px] text-[#666666]">Supabase dashboard mein <strong>SQL Editor</strong> khol kar paste karein aur <strong>Run</strong> karein.</p>
                </div>
                <div className="p-3 bg-[#FAF8F5] rounded border border-[#E8E8E8] space-y-1">
                  <span className="w-5 h-5 rounded-full bg-[#9F2089] text-white flex items-center justify-center font-bold text-[10px]">3</span>
                  <strong className="text-[#222222] block font-bold">Check Table Editor</strong>
                  <p className="text-[11px] text-[#666666]">Left menu mein <strong>Table Editor</strong> kholiye, categories, products aur banners ka poora real data turant dikhega!</p>
                </div>
                <div className="p-3 bg-[#FAF8F5] rounded border border-[#E8E8E8] space-y-1">
                  <span className="w-5 h-5 rounded-full bg-[#9F2089] text-white flex items-center justify-center font-bold text-[10px]">4</span>
                  <strong className="text-[#222222] block font-bold">Realtime Live Save</strong>
                  <p className="text-[11px] text-[#666666]">Upar URL aur Anon Key daal kar Save karein, ab koi bhi product add/edit karenge toh Supabase Table Editor mein direct save hoga!</p>
                </div>
              </div>
            </div>

            {/* Complete SQL Schema Script for Supabase */}
            <div className="bg-white p-5 rounded-lg border border-[#E8E8E8] shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-[#222222]">
                    Complete Supabase SQL Script (With Real Seed Data & Permissive RLS)
                  </h4>
                  <p className="text-xs text-[#666666]">
                    Creates <code>categories</code>, <code>products</code>, <code>banners</code>, <code>orders</code> tables and populates them instantly in your Supabase Table Editor:
                  </p>
                </div>

                <button
                  onClick={handleCopySchema}
                  className="px-4 py-2 bg-[#9F2089] hover:bg-[#80182E] text-white font-bold text-xs rounded shadow-xs flex items-center gap-1.5 transition-all shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSchema ? 'SQL Copied to Clipboard!' : 'Copy SQL Schema'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-[#1E1E2E] text-[#CDD6F4] text-xs font-mono rounded-lg overflow-x-auto max-h-96 leading-relaxed selection:bg-[#9F2089]">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 6: CUSTOMER REVIEWS MANAGER (CATEGORY -> PRODUCT -> CRUD)*/}
        {/* ============================================================ */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {/* Header & Supabase SQL Toggle */}
            <div className="bg-white p-4 rounded-lg border border-[#E8E8E8] shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-[#9F2089]" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-[#222222]">
                      Customer Reviews Manager (Category-Wise)
                    </h2>
                    <p className="text-[11px] text-[#666666]">
                      Category select karein → Product chunein → Reviews Add, Edit ya Delete karein (Supabase live sync)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewsSqlBox((prev) => !prev)}
                    className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#FDE5F4] border border-[#9F2089]/30 text-[#9F2089] text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>{showReviewsSqlBox ? 'Hide Reviews SQL' : 'Supabase Reviews SQL'}</span>
                  </button>
                </div>
              </div>

              {showReviewsSqlBox && (
                <div className="pt-2 border-t border-[#E8E8E8] space-y-2 animate-fadeIn">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-[#555555]">
                      Supabase SQL Editor me ye SQL run karein taaki <code>public.product_reviews</code> table ban jaye:
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyReviewsSql}
                      className="px-3 py-1.5 bg-[#9F2089] hover:bg-[#80182E] text-white text-[11px] font-bold rounded flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedReviewsSql ? 'SQL Copied!' : 'Copy Reviews SQL'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-[#1E1E2E] text-[#CDD6F4] text-[11px] font-mono rounded-lg overflow-x-auto max-h-60 leading-relaxed">
                    {SUPABASE_REVIEWS_SQL}
                  </pre>
                </div>
              )}
            </div>

            {/* Step 1: Category Selector */}
            <div className="bg-white p-4 rounded-lg border border-[#E8E8E8] shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#555555]">
                  Step 1 · Select Category
                </h3>
                <span className="text-[11px] text-[#777777]">
                  Total Reviews: <strong className="text-[#9F2089]">{totalReviewsCount}</strong>
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReviewCategory('all');
                    setIsReviewFormOpen(false);
                    setEditingReviewId(null);
                    if (products[0]) setSelectedReviewProductId(products[0].id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    selectedReviewCategory === 'all'
                      ? 'bg-[#9F2089] text-white border-[#9F2089] shadow-xs'
                      : 'bg-[#FAF8F5] text-[#444444] border-[#E8E8E8] hover:border-[#9F2089]'
                  }`}
                >
                  All Categories ({products.length} products · {totalReviewsCount} reviews)
                </button>

                {categories
                  .filter((cat) => cat.id !== 'all')
                  .map((cat) => {
                    const catProducts = products.filter((p) => p.category === cat.id);
                    const catReviewCount = catProducts.reduce(
                      (sum, p) => sum + (Array.isArray(p.reviews) ? p.reviews.length : 0),
                      0
                    );
                    const isSelected = selectedReviewCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedReviewCategory(cat.id);
                          setIsReviewFormOpen(false);
                          setEditingReviewId(null);
                          if (catProducts[0]) {
                            setSelectedReviewProductId(catProducts[0].id);
                          } else {
                            setSelectedReviewProductId('');
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#9F2089] text-white border-[#9F2089] shadow-xs'
                            : 'bg-white text-[#333333] border-[#E8E8E8] hover:border-[#9F2089]'
                        }`}
                      >
                        {cat.imageUrl && (
                          <img
                            src={cat.imageUrl}
                            alt={cat.label}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        )}
                        <span>{cat.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-[#F4F4F6] text-[#666666]'
                          }`}
                        >
                          {catProducts.length} · ★{catReviewCount}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Step 2 & Step 3: Products inside Selected Category + Product Reviews CRUD */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Step 2: Product List inside Selected Category */}
              <div className="lg:col-span-5 bg-white rounded-lg border border-[#E8E8E8] shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-[#FAF8F5] border-b border-[#E8E8E8] flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#555555]">
                    Step 2 · Products in Category ({reviewCategoryProducts.length})
                  </h3>
                </div>

                {reviewCategoryProducts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#777777]">
                    Is category me abhi koi product nahi hai.
                  </div>
                ) : (
                  <div className="divide-y divide-[#F0F0F2] max-h-[460px] overflow-y-auto">
                    {reviewCategoryProducts.map((prod) => {
                      const prodReviews = Array.isArray(prod.reviews) ? prod.reviews : [];
                      const isActive = activeReviewProduct?.id === prod.id;
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => {
                            setSelectedReviewProductId(prod.id);
                            setIsReviewFormOpen(false);
                            setEditingReviewId(null);
                          }}
                          className={`w-full text-left p-3 flex items-center gap-3 transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-[#FDE5F4]/60 border-l-4 border-l-[#9F2089]'
                              : 'hover:bg-[#FAF8F5]'
                          }`}
                        >
                          <img
                            src={prod.images[0] || '/assets/aistudio/placeholder.jpg'}
                            alt={prod.title}
                            className="w-12 h-14 object-cover rounded border border-[#E8E8E8] shrink-0 bg-[#FAF8F5]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#222222] line-clamp-2 leading-snug">
                              {prod.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#038D63] text-white text-[10px] font-bold">
                                {(prod.rating || 4.8).toFixed(1)} ★
                              </span>
                              <span className="text-[11px] font-semibold text-[#666666]">
                                {prodReviews.length} {prodReviews.length === 1 ? 'Review' : 'Reviews'}
                              </span>
                              <span className="text-[10px] text-[#888888]">
                                ₹{prod.price.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Reviews for Selected Product */}
              <div className="lg:col-span-7 bg-white rounded-lg border border-[#E8E8E8] shadow-xs overflow-hidden">
                {!activeReviewProduct ? (
                  <div className="p-8 text-center text-xs text-[#777777]">
                    Reviews dekhne ya add karne ke liye left list se koi product chunein.
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {/* Selected Product Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8E8E8]">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={activeReviewProduct.images[0]}
                          alt={activeReviewProduct.title}
                          className="w-12 h-14 object-cover rounded border border-[#E8E8E8] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9F2089]">
                            {activeReviewProduct.categoryLabel || activeReviewProduct.category}
                          </div>
                          <h3 className="text-sm font-bold text-[#222222] truncate">
                            {activeReviewProduct.title}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-[#555555] mt-0.5">
                            <span className="font-bold text-[#038D63]">
                              {(activeReviewProduct.rating || 4.8).toFixed(1)} ★
                            </span>
                            <span>
                              ({(activeReviewProduct.reviews || []).length} customer reviews)
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={openAddReviewForm}
                        className="px-3.5 py-2 bg-[#9F2089] hover:bg-[#80182E] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Review</span>
                      </button>
                    </div>

                    {/* Add / Edit Review Form */}
                    {isReviewFormOpen && (
                      <form
                        onSubmit={handleAdminSaveReview}
                        className="p-4 bg-[#FAF8F5] border border-[#9F2089]/30 rounded-lg space-y-3 text-xs animate-fadeIn"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-[#222222]">
                            {editingReviewId ? 'Edit Customer Review' : 'Add New Customer Review'}
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setIsReviewFormOpen(false);
                              setEditingReviewId(null);
                            }}
                            className="text-[#666666] hover:text-[#222222] cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div>
                          <label className="block font-bold text-[#333333] mb-1">Star Rating *</label>
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewForm((prev) => ({ ...prev, rating: star }))}
                                className={`px-2.5 py-1.5 rounded border font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                                  reviewForm.rating >= star
                                    ? 'bg-amber-50 border-amber-400 text-amber-700'
                                    : 'bg-white border-[#DDDDDD] text-[#999999]'
                                }`}
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    reviewForm.rating >= star ? 'fill-amber-400 text-amber-500' : 'text-[#CCCCCC]'
                                  }`}
                                />
                                <span>{star}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block font-bold text-[#333333] mb-1">Customer Name *</label>
                            <input
                              type="text"
                              required
                              value={reviewForm.userName}
                              onChange={(e) => setReviewForm((prev) => ({ ...prev, userName: e.target.value }))}
                              placeholder="e.g. Ayesha Khan"
                              className="w-full px-2.5 py-2 border border-[#CCCCCC] rounded bg-white focus:border-[#9F2089] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-[#333333] mb-1">City / Location</label>
                            <input
                              type="text"
                              value={reviewForm.location}
                              onChange={(e) => setReviewForm((prev) => ({ ...prev, location: e.target.value }))}
                              placeholder="e.g. Kishanganj, Bihar"
                              className="w-full px-2.5 py-2 border border-[#CCCCCC] rounded bg-white focus:border-[#9F2089] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-[#333333] mb-1">Review Date</label>
                            <input
                              type="text"
                              value={reviewForm.date}
                              onChange={(e) => setReviewForm((prev) => ({ ...prev, date: e.target.value }))}
                              placeholder="14 Nov 2026"
                              className="w-full px-2.5 py-2 border border-[#CCCCCC] rounded bg-white focus:border-[#9F2089] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-[#333333] mb-1">Review Comment *</label>
                          <textarea
                            required
                            rows={3}
                            value={reviewForm.comment}
                            onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                            placeholder="Kapde ki quality, fitting aur delivery ke baare me likhein..."
                            className="w-full px-2.5 py-2 border border-[#CCCCCC] rounded bg-white focus:border-[#9F2089] focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
                          <div>
                            <label className="block font-bold text-[#333333] mb-1">
                              Review Photo URL (Optional)
                            </label>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={reviewForm.reviewImage}
                                onChange={(e) => setReviewForm((prev) => ({ ...prev, reviewImage: e.target.value }))}
                                placeholder="Paste photo URL or upload →"
                                className="flex-1 min-w-0 px-2.5 py-1.5 border border-[#CCCCCC] rounded bg-white focus:border-[#9F2089] focus:outline-none"
                              />
                              <label className="px-2.5 py-1.5 bg-white border border-[#9F2089] text-[#9F2089] font-bold rounded cursor-pointer hover:bg-[#FDE5F4] shrink-0 flex items-center gap-1">
                                <Upload className="w-3 h-3" />
                                <span>{reviewImgCompressing ? '...' : 'Photo'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleReviewImageFile}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>

                          <label className="flex items-center gap-2 pb-1.5 cursor-pointer font-semibold text-[#333333]">
                            <input
                              type="checkbox"
                              checked={reviewForm.verified}
                              onChange={(e) => setReviewForm((prev) => ({ ...prev, verified: e.target.checked }))}
                              className="w-4 h-4 accent-[#9F2089]"
                            />
                            <span>Verified Purchase Badge</span>
                          </label>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsReviewFormOpen(false);
                              setEditingReviewId(null);
                            }}
                            className="px-3.5 py-2 border border-[#CCCCCC] bg-white rounded font-bold text-[#444444] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={reviewSaving}
                            className="px-4 py-2 bg-[#9F2089] hover:bg-[#80182E] disabled:opacity-60 text-white rounded font-bold cursor-pointer"
                          >
                            {reviewSaving
                              ? 'Saving...'
                              : editingReviewId
                              ? 'Update Review'
                              : 'Save Review'}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Existing Reviews List */}
                    <div className="space-y-2.5">
                      {(activeReviewProduct.reviews || []).length === 0 ? (
                        <div className="p-6 text-center bg-[#FAF8F5] rounded-lg border border-dashed border-[#CCCCCC] text-xs text-[#777777]">
                          Is product par abhi tak koi customer review nahi hai. Upar <strong>+ Add Review</strong> click karke pehla review add karein!
                        </div>
                      ) : (
                        (activeReviewProduct.reviews || []).map((rev) => (
                          <div
                            key={rev.id}
                            className="p-3.5 border border-[#E8E8E8] rounded-lg bg-white hover:border-[#9F2089]/40 transition-colors space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 bg-[#038D63] text-white text-[11px] font-bold rounded inline-flex items-center gap-0.5">
                                  <span>{rev.rating}</span>
                                  <Star className="w-2.5 h-2.5 fill-white" />
                                </span>
                                <span className="text-xs font-bold text-[#222222]">{rev.userName}</span>
                                {rev.verified !== false && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    ✓ Verified
                                  </span>
                                )}
                                <span className="text-[11px] text-[#777777]">
                                  · {rev.location || 'India'} · {rev.date}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openEditReviewForm(rev)}
                                  className="px-2 py-1 text-[11px] font-bold text-[#9F2089] bg-[#FDE5F4] hover:bg-[#fbd0ea] rounded flex items-center gap-1 cursor-pointer"
                                  title="Edit Review"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPendingConfirm({
                                      title: 'Delete Customer Review?',
                                      message: `"${rev.userName}" ka ${rev.rating}★ review is product se permanently delete ho jayega.`,
                                      confirmLabel: 'Delete Review',
                                      onConfirm: async () => {
                                        const ok = await onDeleteProductReview(activeReviewProduct.id, rev.id);
                                        showToast(
                                          ok
                                            ? 'Review deleted & synced with Supabase!'
                                            : 'Review removed locally!',
                                          ok ? 'success' : 'info'
                                        );
                                      }
                                    });
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded flex items-center gap-1 cursor-pointer"
                                  title="Delete Review"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>

                            <p className="text-xs text-[#333333] leading-relaxed">{rev.comment}</p>

                            {rev.reviewImage && (
                              <img
                                src={rev.reviewImage}
                                alt="Customer review attachment"
                                className="w-16 h-16 object-cover rounded border border-[#E8E8E8]"
                              />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* PRODUCT ADD / EDIT MODAL (with Dropzone & Color Sampler)     */}
      {/* ============================================================ */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-fadeIn">
          <div
            className="bg-white rounded-lg shadow-2xl border border-[#E8E8E8] w-full max-w-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8] bg-[#9F2089] text-white">
              <h3 className="font-bold text-base">
                {editingProduct ? 'Edit Product in Marhaba Collection' : 'Add New Product to Marhaba Collection'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#222222] mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  placeholder="e.g. Royal Burgundy Kadwa Zari Pure Banarasi Katan Silk Saree"
                  className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#222222] mb-1">Category *</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none bg-white font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-[#222222]">Weaving Cluster *</label>
                    <button
                      type="button"
                      onClick={() => setIsAddingCluster((prev) => !prev)}
                      className="text-[10px] font-bold text-[#9F2089] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isAddingCluster ? 'Cancel' : 'Add Custom'}</span>
                    </button>
                  </div>

                  {isAddingCluster ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newClusterInput}
                        onChange={(e) => setNewClusterInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomCluster();
                          }
                        }}
                        placeholder="e.g. Kishanganj / Murshidabad"
                        className="flex-1 min-w-0 px-2.5 py-2 border border-[#9F2089] rounded focus:outline-none text-xs"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomCluster}
                        className="px-2.5 py-2 bg-[#9F2089] hover:bg-[#80182E] text-white font-bold rounded text-xs shrink-0 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <select
                      value={productForm.artisanCluster}
                      onChange={(e) => {
                        const cluster = e.target.value;
                        if (cluster === '__add_new__') {
                          setIsAddingCluster(true);
                          return;
                        }
                        const tagMap: Record<string, string> = {
                          Varanasi: 'VARANASI WEAVERS',
                          Surat: 'SURAT DIRECT',
                          Chanderi: 'CHANDERI CLUSTER',
                          Kanchipuram: 'KANCHIPURAM WEAVE',
                          Jaipur: 'JAIPUR BLOCKPRINT'
                        };
                        setProductForm({
                          ...productForm,
                          artisanCluster: cluster,
                          provenanceTag: tagMap[cluster] || `${cluster.toUpperCase()} WEAVERS`
                        });
                      }}
                      className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none bg-white font-medium"
                    >
                      {!customClusters.includes(productForm.artisanCluster) && productForm.artisanCluster && (
                        <option value={productForm.artisanCluster}>{productForm.artisanCluster}</option>
                      )}
                      {customClusters.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__add_new__">+ Add New Weaving Cluster...</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-[#222222] mb-1">Supplier / Loom Name *</label>
                  <input
                    type="text"
                    required
                    value={productForm.supplierName}
                    onChange={(e) => setProductForm({ ...productForm, supplierName: e.target.value })}
                    placeholder="e.g. Marhaba Direct Loom Hub"
                    className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                  />
                </div>
              </div>

              {/* 1. Drag & Drop Images & Photoshop Eyedropper Tool */}
              <div className="border border-[#E8E8E8] rounded-lg p-3.5 bg-white space-y-4">
                <ImageColorPicker
                  images={productForm.images}
                  onChangeImages={(newImages) => setProductForm({ ...productForm, images: newImages })}
                  selectedColor={productForm.color}
                  selectedHex={productForm.colorHex}
                  onChangeColor={(colorName, colorHex) =>
                    setProductForm({ ...productForm, color: colorName, colorHex })
                  }
                  allowMultiple={true}
                  onPendingUrlChange={setPendingImageUrl}
                />

                {/* 2. SAME PRODUCT MULTI-COLOR VARIANTS (ALL COLORS SAVED AS 1 SINGLE LINK IN SUPABASE) */}
                <div className="border-t border-[#EFEAE2] pt-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-[#222222] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#9F2089]" />
                        <span>Add More Colors of Same Product (e.g. Jubba: White, Red, Blue, Black)</span>
                      </div>
                      <p className="text-[10px] text-[#666666] mt-0.5">
                        Ek hi kapde ke sabhi color variants <strong>1 hi product</strong> aur Supabase mein{' '}
                        <strong className="text-[#038D63]">1 single link</strong> me save honge!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddColorVariantRow('White', '#FFFFFF')}
                      className="px-2.5 py-1.5 bg-[#9F2089] hover:bg-[#80182E] text-white font-bold text-[11px] rounded flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Color Variant</span>
                    </button>
                  </div>

                  {/* Quick 1-click preset color chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#666666] mr-1">Quick Add:</span>
                    {[
                      { name: 'White', hex: '#FFFFFF' },
                      { name: 'Red', hex: '#DC2626' },
                      { name: 'Royal Blue', hex: '#1D4ED8' },
                      { name: 'Black', hex: '#171717' },
                      { name: 'Emerald Green', hex: '#059669' },
                      { name: 'Maroon', hex: '#80182E' },
                      { name: 'Gold', hex: '#C59B27' },
                      { name: 'Sky Blue', hex: '#0284C7' }
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleAddColorVariantRow(preset.name, preset.hex)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#CCCCCC] hover:border-[#9F2089] bg-[#FAF8F5] text-[10px] font-semibold text-[#222222] cursor-pointer"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/20"
                          style={{ backgroundColor: preset.hex }}
                        />
                        <span>+ {preset.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Added Extra Color Variant Rows */}
                  {productForm.colorVariants.length > 0 && (
                    <div className="space-y-2">
                      {productForm.colorVariants.map((variant, idx) => {
                        const rowKb = variant.image ? getImageSizeKb(variant.image) : 0;
                        const isUrlImg = /^https?:\/\//i.test(variant.image);
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg border border-[#E8E8E8] bg-[#FAF8F5] flex flex-col sm:flex-row sm:items-center gap-2.5"
                          >
                            {/* Thumbnail */}
                            <div className="w-12 h-14 rounded border border-[#CCCCCC] bg-white overflow-hidden shrink-0 flex items-center justify-center">
                              {variant.image ? (
                                <img
                                  src={variant.image}
                                  alt={variant.colorName}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-[#AAAAAA]" />
                              )}
                            </div>

                            {/* Color Name + Picker + Image URL/Upload */}
                            <div className="flex-1 space-y-1.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={variant.colorHex || '#6B1426'}
                                  onChange={(e) =>
                                    handleUpdateColorVariantRow(idx, { colorHex: e.target.value.toUpperCase() })
                                  }
                                  className="w-6 h-6 rounded cursor-pointer border border-[#CCCCCC] p-0 bg-white shrink-0"
                                  title="Pick color hex"
                                />
                                <input
                                  type="text"
                                  value={variant.colorName}
                                  onChange={(e) => handleUpdateColorVariantRow(idx, { colorName: e.target.value })}
                                  placeholder="Color name (e.g. White, Red, Blue)"
                                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-[#CCCCCC] rounded bg-white font-semibold focus:border-[#9F2089] focus:outline-none"
                                />
                                {variant.image && (
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-[#038D63] border border-emerald-200 shrink-0">
                                    {rowKb} KB {isUrlImg ? '(URL)' : '(WebP)'}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveColorVariantRow(idx)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded shrink-0 cursor-pointer"
                                  title="Remove this color"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <input
                                  type="url"
                                  value={variant.image}
                                  onChange={(e) => handleUpdateColorVariantRow(idx, { image: e.target.value })}
                                  placeholder={`Paste ${variant.colorName || 'color'} image URL (~0.08 KB)`}
                                  className="flex-1 min-w-0 px-2 py-1 text-[11px] font-mono border border-[#CCCCCC] rounded bg-white focus:border-[#9F2089] focus:outline-none"
                                />
                                <label className="px-2.5 py-1 bg-white border border-[#9F2089] text-[#9F2089] hover:bg-[#FDE5F4] rounded text-[11px] font-bold cursor-pointer shrink-0 flex items-center gap-1">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      setVariantCompressingIdx(idx);
                                      try {
                                        const res = await compressImageFile(file, 700, 700, 0.65, 14);
                                        handleUpdateColorVariantRow(idx, { image: res.dataUrl });
                                        showToast(`${variant.colorName} photo compressed to ${res.sizeKb} KB!`);
                                      } catch (err) {
                                        console.error(err);
                                      } finally {
                                        setVariantCompressingIdx(null);
                                      }
                                    }}
                                  />
                                  {variantCompressingIdx === idx ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Upload className="w-3 h-3" />
                                  )}
                                  <span>{variantCompressingIdx === idx ? '...' : 'Upload'}</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Live Supabase Single-Link & Exact KB Summary */}
                  {(() => {
                    const livePrimary = productForm.images[0] || pendingImageUrl.trim();
                    const liveExtras = productForm.colorVariants.filter((v) => v.image.trim());
                    const liveVariants: ProductColorVariant[] =
                      liveExtras.length > 0
                        ? [
                            ...(livePrimary
                              ? [{ colorName: productForm.color, colorHex: productForm.colorHex, image: livePrimary }]
                              : []),
                            ...liveExtras
                          ]
                        : livePrimary
                          ? [{ colorName: productForm.color, colorHex: productForm.colorHex, image: livePrimary }]
                          : [];
                    const allImgs = Array.from(
                      new Set([
                        ...productForm.images,
                        ...(pendingImageUrl.trim() ? [pendingImageUrl.trim()] : []),
                        ...liveExtras.map((v) => v.image.trim())
                      ].filter(Boolean))
                    );
                    const encoded = encodeMultiColorSingleLink(
                      liveVariants,
                      allImgs,
                      productForm.color,
                      productForm.colorHex
                    );
                    const kb = getSupabaseEncodedPayloadKb(encoded);
                    if (encoded.length === 0) return null;
                    return (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-900">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Link2 className="w-3.5 h-3.5 text-[#038D63] shrink-0" />
                          <span>
                            Supabase Storage: <strong>1 Single Link</strong> ({liveVariants.length || 1} Color
                            {(liveVariants.length || 1) > 1 ? 's' : ''})
                          </span>
                        </div>
                        <span className="font-mono font-black text-[#038D63] bg-white px-2 py-0.5 rounded border border-emerald-200">
                          {kb} KB total
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#222222] mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#222222] mb-1">Original MRP (₹) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={productForm.originalPrice}
                    onChange={(e) => setProductForm({ ...productForm, originalPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#222222] mb-1">Fabric Details *</label>
                  <input
                    type="text"
                    required
                    value={productForm.fabric}
                    onChange={(e) => setProductForm({ ...productForm, fabric: e.target.value })}
                    placeholder="e.g. 100% Pure Katan Handloom Silk"
                    className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#222222] mb-1">Weave / Work *</label>
                  <input
                    type="text"
                    required
                    value={productForm.weaveType}
                    onChange={(e) => setProductForm({ ...productForm, weaveType: e.target.value })}
                    placeholder="e.g. Kadwa Brocade with Real Gold Zari"
                    className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Complete product information and artisan provenance..."
                  className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.freeDelivery}
                    onChange={(e) => setProductForm({ ...productForm, freeDelivery: e.target.checked })}
                    className="rounded text-[#9F2089] focus:ring-[#9F2089]"
                  />
                  <span className="font-medium text-[#222222]">Free Delivery Tag</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.mTrusted}
                    onChange={(e) => setProductForm({ ...productForm, mTrusted: e.target.checked })}
                    className="rounded text-[#9F2089] focus:ring-[#9F2089]"
                  />
                  <span className="font-medium text-[#222222]">Marhaba Trusted Badge</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.isPureSilk}
                    onChange={(e) => setProductForm({ ...productForm, isPureSilk: e.target.checked })}
                    className="rounded text-[#9F2089] focus:ring-[#9F2089]"
                  />
                  <span className="font-medium text-[#222222]">Silk Mark Certified</span>
                </label>
              </div>

              <div className="pt-3 border-t border-[#E8E8E8] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 border border-[#CCCCCC] rounded hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#9F2089] hover:bg-[#80182E] text-white font-bold rounded shadow-xs"
                >
                  {editingProduct ? 'Update Product' : 'Add to Marhaba Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CATEGORY ADD / EDIT MODAL                                    */}
      {/* ============================================================ */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-fadeIn">
          <div
            className="bg-white rounded-lg shadow-2xl border border-[#E8E8E8] w-full max-w-md overflow-hidden my-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8] bg-[#9F2089] text-white">
              <h3 className="font-bold text-base">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#222222] mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={categoryForm.label}
                  onChange={(e) => setCategoryForm({ ...categoryForm, label: e.target.value })}
                  placeholder="e.g. Pure Sarees, Bridal Lehengas"
                  className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-1">URL Identifier (Slug)</label>
                <input
                  type="text"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  placeholder="e.g. sarees, lehengas (auto-generated if empty)"
                  className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none font-mono"
                />
              </div>

              {/* Image Uploader & Dropzone for Category with Minimal KB Compression */}
              <div>
                <label className="block font-bold text-[#222222] mb-1 flex items-center justify-between">
                  <span>Category Cover Image</span>
                  <span className="text-[10px] text-[#9F2089] font-normal">
                    {categoryForm.imageUrl ? `${getImageSizeKb(categoryForm.imageUrl)} KB` : ''}
                  </span>
                </label>

                <div className="space-y-2">
                  <div className="relative aspect-[4/3] rounded-md overflow-hidden bg-slate-100 border border-[#CCCCCC] max-h-36 flex items-center justify-center group">
                    {categoryForm.imageUrl ? (
                      <>
                        <img
                          src={categoryForm.imageUrl}
                          alt="Category preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-1 left-1 bg-black/75 text-white text-[9px] font-mono px-1 py-0.5 rounded">
                          {categoryForm.imageUrl?.startsWith('data:') ? 'Compressed' : 'Web URL'} · {getImageSizeKb(categoryForm.imageUrl)} KB
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-[#999999] p-3">
                        <ImageIcon className="w-7 h-7 mx-auto mb-1 opacity-50" />
                        <span className="text-[11px]">No cover image selected</span>
                      </div>
                    )}
                  </div>

                  {/* Dropzone for Category Image */}
                  <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-[#CCCCCC] hover:border-[#9F2089] rounded-md bg-[#FAF8F5] cursor-pointer hover:bg-[#FDE5F4]/30 transition-all text-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCategoryCompressing(true);
                          try {
                            const res = await compressImageFile(file, 360, 360, 0.62, 10);
                            setCategoryForm({ ...categoryForm, imageUrl: res.dataUrl });
                            showToast(`Category image compressed to ${res.sizeKb} KB!`);
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setCategoryCompressing(false);
                          }
                        }
                      }}
                    />
                    {categoryCompressing ? (
                      <RefreshCw className="w-4 h-4 text-[#9F2089] animate-spin mb-1" />
                    ) : (
                      <Upload className="w-4 h-4 text-[#9F2089] mb-1" />
                    )}
                    <span className="text-[11px] font-bold text-[#9F2089]">
                      {categoryCompressing ? 'Compressing...' : 'Click to Drop/Upload Image (Auto-Compressed)'}
                    </span>
                    <span className="text-[9px] text-[#777777]">Saves in ultra-low KB (~5-10 KB) or URL (~0.08 KB) for Supabase</span>
                  </label>

                  <input
                    type="text"
                    value={categoryForm.imageUrl}
                    onChange={(e) => setCategoryForm({ ...categoryForm, imageUrl: e.target.value })}
                    placeholder="Or paste direct image URL"
                    className="w-full px-2.5 py-1.5 border border-[#CCCCCC] rounded focus:border-[#9F2089] text-[11px] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Brief summary of creations in this category..."
                  className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089]"
                />
              </div>

              <div className="pt-3 border-t border-[#E8E8E8] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 border border-[#CCCCCC] rounded hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#9F2089] hover:bg-[#80182E] text-white font-bold rounded shadow-xs"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BANNER ADD / EDIT MODAL                                      */}
      {/* ============================================================ */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-fadeIn">
          <div
            className="bg-white rounded-lg shadow-2xl border border-[#E8E8E8] w-full max-w-lg overflow-hidden my-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8] bg-[#9F2089] text-white">
              <h3 className="font-bold text-base">
                {editingBanner ? 'Edit Promo Banner' : 'Add New Promo Banner'}
              </h3>
              <button
                onClick={() => setIsBannerModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#222222] mb-1">Headline *</label>
                <input
                  type="text"
                  required
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  placeholder="e.g. Marhaba Grand Wedding & Festive Drop"
                  className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-1">Subtitle *</label>
                <input
                  type="text"
                  required
                  value={bannerForm.subtitle}
                  onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                  placeholder="e.g. Flat 70% Off On Royal Silk Sarees & Lehengas"
                  className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#222222] mb-1">Badge Tag *</label>
                  <input
                    type="text"
                    required
                    value={bannerForm.badgeText}
                    onChange={(e) => setBannerForm({ ...bannerForm, badgeText: e.target.value })}
                    className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#222222] mb-1">CTA Button Text *</label>
                  <input
                    type="text"
                    required
                    value={bannerForm.ctaText}
                    onChange={(e) => setBannerForm({ ...bannerForm, ctaText: e.target.value })}
                    className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089]"
                  />
                </div>
              </div>

              {/* Banner Image with Auto-Compression Dropzone */}
              <div>
                <label className="block font-bold text-[#222222] mb-1 flex items-center justify-between">
                  <span>Banner Image (Drop or URL) *</span>
                  <span className="text-[10px] text-[#9F2089]">
                    {bannerForm.imageUrl ? `${getImageSizeKb(bannerForm.imageUrl)} KB` : ''}
                  </span>
                </label>

                <div className="space-y-2">
                  <div className="relative aspect-[16/6] rounded-md overflow-hidden bg-slate-100 border border-[#CCCCCC] flex items-center justify-center">
                    {bannerForm.imageUrl ? (
                      <>
                        <img
                          src={bannerForm.imageUrl}
                          alt="Banner preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-1 left-1 bg-black/75 text-white text-[9px] font-mono px-1 py-0.5 rounded">
                          {bannerForm.imageUrl?.startsWith('data:') ? 'Compressed' : 'Web URL'} · {getImageSizeKb(bannerForm.imageUrl)} KB
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-[#999999] p-4">
                        <ImageIcon className="w-7 h-7 mx-auto mb-1 opacity-50" />
                        <span className="text-[11px]">Upload a banner image or paste URL below</span>
                      </div>
                    )}
                  </div>

                  <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-[#CCCCCC] hover:border-[#9F2089] rounded-md bg-[#FAF8F5] cursor-pointer hover:bg-[#FDE5F4]/30 transition-all text-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setBannerCompressing(true);
                          try {
                            const res = await compressImageFile(file, 960, 380, 0.64, 20);
                            setBannerForm({ ...bannerForm, imageUrl: res.dataUrl });
                            showToast(`Banner image compressed to ${res.sizeKb} KB!`);
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setBannerCompressing(false);
                          }
                        }
                      }}
                    />
                    {bannerCompressing ? (
                      <RefreshCw className="w-4 h-4 text-[#9F2089] animate-spin mb-1" />
                    ) : (
                      <Upload className="w-4 h-4 text-[#9F2089] mb-1" />
                    )}
                    <span className="text-[11px] font-bold text-[#9F2089]">
                      {bannerCompressing ? 'Compressing...' : 'Click to Drop/Upload Banner Image'}
                    </span>
                    <span className="text-[9px] text-[#777777]">Auto-compressed to ~12-20 KB (or ~0.08 KB URL) to save Supabase payload</span>
                  </label>

                  <input
                    type="text"
                    value={bannerForm.imageUrl}
                    onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
                    placeholder="Or paste direct banner image URL"
                    className="w-full px-2.5 py-1.5 border border-[#CCCCCC] rounded font-mono text-[11px] focus:border-[#9F2089]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E8E8E8] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="px-4 py-2 border border-[#CCCCCC] rounded hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#9F2089] hover:bg-[#80182E] text-white font-bold rounded shadow-xs"
                >
                  Save Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* IN-APP DELETE / ACTION CONFIRMATION MODAL                    */}
      {/* ============================================================ */}
      {pendingConfirm && (
        <div
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPendingConfirm(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-[#E8E8E8] max-w-sm w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#222222]">{pendingConfirm.title}</h4>
                <p className="text-xs text-[#666666] mt-1 leading-relaxed">{pendingConfirm.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E8E8]">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                className="px-4 py-2 text-xs font-semibold border border-[#CCCCCC] rounded hover:bg-slate-50 text-[#444444]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = pendingConfirm.onConfirm;
                  setPendingConfirm(null);
                  action();
                }}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded shadow-xs cursor-pointer"
              >
                {pendingConfirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
