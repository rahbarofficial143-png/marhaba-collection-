import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { FacetFilterBar } from './components/FacetFilterBar';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { ArtisanHubsModal } from './components/ArtisanHubsModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { WishlistDrawer } from './components/WishlistDrawer';
import { Footer } from './components/Footer';
import { AdminPanel } from './components/AdminPanel';
import { AdminLoginModal } from './components/AdminLoginModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CreateAccountModal } from './components/CreateAccountModal';
import { ProfileModal } from './components/ProfileModal';
import { PRODUCTS } from './data/products';
import { INITIAL_BANNERS } from './data/banners';
import { INITIAL_CATEGORIES } from './data/categories';
import { Product, Banner, Category, CartItem, FilterState, Order, UserProfile, ProductReview, PaymentAccount } from './types';
import { Sparkles, ShoppingBag } from 'lucide-react';
import { 
  getSupabaseConfig, 
  hasLocalSupabaseOverride,
  fetchServerSupabaseConfig,
  saveServerSupabaseConfig,
  fetchStorefrontDataFromServer,
  fetchCategoriesFromSupabase, 
  fetchProductsFromSupabase, 
  fetchBannersFromSupabase, 
  fetchOrdersFromSupabase, 
  saveOrderToSupabase,
  fetchReviewsFromSupabase,
  saveReviewToSupabase,
  deleteReviewFromSupabase,
  mergeRemoteReviewsIntoProducts,
  calculateProductRatingSummary,
  fetchUsersFromSupabase,
  saveUserToSupabase,
  deleteUserFromSupabase,
  loginWithSecretCode,
  fetchAdminProfileRecord,
  saveAdminProfileRecord,
  fetchPaymentAccountsFromSupabase,
  savePaymentAccountToSupabase,
  syncPaymentAccountsToSupabase,
  deletePaymentAccountFromSupabase
} from './lib/supabase';
import { ADMIN_OWNER_USER_ID, buildStableUserId } from './lib/userCodec';
import { buildPaymentAccountId } from './lib/paymentCodec';

// One-time cleanup of legacy preloaded demo items/images from localStorage
try {
  if (typeof window !== 'undefined' && !localStorage.getItem('marhaba_clean_store_v2')) {
    localStorage.removeItem('marhaba_products');
    localStorage.removeItem('marhaba_banners');
    localStorage.removeItem('marhaba_categories');
    localStorage.setItem('marhaba_clean_store_v2', 'true');
  }
} catch (e) {
  console.error('Migration check failed', e);
}

