export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  badgeText: string;
  ctaText: string;
  categoryLink: string;
  imageUrl: string;
  bgGradient: string;
  active: boolean;
}

export interface Category {
  id: string;
  label: string;
  slug: string;
  imageUrl?: string;
  description?: string;
  itemCount?: number;
}

export interface Product {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  artisanCluster: 'Varanasi' | 'Surat' | 'Chanderi' | 'Kanchipuram' | 'Jaipur' | string;
  artisanName: string;
  provenanceTag: string; // e.g. "VARANASI WEAVERS", "SURAT DIRECT", "MARHABA EXCLUSIVE"
  supplierName?: string;
  supplierRating?: number;
  mTrusted?: boolean;
  color?: string;
  colorHex?: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  images: string[];
  fabric: string;
  weaveType: string;
  blousePiece: string;
  dimensions: string;
  care: string;
  dispatchTime: string;
  freeDelivery: boolean;
  readyToShip: boolean;
  isPureSilk: boolean;
  isBridal: boolean;
  featured?: boolean;
  availableSizes?: string[];
  description: string;
  reviews?: {
    id: string;
    userName: string;
    rating: number;
    date: string;
    comment: string;
    verified: boolean;
    location: string;
    reviewImage?: string;
  }[];
}

export interface ArtisanHub {
  id: string;
  name: string;
  state: string;
  specialty: string;
  history: string;
  activeWeaversCount: number;
  image: string;
  certifications: string[];
}

export interface CartItem {
  product: Product;
  selectedSize: string;
  selectedBlouseOption?: string;
  quantity: number;
}

export interface FilterState {
  category: string;
  cluster: string;
  maxPrice: number | null;
  minRating: number | null;
  onlyPureSilk: boolean;
  onlyReadyToShip: boolean;
  onlyFreeDelivery: boolean;
  onlyBridal: boolean;
  color?: string;
  fabric?: string;
  searchQuery: string;
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'discount';
}

export interface Order {
  id: string;
  createdAt: string;
  items: CartItem[];
  shippingAddress: {
    fullName: string;
    phone: string;
    pincode: string;
    addressLine: string;
    city: string;
    state: string;
    landmark?: string;
  };
  paymentMethod: 'cod' | 'upi' | 'card' | 'netbanking';
  pricing: {
    itemsTotal: number;
    discount: number;
    couponDiscount: number;
    deliveryFee: number;
    finalTotal: number;
  };
  couponCode?: string;
  status: 'confirmed' | 'artisan_packing' | 'loom_inspection' | 'dispatched' | 'delivered';
  trackingNumber: string;
  estimatedDeliveryDate: string;
  // Specific UPI payment fields requested by user
  utrNumber?: string;
  paymentPhone?: string; // e.g. '9334808340'
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  autoSync: boolean;
  lastSyncedAt?: string;
}