export default function App() {
  // Admin View State (persists logged-in Admin session across app/browser restarts until Logout)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      const persisted =
        typeof localStorage !== 'undefined' && localStorage.getItem('marhaba_admin_auth') === 'true';
      if (persisted) return true;
      const legacySession =
        typeof sessionStorage !== 'undefined' && sessionStorage.getItem('marhaba_admin_auth') === 'true';
      if (legacySession && typeof localStorage !== 'undefined') {
        localStorage.setItem('marhaba_admin_auth', 'true');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);
  const [adminToast, setAdminToast] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('razvi_admin_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.fullName) return parsed;
      }
    } catch {
      // ignore storage error
    }
    return null;
  });

  // Persistent Categories State
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const stored = localStorage.getItem('marhaba_categories');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading stored categories', e);
    }
    return INITIAL_CATEGORIES;
  });

  // Persistent Products State (localStorage + empty initial store)
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const stored = localStorage.getItem('marhaba_products');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading stored products', e);
    }
    return PRODUCTS;
  });

  // Persistent Banners State
  const [banners, setBanners] = useState<Banner[]>(() => {
    try {
      const stored = localStorage.getItem('marhaba_banners');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading stored banners', e);
    }
    return INITIAL_BANNERS;
  });

  // Persistent Orders State
  const [recentOrders, setRecentOrders] = useState<Order[]>(() => {
    try {
      const stored = localStorage.getItem('marhaba_orders');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading stored orders', e);
    }
    return [];
  });

  // Persistent Payment Accounts (Admin QR Scanner, Phone & Bank Settings)
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>(() => {
    try {
      const stored = localStorage.getItem('marhaba_payment_accounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading stored payment accounts', e);
    }
    return [];
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('marhaba_categories', JSON.stringify(categories));
    } catch (e) {
      console.error('Failed saving categories to localStorage', e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem('marhaba_products', JSON.stringify(products));
    } catch (e) {
      console.error('Failed saving products to localStorage', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('marhaba_banners', JSON.stringify(banners));
    } catch (e) {
      console.error('Failed saving banners to localStorage', e);
    }
  }, [banners]);

  useEffect(() => {
    try {
      localStorage.setItem('marhaba_orders', JSON.stringify(recentOrders));
    } catch (e) {
      console.error('Failed saving orders to localStorage', e);
    }
  }, [recentOrders]);

  useEffect(() => {
    try {
      localStorage.setItem('marhaba_payment_accounts', JSON.stringify(paymentAccounts));
    } catch (e) {
      console.error('Failed saving payment accounts to localStorage', e);
    }
  }, [paymentAccounts]);

  // Live Sync from Supabase across all connected user devices
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(() => products.length === 0);
  const isSyncingRef = useRef(false);
  const hasSeededServerConfigRef = useRef(false);

  const syncFromSupabase = useCallback(async () => {
    if (isSyncingRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsInitialLoading(false);
      return;
    }

    isSyncingRef.current = true;
    try {
      let cfg = getSupabaseConfig();

      // Check server config in case Admin overrode Supabase project centrally
      const serverCfg = await fetchServerSupabaseConfig();
      if (!hasLocalSupabaseOverride()) {
        if (serverCfg && (serverCfg.url !== cfg.url || serverCfg.anonKey !== cfg.anonKey)) {
          cfg = serverCfg;
          setSupabaseConfigVersion((v) => v + 1);
        }
      } else if (cfg.url && cfg.anonKey && !serverCfg && !hasSeededServerConfigRef.current) {
        hasSeededServerConfigRef.current = true;
        saveServerSupabaseConfig(cfg.url, cfg.anonKey);
      }

      if (!cfg.url || !cfg.anonKey) return;

      let [remoteCategories, remoteProducts, remoteBanners, remoteOrders, remoteReviews, remoteUsers, remotePayments] = await Promise.all([
        fetchCategoriesFromSupabase(cfg),
        fetchProductsFromSupabase(cfg),
        fetchBannersFromSupabase(cfg),
        fetchOrdersFromSupabase(cfg),
        fetchReviewsFromSupabase(cfg),
        fetchUsersFromSupabase(cfg),
        fetchPaymentAccountsFromSupabase(cfg)
      ]);

      // Fallback to same-origin server proxy if browser direct fetch failed on mobile/network
      if (remoteProducts === null && remoteBanners === null) {
        const serverData = await fetchStorefrontDataFromServer();
        if (serverData) {
          remoteCategories = remoteCategories ?? serverData.categories;
          remoteProducts = serverData.products;
          remoteBanners = serverData.banners;
          remoteReviews = remoteReviews ?? serverData.reviews;
          remoteUsers = remoteUsers ?? serverData.users;
          remotePayments = remotePayments ?? serverData.paymentSettings;
        }
      }

      if (remoteCategories && remoteCategories.length > 0) {
        setCategories(remoteCategories);
      }

      if (remoteProducts !== null) {
        const mergedProducts = mergeRemoteReviewsIntoProducts(remoteProducts, remoteReviews);
        setProducts(mergedProducts);
        const byId = new Map(mergedProducts.map((p) => [p.id, p]));
        setQuickViewProduct((prev) => (prev ? byId.get(prev.id) || null : null));
        setCart((prev) =>
          prev
            .map((item) => {
              const latest = byId.get(item.product.id);
              return latest ? { ...item, product: latest } : null;
            })
            .filter(Boolean) as CartItem[]
        );
        setWishlist((prev) =>
          prev.map((p) => byId.get(p.id)).filter(Boolean) as Product[]
        );
      }

      if (remoteBanners !== null) {
        setBanners(remoteBanners);
      }

      if (remoteOrders !== null) {
        setRecentOrders(remoteOrders);
      }

      if (remoteUsers !== null) {
        setStoreUsers(remoteUsers);
        const remoteAdmin = remoteUsers.find(
          (u) => u.id === ADMIN_OWNER_USER_ID || u.role === 'admin'
        );
        if (remoteAdmin) {
          setAdminProfile(remoteAdmin);
          try {
            localStorage.setItem('razvi_admin_profile', JSON.stringify(remoteAdmin));
          } catch {
            // ignore
          }
        }
        setUserProfile((prev) => {
          if (!prev) return prev;
          const myId = buildStableUserId(prev.phone, prev.id, prev.role);
          const remoteMatch = remoteUsers.find(
            (u) => buildStableUserId(u.phone, u.id, u.role) === myId
          );
          if (remoteMatch && (!prev.updatedAt || Date.parse(remoteMatch.updatedAt) > Date.parse(prev.updatedAt))) {
            try {
              localStorage.setItem('marhaba_user_profile', JSON.stringify(remoteMatch));
            } catch {
              // ignore
            }
            return remoteMatch;
          }
          return prev;
        });
      }

      if (remotePayments !== null) {
        setPaymentAccounts(remotePayments);
      }
    } catch (err) {
      console.warn('Live Supabase sync error:', err);
    } finally {
      isSyncingRef.current = false;
      setIsInitialLoading(false);
    }
  }, []);

  const [supabaseConfigVersion, setSupabaseConfigVersion] = useState(0);
  const isAdminOpenRef = useRef(isAdminOpen);
  useEffect(() => {
    isAdminOpenRef.current = isAdminOpen;
  }, [isAdminOpen]);

  useEffect(() => {
    const handleConfigUpdated = () => {
      setSupabaseConfigVersion((v) => v + 1);
    };
    window.addEventListener('marhaba-supabase-config-updated', handleConfigUpdated);
    return () => window.removeEventListener('marhaba-supabase-config-updated', handleConfigUpdated);
  }, []);

  const syncLiveAdminFeeds = useCallback(async () => {
    const cfg = getSupabaseConfig();
    if (!cfg.url || !cfg.anonKey) return;
    const [remoteUsers, remoteOrders, remotePayments] = await Promise.all([
      fetchUsersFromSupabase(cfg),
      fetchOrdersFromSupabase(cfg),
      fetchPaymentAccountsFromSupabase(cfg)
    ]);
    if (remoteUsers !== null) setStoreUsers(remoteUsers);
    if (remoteOrders !== null) setRecentOrders(remoteOrders);
    if (remotePayments !== null) setPaymentAccounts(remotePayments);
  }, []);

  useEffect(() => {
    if (isAdminOpen || isAdminAuthenticated) {
      fetchAdminProfileRecord().then((loaded) => {
        if (loaded) {
          setAdminProfile(loaded);
          try {
            localStorage.setItem('razvi_admin_profile', JSON.stringify(loaded));
          } catch {
            // ignore
          }
        }
      });
    }
    if (isAdminOpen) {
      syncLiveAdminFeeds();
    }
  }, [isAdminOpen, isAdminAuthenticated, syncLiveAdminFeeds]);

  useEffect(() => {
    const bgSync = () => {
      if (!isAdminOpenRef.current) {
        syncFromSupabase();
      } else {
        syncLiveAdminFeeds();
      }
    };

    if (!isAdminOpenRef.current) {
      syncFromSupabase();
    }

    // Poll every 10 seconds while visible so customer & admin devices stay synced in real time
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        bgSync();
      }
    }, 10000);

    const handleResumeSync = () => {
      if (document.visibilityState === 'visible') {
        bgSync();
      }
    };

    window.addEventListener('focus', bgSync);
    window.addEventListener('online', bgSync);
    document.addEventListener('visibilitychange', handleResumeSync);

    // Optional instant Supabase Realtime WebSocket listener (triggers immediate re-sync on DB change)
    let ws: WebSocket | null = null;
    let heartbeatId: ReturnType<typeof setInterval> | null = null;
    const cfg = getSupabaseConfig();
    if (cfg.url && cfg.anonKey && cfg.url.startsWith('https://')) {
      try {
        const wsHost = cfg.url.trim().replace(/^https:\/\//, '').replace(/\/+$/, '');
        const wsUrl = `wss://${wsHost}/realtime/v1/websocket?apikey=${encodeURIComponent(cfg.anonKey.trim())}&vsn=1.0.0`;
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          ws?.send(JSON.stringify({
            topic: 'realtime:public',
            event: 'phx_join',
            payload: {
              config: {
                postgres_changes: [
                  { event: '*', schema: 'public', table: 'products' },
                  { event: '*', schema: 'public', table: 'categories' },
                  { event: '*', schema: 'public', table: 'banners' },
                  { event: '*', schema: 'public', table: 'orders' },
                  { event: '*', schema: 'public', table: 'product_reviews' },
                  { event: '*', schema: 'public', table: 'store_users' },
                  { event: '*', schema: 'public', table: 'payment_settings' }
                ]
              }
            },
            ref: '1'
          }));
          heartbeatId = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: 'hb' }));
            }
          }, 25000);
        };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg?.event === 'postgres_changes') {
              bgSync();
            }
          } catch {
            // ignore non-JSON frames
          }
        };
      } catch {
        // Polling fallback handles sync cleanly
      }
    }

    return () => {
      clearInterval(intervalId);
      if (heartbeatId) clearInterval(heartbeatId);
      if (ws) ws.close();
      window.removeEventListener('focus', bgSync);
      window.removeEventListener('online', bgSync);
      document.removeEventListener('visibilitychange', handleResumeSync);
    };
  }, [syncFromSupabase, supabaseConfigVersion]);

  // Category & Filter State
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    cluster: '',
    maxPrice: null,
    minRating: null,
    onlyPureSilk: false,
    onlyReadyToShip: false,
    onlyFreeDelivery: false,
    onlyBridal: false,
    searchQuery: '',
    sortBy: 'featured'
  });

  // User Account & Profile State (persisted permanently on device until app/data is deleted)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('marhaba_user_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.fullName && parsed.phone) return parsed;
      }
    } catch (e) {
      console.error('Error loading user profile', e);
    }
    return null;
  });

  const [myOrderIds, setMyOrderIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('marhaba_my_order_ids');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading user order IDs', e);
    }
    return [];
  });

  const [storeUsers, setStoreUsers] = useState<UserProfile[]>(() => {
    try {
      const stored = localStorage.getItem('marhaba_store_users');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading stored users directory', e);
    }
    return userProfile ? [userProfile] : [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('marhaba_store_users', JSON.stringify(storeUsers));
    } catch (e) {
      console.error('Failed saving store users to localStorage', e);
    }
  }, [storeUsers]);

  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState<boolean>(() => !userProfile);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'profile' | 'orders'>('profile');

  const handleSaveUserProfile = (profile: UserProfile) => {
    const stableId = buildStableUserId(profile.phone, userProfile?.id || profile.id, profile.role);
    const enrichedProfile: UserProfile = {
      ...profile,
      id: stableId,
      role: profile.role || 'user',
      createdAt: userProfile?.createdAt || profile.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setUserProfile(enrichedProfile);
    try {
      localStorage.setItem('marhaba_user_profile', JSON.stringify(enrichedProfile));
    } catch (e) {
      console.error('Failed saving user profile', e);
    }

    setStoreUsers((prev) => {
      const idx = prev.findIndex((u) => buildStableUserId(u.phone, u.id, u.role) === stableId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = enrichedProfile;
        return next;
      }
      return [enrichedProfile, ...prev];
    });

    const cfg = getSupabaseConfig();
    saveUserToSupabase(enrichedProfile, cfg).catch((err) =>
      console.warn('Could not sync user account to Supabase store_users', err)
    );

    setIsCreateAccountOpen(false);
  };

  const handleSecretCodeLogin = async (
    secretCode: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const cfg = getSupabaseConfig();
    const res = await loginWithSecretCode(secretCode, storeUsers, cfg);
    if (!res.ok || !res.profile) {
      return { ok: false, error: res.error };
    }

    if (res.role === 'admin') {
      try {
        localStorage.setItem('marhaba_admin_auth', 'true');
        sessionStorage.setItem('marhaba_admin_auth', 'true');
        localStorage.setItem('razvi_admin_profile', JSON.stringify(res.profile));
      } catch {
        // ignore storage error
      }
      setAdminProfile(res.profile);
      setIsAdminAuthenticated(true);
      setIsCreateAccountOpen(false);
      setIsAdminOpen(true);
      return { ok: true };
    }

    // Customer account restoration (exact saved profile & address)
    let restored = res.profile;
    if ((!restored.fullAddress?.trim() || !restored.pincode?.trim()) && restored.phone?.trim()) {
      const normalizedPhone = restored.phone.replace(/\D/g, '').slice(-10);
      const latestOrderWithAddress = [...recentOrders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .find((o) => {
          const orderPhone = (o.shippingAddress?.phone || '').replace(/\D/g, '').slice(-10);
          return (
            Boolean(orderPhone && normalizedPhone && orderPhone === normalizedPhone) &&
            Boolean(o.shippingAddress?.addressLine?.trim() && o.shippingAddress?.pincode?.trim())
          );
        });
      if (latestOrderWithAddress?.shippingAddress) {
        const sa = latestOrderWithAddress.shippingAddress;
        restored = {
          ...restored,
          fullAddress: sa.addressLine.trim(),
          city: sa.city?.trim() || restored.city || '',
          state: sa.state?.trim() || restored.state || '',
          pincode: sa.pincode.trim(),
          landmark: sa.landmark?.trim() || restored.landmark
        };
      }
    }
    setUserProfile(restored);
    try {
      localStorage.setItem('marhaba_user_profile', JSON.stringify(restored));
    } catch (e) {
      console.error('Failed saving restored user profile', e);
    }
    setStoreUsers((prev) => {
      const stableId = buildStableUserId(restored.phone, restored.id, restored.role);
      const idx = prev.findIndex((u) => buildStableUserId(u.phone, u.id, u.role) === stableId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = restored;
        return next;
      }
      return [restored, ...prev];
    });
    setIsCreateAccountOpen(false);
    setAdminToast(`Welcome back, ${restored.fullName}! Aapka profile & address restore ho gaya.`);
    setTimeout(() => setAdminToast(null), 5000);
    return { ok: true };
  };

  const handleUserLogout = () => {
    setUserProfile(null);
    try {
      localStorage.removeItem('marhaba_user_profile');
      localStorage.removeItem('marhaba_my_order_ids');
    } catch (e) {
      console.error('Failed clearing user profile on logout', e);
    }
    setMyOrderIds([]);
    setIsProfileOpen(false);
    setIsCreateAccountOpen(true);
  };

  // Modals & Drawers
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isArtisansOpen, setIsArtisansOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);

  // Mobile Hardware / Gesture Back Button History Stack Sync
  // Prevents closing the app when pressing phone's Back button inside a Product, Modal, Cart, Category, or Admin view.
  const navDepth = useMemo(() => {
    let depth = 0;
    const hasFilterView =
      activeCategory !== 'all' ||
      Boolean(filters.searchQuery.trim()) ||
      Boolean(filters.cluster);
    if (hasFilterView) depth += 1;
    if (isAdminOpen) depth += 1;
    if (isArtisansOpen) depth += 1;
    if (isTrackingOpen) depth += 1;
    if (isProfileOpen) depth += 1;
    if (isWishlistOpen) depth += 1;
    if (isCartOpen) depth += 1;
    if (quickViewProduct) depth += 1;
    if (isCheckoutOpen) depth += 1;
    if (isAdminLoginOpen) depth += 1;
    return depth;
  }, [
    activeCategory,
    filters.searchQuery,
    filters.cluster,
    isAdminOpen,
    isArtisansOpen,
    isTrackingOpen,
    isProfileOpen,
    isWishlistOpen,
    isCartOpen,
    quickViewProduct,
    isCheckoutOpen,
    isAdminLoginOpen
  ]);

  const historyDepthRef = useRef(0);
  const ignoreNextPopCountRef = useRef(0);
  const popTopLayerRef = useRef<() => void>(() => {});

  popTopLayerRef.current = () => {
    if (isAdminLoginOpen) {
      setIsAdminLoginOpen(false);
      return;
    }
    if (isCheckoutOpen) {
      setIsCheckoutOpen(false);
      return;
    }
    if (quickViewProduct) {
      setQuickViewProduct(null);
      return;
    }
    if (isAdminOpen) {
      setIsAdminOpen(false);
      syncFromSupabase();
      return;
    }
    if (isCartOpen) {
      setIsCartOpen(false);
      return;
    }
    if (isWishlistOpen) {
      setIsWishlistOpen(false);
      return;
    }
    if (isProfileOpen) {
      setIsProfileOpen(false);
      return;
    }
    if (isTrackingOpen) {
      setIsTrackingOpen(false);
      return;
    }
    if (isArtisansOpen) {
      setIsArtisansOpen(false);
      return;
    }
    if (activeCategory !== 'all' || filters.searchQuery.trim() || filters.cluster) {
      setActiveCategory('all');
      setFilters((prev) => ({
        ...prev,
        category: 'all',
        cluster: '',
        searchQuery: ''
      }));
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (ignoreNextPopCountRef.current > 0) {
        ignoreNextPopCountRef.current -= 1;
        return;
      }
      if (historyDepthRef.current > 0) {
        historyDepthRef.current -= 1;
      }
      popTopLayerRef.current();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (navDepth > historyDepthRef.current) {
      const diff = navDepth - historyDepthRef.current;
      for (let i = 0; i < diff; i++) {
        window.history.pushState({ razviDepth: historyDepthRef.current + i + 1 }, '', window.location.href);
      }
      historyDepthRef.current = navDepth;
    } else if (navDepth < historyDepthRef.current) {
      const diff = historyDepthRef.current - navDepth;
      historyDepthRef.current = navDepth;
      ignoreNextPopCountRef.current += 1;
      window.history.go(-diff);
    }
  }, [navDepth]);

  // Cart & Wishlist Storage (empty until user adds products)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [appliedCouponInfo, setAppliedCouponInfo] = useState<{ discount: number; code: string }>({
    discount: 0,
    code: ''
  });

  // Handle Category Change from Nav
  const handleSelectCategory = (catId: string) => {
    setActiveCategory(catId);
    setFilters((prev) => ({
      ...prev,
      category: catId
    }));
  };

  const handleResetFilters = () => {
    setActiveCategory('all');
    setFilters({
      category: 'all',
      cluster: '',
      maxPrice: null,
      minRating: null,
      onlyPureSilk: false,
      onlyReadyToShip: false,
      onlyFreeDelivery: false,
      onlyBridal: false,
      searchQuery: '',
      sortBy: 'featured'
    });
  };

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Category check
      if (activeCategory !== 'all' && product.category !== activeCategory) {
        return false;
      }
      // Cluster check
      if (filters.cluster && product.artisanCluster !== filters.cluster) {
        return false;
      }
      // Max price
      if (filters.maxPrice !== null && product.price > filters.maxPrice) {
        return false;
      }
      // Rating check
      if (filters.minRating !== null && product.rating < filters.minRating) {
        return false;
      }
      // Pure Silk flag
      if (filters.onlyPureSilk && !product.isPureSilk) {
        return false;
      }
      // Ready to Ship
      if (filters.onlyReadyToShip && !product.readyToShip) {
        return false;
      }
      // Free Delivery
      if (filters.onlyFreeDelivery && !product.freeDelivery) {
        return false;
      }
      // Bridal
      if (filters.onlyBridal && !product.isBridal) {
        return false;
      }
      // Search query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matchesTitle = product.title.toLowerCase().includes(q);
        const matchesDesc = product.description.toLowerCase().includes(q);
        const matchesFabric = product.fabric.toLowerCase().includes(q);
        const matchesCluster = product.artisanCluster.toLowerCase().includes(q);
        const matchesTag = product.provenanceTag.toLowerCase().includes(q);
        const matchesColor =
          (product.color || '').toLowerCase().includes(q) ||
          (product.colorVariants || []).some((v) => v.colorName.toLowerCase().includes(q));
        const matchesSupplier = (product.supplierName || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesFabric && !matchesCluster && !matchesTag && !matchesColor && !matchesSupplier) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (filters.sortBy === 'price-asc') return a.price - b.price;
      if (filters.sortBy === 'price-desc') return b.price - a.price;
      if (filters.sortBy === 'rating') return b.rating - a.rating;
      if (filters.sortBy === 'discount') return b.discountPercent - a.discountPercent;
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
  }, [products, activeCategory, filters]);

  // Cart operations
  const handleAddToCart = (product: Product, selectedSize?: string) => {
    const size = selectedSize || product.availableSizes?.[0] || 'Free Size';
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.selectedSize === size
      );
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.selectedSize === size
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, selectedSize: size, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, selectedSize: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId && item.selectedSize === selectedSize) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (productId: string, selectedSize: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.product.id === productId && item.selectedSize === selectedSize)
      )
    );
  };

  // Wishlist operations
  const handleToggleWishlist = (product: Product) => {
    setWishlist((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      }
      return [...prev, product];
    });
  };

  const handleMoveToCart = (product: Product) => {
    handleAddToCart(product);
    setWishlist((prev) => prev.filter((p) => p.id !== product.id));
    setIsWishlistOpen(false);
    setIsCartOpen(true);
  };

  // Buy Now
  const handleBuyNow = (product: Product, selectedSize: string) => {
    handleAddToCart(product, selectedSize);
    setQuickViewProduct(null);
    setIsCheckoutOpen(true);
  };

  // Cart Totals
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartItemsTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleOrderPlaced = (order: Order) => {
    setRecentOrders((prev) => [order, ...prev]);
    setMyOrderIds((prev) => {
      const next = prev.includes(order.id) ? prev : [order.id, ...prev];
      try {
        localStorage.setItem('marhaba_my_order_ids', JSON.stringify(next));
      } catch (e) {
        console.error('Failed saving my order IDs', e);
      }
      return next;
    });
    setCart([]);

    // Save / update customer delivery address permanently in profile, localStorage & Supabase
    const cfg = getSupabaseConfig();
    const sa = order.shippingAddress;
    if (sa) {
      const accountPhone = userProfile?.phone?.trim() || sa.phone?.trim() || '';
      const stableId = buildStableUserId(accountPhone, userProfile?.id, userProfile?.role);
      const nowIso = new Date().toISOString();
      const updatedUserProfile: UserProfile = {
        id: stableId,
        fullName: sa.fullName?.trim() || userProfile?.fullName || 'Customer',
        phone: accountPhone,
        age: userProfile?.age || '',
        secretCode: userProfile?.secretCode,
        role: userProfile?.role || 'user',
        buildingOrVillage: '',
        fullAddress: sa.addressLine?.trim() || userProfile?.fullAddress || '',
        landmark: sa.landmark?.trim() || userProfile?.landmark || undefined,
        city: sa.city?.trim() || userProfile?.city || '',
        state: sa.state?.trim() || userProfile?.state || '',
        pincode: sa.pincode?.trim() || userProfile?.pincode || '',
        createdAt: userProfile?.createdAt || nowIso,
        updatedAt: nowIso
      };

      setUserProfile(updatedUserProfile);
      try {
        localStorage.setItem('marhaba_user_profile', JSON.stringify(updatedUserProfile));
      } catch (e) {
        console.error('Failed saving updated delivery address to localStorage', e);
      }
      setStoreUsers((prev) => {
        const idx = prev.findIndex((u) => buildStableUserId(u.phone, u.id, u.role) === stableId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updatedUserProfile;
          return next;
        }
        return [updatedUserProfile, ...prev];
      });
      saveUserToSupabase(updatedUserProfile, cfg).catch((err) =>
        console.warn('Could not sync updated delivery address to Supabase store_users', err)
      );
    }

    if (cfg.url && cfg.anonKey) {
      saveOrderToSupabase(order, cfg).catch((err) =>
        console.warn('Could not auto-sync order to Supabase Table Editor', err)
      );
    }
  };

  // Orders belonging to this user (from first order to latest)
  const myOrders = useMemo(() => {
    const idSet = new Set(myOrderIds);
    const userPhone = userProfile?.phone?.trim();
    return recentOrders
      .filter((o) => idSet.has(o.id) || (userPhone && o.shippingAddress?.phone?.trim() === userPhone))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [recentOrders, myOrderIds, userProfile]);

  // ==========================================
  // ADMIN ACTIONS (Products, Categories, Banners, Orders)
  // ==========================================
  const handleAddProduct = (newProduct: Product) => {
    setProducts((prev) => [newProduct, ...prev]);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
    if (quickViewProduct?.id === updatedProduct.id) {
      setQuickViewProduct(updatedProduct);
    }
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    setWishlist((prev) => prev.filter((p) => p.id !== productId));
    if (quickViewProduct?.id === productId) {
      setQuickViewProduct(null);
    }
  };

  const handleAddCategory = (newCat: Category) => {
    setCategories((prev) => [...prev, newCat]);
  };

  const handleUpdateCategory = (updatedCat: Category) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === updatedCat.id ? updatedCat : c))
    );
  };

  const handleDeleteCategory = (categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    if (activeCategory === categoryId) {
      setActiveCategory('all');
    }
  };

  const handleAddBanner = (newBanner: Banner) => {
    setBanners((prev) => [newBanner, ...prev]);
  };

  const handleUpdateBanner = (updatedBanner: Banner) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === updatedBanner.id ? updatedBanner : b))
    );
  };

  const handleDeleteBanner = (bannerId: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== bannerId));
  };

  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    setRecentOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const updated = { ...o, status };
          const cfg = getSupabaseConfig();
          if (cfg.url && cfg.anonKey) {
            saveOrderToSupabase(updated, cfg).catch((err) =>
              console.warn('Could not sync order status to Supabase', err)
            );
          }
          return updated;
        }
        return o;
      })
    );
  };

  const handleDeleteOrder = (orderId: string) => {
    setRecentOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  const handleSaveProductReview = async (
    productId: string,
    review: ProductReview
  ): Promise<boolean> => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return false;

    const existingReviews = Array.isArray(targetProduct.reviews) ? targetProduct.reviews : [];
    const exists = existingReviews.some((r) => r.id === review.id);
    const enrichedReview: ProductReview = {
      ...review,
      productId: targetProduct.id,
      categoryId: review.categoryId || targetProduct.category
    };
    const nextReviews = exists
      ? existingReviews.map((r) => (r.id === review.id ? enrichedReview : r))
      : [enrichedReview, ...existingReviews];

    const summary = calculateProductRatingSummary(nextReviews, targetProduct.rating);
    const updatedProduct: Product = {
      ...targetProduct,
      reviews: nextReviews,
      rating: summary.rating,
      reviewCount: summary.reviewCount
    };

    setProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)));
    setQuickViewProduct((prev) => (prev?.id === productId ? updatedProduct : prev));
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, product: updatedProduct } : item))
    );
    setWishlist((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)));

    const cfg = getSupabaseConfig();
    if (cfg.url && cfg.anonKey) {
      return await saveReviewToSupabase(enrichedReview, updatedProduct, cfg);
    }
    return false;
  };

  const handleDeleteProductReview = async (
    productId: string,
    reviewId: string
  ): Promise<boolean> => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return false;

    const existingReviews = Array.isArray(targetProduct.reviews) ? targetProduct.reviews : [];
    const nextReviews = existingReviews.filter((r) => r.id !== reviewId);
    const summary = calculateProductRatingSummary(nextReviews, nextReviews.length > 0 ? targetProduct.rating : 4.8);
    const updatedProduct: Product = {
      ...targetProduct,
      reviews: nextReviews,
      rating: summary.rating,
      reviewCount: nextReviews.length
    };

    setProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)));
    setQuickViewProduct((prev) => (prev?.id === productId ? updatedProduct : prev));
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, product: updatedProduct } : item))
    );
    setWishlist((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)));

    const cfg = getSupabaseConfig();
    if (cfg.url && cfg.anonKey) {
      return await deleteReviewFromSupabase(reviewId, updatedProduct, cfg);
    }
    return false;
  };

  const handleTriggerAdminLogin = () => {
    const storedAuth = (() => {
      try {
        return (
          localStorage.getItem('marhaba_admin_auth') === 'true' ||
          sessionStorage.getItem('marhaba_admin_auth') === 'true'
        );
      } catch {
        return false;
      }
    })();

    if (isAdminAuthenticated || storedAuth) {
      try {
        localStorage.setItem('marhaba_admin_auth', 'true');
      } catch {
        // ignore storage error
      }
      setIsAdminAuthenticated(true);
      setIsAdminOpen(true);
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleAdminLogout = () => {
    try {
      localStorage.removeItem('marhaba_admin_auth');
      sessionStorage.removeItem('marhaba_admin_auth');
    } catch {
      // ignore storage error
    }
    setIsAdminAuthenticated(false);
    setIsAdminOpen(false);
    if (!userProfile) {
      setIsCreateAccountOpen(true);
    }
  };

  const handleResetToDemo = () => {
    setProducts([]);
    setCategories(INITIAL_CATEGORIES);
    setBanners([]);
    setCart([]);
    setWishlist([]);
    localStorage.setItem('marhaba_products', JSON.stringify([]));
    localStorage.setItem('marhaba_banners', JSON.stringify([]));
    localStorage.setItem('marhaba_categories', JSON.stringify(INITIAL_CATEGORIES));
  };

  const handleUpdateStoreUser = async (updatedUser: UserProfile): Promise<boolean> => {
    const stableId = buildStableUserId(updatedUser.phone, updatedUser.id, updatedUser.role);
    const cleanUser: UserProfile = {
      ...updatedUser,
      id: stableId,
      updatedAt: new Date().toISOString()
    };
    setStoreUsers((prev) => {
      const idx = prev.findIndex((u) => buildStableUserId(u.phone, u.id, u.role) === stableId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cleanUser;
        return next;
      }
      return [cleanUser, ...prev];
    });
    if (userProfile && buildStableUserId(userProfile.phone, userProfile.id, userProfile.role) === stableId) {
      setUserProfile(cleanUser);
      try {
        localStorage.setItem('marhaba_user_profile', JSON.stringify(cleanUser));
      } catch {
        // ignore
      }
    }
    const cfg = getSupabaseConfig();
    if (cfg.url && cfg.anonKey) {
      return await saveUserToSupabase(cleanUser, cfg);
    }
    return false;
  };

  const handleUpdateAdminProfile = async (updatedAdmin: UserProfile): Promise<boolean> => {
    const cfg = getSupabaseConfig();
    const res = await saveAdminProfileRecord(updatedAdmin, cfg);
    const finalProfile = res.profile || updatedAdmin;
    setAdminProfile(finalProfile);
    try {
      localStorage.setItem('razvi_admin_profile', JSON.stringify(finalProfile));
    } catch {
      // ignore
    }
    return Boolean(res.syncedToSupabase || res.ok);
  };

  const handleDeleteStoreUser = async (userId: string): Promise<boolean> => {
    setStoreUsers((prev) => prev.filter((u) => buildStableUserId(u.phone, u.id, u.role) !== userId));
    const cfg = getSupabaseConfig();
    if (cfg.url && cfg.anonKey) {
      return await deleteUserFromSupabase(userId, cfg);
    }
    return false;
  };

  // Active Payment QR / Phone / Bank selected by Admin
  const activePaymentAccount = useMemo(
    () => paymentAccounts.find((a) => a.active) || paymentAccounts[0] || null,
    [paymentAccounts]
  );

  const handleSavePaymentAccount = async (account: PaymentAccount): Promise<boolean> => {
    const now = new Date().toISOString();
    const id = buildPaymentAccountId(account.id);
    const shouldActivate = paymentAccounts.length === 0 ? true : Boolean(account.active);

    const existingIdx = paymentAccounts.findIndex((a) => a.id === id);
    const cleanAcc: PaymentAccount = {
      ...account,
      id,
      phone: account.phone.trim(),
      bankName: account.bankName.trim(),
      upiId: (account.upiId || '').trim(),
      accountHolder: (account.accountHolder || '').trim(),
      qrImageUrl: account.qrImageUrl.trim(),
      active: shouldActivate,
      createdAt: (existingIdx >= 0 ? paymentAccounts[existingIdx].createdAt : account.createdAt) || now,
      updatedAt: now
    };

    const nextList =
      existingIdx >= 0
        ? paymentAccounts.map((a) => {
            if (a.id === id) return cleanAcc;
            return cleanAcc.active ? { ...a, active: false, updatedAt: now } : a;
          })
        : [
            cleanAcc,
            ...paymentAccounts.map((a) =>
              cleanAcc.active ? { ...a, active: false, updatedAt: now } : a
            )
          ];

    setPaymentAccounts(nextList);

    const cfg = getSupabaseConfig();
    if (cfg.url && cfg.anonKey) {
      if (cleanAcc.active && nextList.length > 1) {
        return await syncPaymentAccountsToSupabase(nextList, cfg);
      }
      return await savePaymentAccountToSupabase(cleanAcc, cfg);
    }
    return false;
  };

  const handleSetActivePaymentAccount = async (accountId: string): Promise<boolean> => {
    const now = new Date().toISOString();
    const nextList = paymentAccounts.map((a) => ({
      ...a,
      active: a.id === accountId,
      updatedAt: a.id === accountId || a.active ? now : a.updatedAt
    }));
    setPaymentAccounts(nextList);

    const cfg = getSupabaseConfig();
    if (cfg.url && cfg.anonKey) {
      return await syncPaymentAccountsToSupabase(nextList, cfg);
    }
    return false;
  };

  const handleDeletePaymentAccount = async (accountId: string): Promise<boolean> => {
    const remaining = paymentAccounts.filter((a) => a.id !== accountId);
    const now = new Date().toISOString();
    let promotedAccount: PaymentAccount | null = null;

    const nextList = remaining.map((a, idx) => {
      const hasAnyActive = remaining.some((r) => r.active);
      if (!hasAnyActive && idx === 0) {
        promotedAccount = { ...a, active: true, updatedAt: now };
        return promotedAccount;
      }
      return a;
    });

    setPaymentAccounts(nextList);

    const cfg = getSupabaseConfig();
    if (cfg.url && cfg.anonKey) {
      const deleted = await deletePaymentAccountFromSupabase(accountId, cfg);
      if (promotedAccount) {
        await savePaymentAccountToSupabase(promotedAccount, cfg);
      }
      return deleted;
    }
    return false;
  };

  // If Admin View is active, render full Admin Portal
  if (isAdminOpen) {
    return (
      <AdminPanel
        products={products}
        categories={categories}
        banners={banners}
        orders={recentOrders}
        users={storeUsers}
        adminProfile={adminProfile}
        paymentAccounts={paymentAccounts}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
        onAddCategory={handleAddCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
        onAddBanner={handleAddBanner}
        onUpdateBanner={handleUpdateBanner}
        onDeleteBanner={handleDeleteBanner}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        onDeleteOrder={handleDeleteOrder}
        onSaveProductReview={handleSaveProductReview}
        onDeleteProductReview={handleDeleteProductReview}
        onUpdateUser={handleUpdateStoreUser}
        onDeleteUser={handleDeleteStoreUser}
        onUpdateAdminProfile={handleUpdateAdminProfile}
        onSavePaymentAccount={handleSavePaymentAccount}
        onSetActivePaymentAccount={handleSetActivePaymentAccount}
        onDeletePaymentAccount={handleDeletePaymentAccount}
        onResetToDemo={handleResetToDemo}
        onRefreshFromSupabase={syncFromSupabase}
        onClose={() => {
          setIsAdminOpen(false);
          syncFromSupabase();
        }}
        onLogout={handleAdminLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F9] text-[#222222] flex flex-col font-sans selection:bg-[#9F2089] selection:text-white">
      {/* Header */}
      <Header
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
        searchQuery={filters.searchQuery}
        onSearchChange={(q) => setFilters((prev) => ({ ...prev, searchQuery: q }))}
        wishlistCount={wishlist.length}
        cartCount={cartItemCount}
        cartTotal={cartItemsTotal}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onTriggerAdminLogin={handleTriggerAdminLogin}
        onOpenArtisans={() => setIsArtisansOpen(true)}
        onOpenTracking={() => {
          setProfileInitialTab('orders');
          setIsProfileOpen(true);
        }}
        onOpenProfile={() => {
          if (isAdminAuthenticated) {
            setIsAdminOpen(true);
          } else {
            setProfileInitialTab('profile');
            setIsProfileOpen(true);
          }
        }}
        userName={isAdminAuthenticated ? (adminProfile?.fullName || userProfile?.fullName || 'Rahbar') : userProfile?.fullName}
        paymentPhone={activePaymentAccount?.phone}
      />

      {adminToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#1E1E2E] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-xl border border-[#FECE57]/40 animate-fadeIn">
          {adminToast}
        </div>
      )}

      {/* Hero Section (banners + dynamic category bubbles) */}
      {!filters.searchQuery && activeCategory === 'all' && (
        <HeroSection
          banners={banners}
          categories={categories}
          onExploreCategory={handleSelectCategory}
          onOpenArtisans={() => setIsArtisansOpen(true)}
        />
      )}

      {/* Facet Filter & Sort Bar */}
      <FacetFilterBar
        filters={filters}
        onChangeFilters={setFilters}
        onResetFilters={handleResetFilters}
        totalResults={filteredProducts.length}
      />

      {/* Active Cluster or Search Filter Banner */}
      {(filters.cluster || filters.searchQuery) && (
        <div className="bg-white border-b border-[#E8E8E8] py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-[#555555]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#9F2089]" />
              {filters.cluster && (
                <span>
                  Filtering by Guild: <strong>{filters.cluster} Weavers</strong>
                </span>
              )}
              {filters.searchQuery && (
                <span>
                  Search results for: <strong>"{filters.searchQuery}"</strong>
                </span>
              )}
            </div>
            <button
              onClick={handleResetFilters}
              className="text-[#9F2089] font-bold hover:underline"
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* Main Product Catalog Grid */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-10 w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-[#222222] tracking-tight">
              {activeCategory === 'all'
                ? 'RAZVI SHOP · Top Handcrafted Picks'
                : `${activeCategory.toUpperCase()} · Curated Creations`}
            </h2>
            <div className="text-xs text-[#666666]">
              Direct from generational weaver clusters in Varanasi, Surat, Chanderi & Kanchipuram
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          isInitialLoading && products.length === 0 ? (
            <div className="py-16 text-center max-w-md mx-auto space-y-3 bg-white p-8 rounded-lg border border-[#E8E8E8]">
              <img
                src="/rs-icon-512.png"
                alt="RAZVI SHOP"
                className="w-20 h-20 rounded-full object-contain mx-auto shadow-md animate-pulse"
              />
              <h3 className="text-base font-bold text-[#222222]">Loading RAZVI SHOP...</h3>
              <p className="text-xs text-[#666666]">Syncing latest creations &amp; banners</p>
            </div>
          ) : (
            <div className="py-16 text-center max-w-md mx-auto space-y-3 bg-white p-8 rounded-lg border border-[#E8E8E8]">
              <div className="w-16 h-16 rounded-full bg-[#FAF8F5] flex items-center justify-center mx-auto text-[#888888]">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[#222222]">
                {products.length === 0 ? 'Catalog Coming Soon' : 'No Products Found'}
              </h3>
              <p className="text-xs text-[#666666]">
                {products.length === 0
                  ? 'New handcrafted ethnic collections are arriving soon. Check back shortly!'
                  : 'Try adjusting your price or filter selections, or reset filters to see all creations.'}
              </p>
              {products.length > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 bg-[#9F2089] text-white text-xs font-bold rounded hover:bg-[#80182E] transition-colors"
                >
                  Reset Filters
                </button>
              )}
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={wishlist.some((p) => p.id === product.id)}
                onToggleWishlist={handleToggleWishlist}
                onQuickView={(p) => setQuickViewProduct(p)}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer (RAZVI SHOP About, Gmail, Phone, Kishanganj Bihar 855108 Address) */}
      <Footer
        onSelectCategory={handleSelectCategory}
        onOpenArtisans={() => setIsArtisansOpen(true)}
        onOpenTracking={() => {
          setProfileInitialTab('orders');
          setIsProfileOpen(true);
        }}
        paymentPhone={activePaymentAccount?.phone}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={quickViewProduct}
        isOpen={Boolean(quickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
        isWishlisted={
          quickViewProduct
            ? wishlist.some((p) => p.id === quickViewProduct.id)
            : false
        }
        onToggleWishlist={handleToggleWishlist}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        userProfile={userProfile || (isAdminAuthenticated ? adminProfile : null)}
        onSubmitReview={handleSaveProductReview}
      />

      {/* Shopping Bag Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onProceedToCheckout={(discount, code) => {
          setAppliedCouponInfo({ discount, code });
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal with Admin QR Scanner, Bank Name, Phone & UTR verification */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cart}
        couponDiscount={appliedCouponInfo.discount}
        appliedCode={appliedCouponInfo.code}
        onOrderPlaced={handleOrderPlaced}
        userProfile={userProfile || (isAdminAuthenticated ? adminProfile : null)}
        activePaymentAccount={activePaymentAccount}
      />

      {/* Artisan Guilds Modal */}
      <ArtisanHubsModal
        isOpen={isArtisansOpen}
        onClose={() => setIsArtisansOpen(false)}
        onSelectCluster={(clusterId) => {
          setFilters((prev) => ({ ...prev, cluster: clusterId }));
        }}
      />

      {/* Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        recentOrders={recentOrders}
      />

      {/* User Profile & My Orders Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        initialTab={profileInitialTab}
        onClose={() => setIsProfileOpen(false)}
        userProfile={userProfile}
        localUsers={storeUsers}
        onUpdateProfile={handleSaveUserProfile}
        onOpenCreateAccount={() => setIsCreateAccountOpen(true)}
        onLogout={handleUserLogout}
        orders={myOrders}
      />

      {/* First-Launch Create Account & 6-Digit Secret Code Login Modal */}
      <CreateAccountModal
        isOpen={isCreateAccountOpen && !isAdminLoginOpen && !isAdminAuthenticated}
        localUsers={storeUsers}
        onSaveAccount={handleSaveUserProfile}
        onSecretCodeLogin={handleSecretCodeLogin}
        onTriggerAdminLogin={handleTriggerAdminLogin}
      />

      {/* Wishlist Drawer */}
      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlist={wishlist}
        onRemoveFromWishlist={(id) =>
          setWishlist((prev) => prev.filter((p) => p.id !== id))
        }
        onMoveToCart={handleMoveToCart}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        localUsers={storeUsers}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={(restoredAdminProfile) => {
          try {
            localStorage.setItem('marhaba_admin_auth', 'true');
            sessionStorage.setItem('marhaba_admin_auth', 'true');
            if (restoredAdminProfile) {
              localStorage.setItem('razvi_admin_profile', JSON.stringify(restoredAdminProfile));
            }
          } catch {
            // ignore storage error
          }
          if (restoredAdminProfile) {
            setAdminProfile(restoredAdminProfile);
          }
          setIsAdminAuthenticated(true);
          setIsAdminLoginOpen(false);
          setIsAdminOpen(true);
          setAdminToast('Admin logged in! Admin Panel & Profile restore ho gaya.');
          setTimeout(() => setAdminToast(null), 5000);
        }}
      />

      {/* Offline Banner */}
      <OfflineIndicator />
    </div>
  );
}
