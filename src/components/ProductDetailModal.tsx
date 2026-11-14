import React, { useState, useEffect } from 'react';
import { 
  X, Heart, Star, ShieldCheck, Truck, Check, Share2, 
  Store, Copy, Ruler, ArrowLeft, Camera, CheckCircle2, RefreshCw
} from 'lucide-react';
import { Product, ProductReview, UserProfile } from '../types';
import { compressImageFile } from '../lib/imageCompressor';
import { createCompactReviewId } from '../lib/reviewCodec';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
  onAddToCart: (product: Product, selectedSize: string) => void;
  onBuyNow: (product: Product, selectedSize: string) => void;
  userProfile?: UserProfile | null;
  onSubmitReview?: (productId: string, review: ProductReview) => Promise<boolean> | void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  isWishlisted,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
  userProfile,
  onSubmitReview
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('Free Size');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<'idle' | 'checking' | 'verified' | 'error'>('idle');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [isFollowingSupplier, setIsFollowingSupplier] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewName, setReviewName] = useState('');
  const [reviewLocation, setReviewLocation] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImage, setReviewImage] = useState('');
  const [reviewCompressing, setReviewCompressing] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccessNotice, setReviewSuccessNotice] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      setActiveImageIndex(0);
      setSelectedSize(
        product.availableSizes && product.availableSizes.length > 0
          ? product.availableSizes[0]
          : 'Free Size'
      );
      setSelectedColor(
        product.colorVariants && product.colorVariants.length > 0
          ? product.colorVariants[0].colorName
          : product.color || ''
      );
      setActiveTab('details');
      setShowSizeChart(false);
      setPincodeStatus('idle');
      setShowReviewForm(false);
      setReviewRating(5);
      setReviewName(userProfile?.fullName || '');
      setReviewLocation(userProfile ? `${userProfile.city}${userProfile.state ? `, ${userProfile.state}` : ''}` : '');
      setReviewComment('');
      setReviewImage('');
      setReviewSuccessNotice(null);
      setReviewError(null);
    }
  }, [isOpen, product?.id, userProfile?.fullName, userProfile?.city, userProfile?.state]);

  if (!isOpen || !product) return null;

  const productCode = `s-${product.id.replace('prod-', '')}894`;

  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (pincode.trim().length === 6 && /^\d+$/.test(pincode.trim())) {
      setPincodeStatus('checking');
      setTimeout(() => {
        setPincodeStatus('verified');
      }, 350);
    } else {
      setPincodeStatus('error');
    }
  };

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(productCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const variants = product.colorVariants && product.colorVariants.length > 0 ? product.colorVariants : [];
  const hasMultipleColors = variants.length > 1;
  const effectiveSizeLabel =
    hasMultipleColors && selectedColor ? `${selectedSize} · ${selectedColor}` : selectedSize;

  const handleSelectColorVariant = (colorName: string, variantImage: string) => {
    setSelectedColor(colorName);
    const imgIdx = product.images.findIndex((img) => img === variantImage);
    if (imgIdx >= 0) {
      setActiveImageIndex(imgIdx);
    }
  };

  const handleAddToCart = () => {
    onAddToCart(product, effectiveSizeLabel);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 2000);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError(null);
    const cleanName = reviewName.trim() || userProfile?.fullName || 'Customer';
    const cleanComment = reviewComment.trim();
    if (!cleanComment) {
      setReviewError('Kripya product ke baare me apna review likhein.');
      return;
    }

    const newReview: ProductReview = {
      id: createCompactReviewId(),
      productId: product.id,
      categoryId: product.category,
      userName: cleanName,
      location: reviewLocation.trim() || 'India',
      rating: reviewRating,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      comment: cleanComment,
      verified: true,
      reviewImage: reviewImage || undefined
    };

    setReviewSubmitting(true);
    try {
      if (onSubmitReview) {
        await onSubmitReview(product.id, newReview);
      }
      setReviewComment('');
      setReviewImage('');
      setShowReviewForm(false);
      setReviewSuccessNotice('Shukriya! Aapka review aur star rating save ho gaya hai.');
      setTimeout(() => setReviewSuccessNotice(null), 4000);
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-5xl h-full sm:h-auto sm:max-h-[94vh] rounded-none sm:rounded-lg shadow-2xl border-0 sm:border border-[#E8E8E8] overflow-hidden my-auto flex flex-col text-[#222222]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Product Modal Header — Compact & Phone-Friendly with Clear Back Button */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-2.5 border-b border-[#E8E8E8] bg-[#FAF8F5] shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-[#DDDDDD] hover:border-[#9F2089] text-[#222222] hover:text-[#9F2089] text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="min-w-0 flex items-center gap-1.5 text-[11px] sm:text-xs">
              <span className="font-bold text-[#9F2089] uppercase tracking-wide truncate">
                {product.supplierName || product.provenanceTag}
              </span>
              <span className="hidden sm:inline text-[#CCCCCC] shrink-0">·</span>
              <span className="hidden sm:inline text-[#666666] truncate">{product.categoryLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyCode}
              className="text-[10px] sm:text-[11px] font-semibold text-[#666666] hover:text-[#9F2089] flex items-center gap-1 bg-white border border-[#CCCCCC] px-2 py-1 rounded whitespace-nowrap cursor-pointer"
              title={`Copy RAZVI SHOP Product Code (${productCode})`}
            >
              <Copy className="w-3 h-3 shrink-0" />
              <span className="sm:hidden">{copiedCode ? 'Copied!' : 'Code'}</span>
              <span className="hidden sm:inline">{copiedCode ? 'Code Copied!' : `Code: ${productCode}`}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="text-[10px] sm:text-[11px] font-semibold text-[#666666] hover:text-[#9F2089] flex items-center gap-1 bg-white border border-[#CCCCCC] px-2 py-1 rounded whitespace-nowrap cursor-pointer"
              title="Share Product"
            >
              <Share2 className="w-3 h-3 shrink-0" />
              <span>{copiedLink ? 'Copied!' : 'Share'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[#666666] hover:text-[#222222] rounded-full hover:bg-black/5 transition-colors shrink-0 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 p-3.5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
          {/* LEFT COLUMN: Enhanced Gallery & Thumbnails (5 cols) */}
          <div className="md:col-span-5 space-y-3">
            {/* Main Stage Image */}
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#FAF8F5] border border-[#E8E8E8] group flex items-center justify-center">
              {(product.images[activeImageIndex] || product.images[0]) ? (
                <img
                  src={product.images[activeImageIndex] || product.images[0]}
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center p-6 text-[#9F2089]">
                  <div className="font-bold text-sm">{product.artisanCluster}</div>
                  <div className="text-xs text-[#666666] mt-1">{product.fabric}</div>
                </div>
              )}

              {/* Deal Badge */}
              <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-[#9F2089] text-white text-xs font-bold rounded shadow-xs">
                {product.discountPercent}% OFF
              </div>

              {/* Wishlist Toggle Button */}
              <button
                onClick={() => onToggleWishlist(product)}
                className="absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md bg-white/90 text-[#444444] hover:text-[#9F2089] shadow-xs active:scale-90 transition-transform"
                title={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <Heart
                  className={`w-5 h-5 ${
                    isWishlisted ? 'fill-[#9F2089] text-[#9F2089]' : 'text-[#444444]'
                  }`}
                />
              </button>
            </div>

            {/* Thumbnail Row */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-16 h-20 rounded overflow-hidden border-2 shrink-0 transition-all ${
                      activeImageIndex === idx
                        ? 'border-[#9F2089] ring-2 ring-[#9F2089]/20'
                        : 'border-[#E8E8E8] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`View ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Verified Supplier Info Box */}
            <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#E8E8E8] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#9F2089]/10 text-[#9F2089] flex items-center justify-center font-bold text-xs">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#222222]">
                      {product.supplierName || 'Varanasi Direct Loom Guild'}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#666666]">
                      <span className="bg-[#038D63] text-white font-bold px-1 py-0.2 rounded">
                        {product.rating} ★
                      </span>
                      <span>4,810 Ratings · 142 Products</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsFollowingSupplier(!isFollowingSupplier)}
                  className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                    isFollowingSupplier
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-white border border-[#9F2089] text-[#9F2089] hover:bg-[#FDE5F4]'
                  }`}
                >
                  {isFollowingSupplier ? 'Following' : '+ Follow'}
                </button>
              </div>

              <div className="text-[11px] text-[#666666] flex items-center gap-2 pt-1 border-t border-[#E8E8E8]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#038D63]" />
                <span>Verified GST & Silk Mark Registered Manufacturer</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Product Specifications & Purchase Details (7 cols) */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              {/* Product Title & Ratings */}
              <div>
                <h2 className="text-base sm:text-xl font-bold text-[#222222] leading-snug">
                  {product.title}
                </h2>

                <div className="flex items-center gap-3 mt-2">
                  {/* Signature Green Rating */}
                  <div className="flex items-center gap-1 font-bold text-white bg-[#038D63] px-2 py-0.5 rounded text-xs">
                    <span>{product.rating}</span>
                    <Star className="w-3 h-3 fill-white" />
                  </div>

                  <span className="text-xs text-[#666666] font-medium">
                    {product.reviewCount} Ratings, 384 Reviews
                  </span>

                  {product.mTrusted && (
                    <span className="text-[10px] bg-[#9F2089] text-white font-bold px-2 py-0.5 rounded">
                      Razvi Trusted
                    </span>
                  )}
                </div>
              </div>

              {/* Price & Value Cluster */}
              <div className="p-3.5 bg-[#FAF8F5] rounded-lg border border-[#E8E8E8]">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-black text-[#222222] tabular-nums">
                    ₹{product.price.toLocaleString('en-IN')}
                  </span>
                  <span className="text-sm text-[#888888] line-through tabular-nums">
                    ₹{product.originalPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-bold text-[#038D63] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    {product.discountPercent}% off
                  </span>
                </div>

                <div className="text-xs text-[#666666] mt-1.5 flex items-center gap-3">
                  <span className="text-[#038D63] font-bold">Free Delivery</span>
                  <span>·</span>
                  <span>Cash on Delivery Available</span>
                  <span>·</span>
                  <span>7-Day Return Policy</span>
                </div>
              </div>

              {/* Multi-Color Selector (when product has color variants) */}
              {variants.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#222222] mb-2">
                    <span>
                      Select Color:{' '}
                      <strong className="text-[#9F2089]">{selectedColor || product.color || 'Default'}</strong>
                    </span>
                    {hasMultipleColors && (
                      <span className="text-[10px] font-semibold text-[#038D63] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        {variants.length} Colors Available
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {variants.map((v, idx) => {
                      const isActive = (selectedColor || variants[0].colorName) === v.colorName;
                      return (
                        <button
                          key={`${v.colorName}-${idx}`}
                          type="button"
                          onClick={() => handleSelectColorVariant(v.colorName, v.image)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md border transition-all cursor-pointer ${
                            isActive
                              ? 'border-[#9F2089] bg-[#FDE5F4]/60 text-[#9F2089] font-bold ring-1 ring-[#9F2089]'
                              : 'border-[#CCCCCC] bg-white text-[#222222] hover:border-[#9F2089]'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: v.colorHex || '#6B1426' }}
                          />
                          <span>{v.colorName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selector with Size Chart */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#222222] mb-2">
                  <span>Select Size:</span>
                  <button
                    onClick={() => setShowSizeChart(true)}
                    className="text-[#9F2089] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>Size Chart</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(product.availableSizes && product.availableSizes.length > 0
                    ? product.availableSizes
                    : ['Free Size', 'S', 'M', 'L', 'XL']
                  ).map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-3 py-1.5 text-xs font-bold rounded border transition-all ${
                        selectedSize === size
                          ? 'bg-[#9F2089] text-white border-[#9F2089] shadow-xs'
                          : 'bg-white text-[#222222] border-[#CCCCCC] hover:border-[#9F2089]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pincode Delivery Estimator */}
              <div className="border border-[#E8E8E8] rounded-lg p-3 bg-white space-y-2">
                <div className="text-xs font-bold text-[#222222] flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#9F2089]" />
                  <span>Check Delivery Date & Cash on Delivery</span>
                </div>

                <form onSubmit={handlePincodeCheck} className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => {
                      setPincode(e.target.value);
                      setPincodeStatus('idle');
                    }}
                    placeholder="Enter 6-digit Pincode"
                    className="flex-1 px-3 py-1.5 text-xs border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#FAF8F5] border border-[#CCCCCC] hover:border-[#9F2089] text-xs font-bold rounded text-[#222222]"
                  >
                    Check
                  </button>
                </form>

                {pincodeStatus === 'verified' && (
                  <div className="text-[11px] text-[#038D63] font-medium flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Free Delivery by <strong>Tomorrow / Day After</strong> · COD Available!
                    </span>
                  </div>
                )}
                {pincodeStatus === 'error' && (
                  <div className="text-[11px] text-red-600">
                    Please enter a valid 6-digit postal code.
                  </div>
                )}
              </div>

              {/* Product Specifications Table */}
              <div>
                <div className="flex border-b border-[#E8E8E8] text-xs font-bold">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`py-2 px-3 border-b-2 transition-colors ${
                      activeTab === 'details'
                        ? 'border-[#9F2089] text-[#9F2089]'
                        : 'border-transparent text-[#666666]'
                    }`}
                  >
                    Product Details & Fabric
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${
                      activeTab === 'reviews'
                        ? 'border-[#9F2089] text-[#9F2089]'
                        : 'border-transparent text-[#666666]'
                    }`}
                  >
                    Ratings &amp; Reviews ({(product.reviews || []).length})
                  </button>
                </div>

                {activeTab === 'details' ? (
                  <div className="pt-3 space-y-3">
                    <p className="text-xs text-[#555555] leading-relaxed">
                      {product.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-[#FAF8F5] p-3 rounded border border-[#E8E8E8]">
                      <div>
                        <span className="text-[#888888] block text-[10px] font-bold uppercase">Fabric</span>
                        <span className="font-semibold text-[#222222]">{product.fabric}</span>
                      </div>
                      <div>
                        <span className="text-[#888888] block text-[10px] font-bold uppercase">Weave Type</span>
                        <span className="font-semibold text-[#222222]">{product.weaveType}</span>
                      </div>
                      <div>
                        <span className="text-[#888888] block text-[10px] font-bold uppercase">Blouse / Inclusions</span>
                        <span className="font-semibold text-[#222222]">{product.blousePiece}</span>
                      </div>
                      <div>
                        <span className="text-[#888888] block text-[10px] font-bold uppercase">Dimensions</span>
                        <span className="font-semibold text-[#222222]">{product.dimensions}</span>
                      </div>
                      <div>
                        <span className="text-[#888888] block text-[10px] font-bold uppercase">Country of Origin</span>
                        <span className="font-semibold text-[#222222]">India</span>
                      </div>
                      <div>
                        <span className="text-[#888888] block text-[10px] font-bold uppercase">Care</span>
                        <span className="font-semibold text-[#222222]">{product.care}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 space-y-3">
                    {/* Rating Summary & Rate Product Button */}
                    {(() => {
                      const revList = product.reviews || [];
                      const totalCount = revList.length;
                      const counts = [5, 4, 3, 2, 1].map((star) => ({
                        star,
                        pct:
                          totalCount > 0
                            ? Math.round(
                                (revList.filter((r) => Math.round(r.rating) === star).length / totalCount) * 100
                              )
                            : 0
                      }));

                      return (
                        <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#E8E8E8] space-y-2.5 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 font-bold text-sm text-[#222222]">
                                <span className="px-2 py-0.5 bg-[#038D63] text-white rounded text-sm font-black">
                                  {product.rating} ★
                                </span>
                                <span>
                                  {totalCount > 0
                                    ? `${totalCount} Verified Review${totalCount > 1 ? 's' : ''}`
                                    : `${product.reviewCount || 0} Ratings`}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowReviewForm((prev) => !prev)}
                              className="px-3 py-1.5 bg-[#9F2089] hover:bg-[#80182E] text-white font-bold text-[11px] rounded-md shadow-xs cursor-pointer transition-colors"
                            >
                              {showReviewForm ? 'Close Form' : '★ Rate & Review Product'}
                            </button>
                          </div>

                          <div className="space-y-1 text-[11px] text-[#666666]">
                            {counts.map(({ star, pct }) => (
                              <div key={star} className="flex items-center gap-2">
                                <span className="w-7 font-semibold">{star} ★</span>
                                <div className="flex-1 bg-[#E8E8E8] h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${
                                      star >= 4 ? 'bg-[#038D63]' : star === 3 ? 'bg-[#FECE57]' : 'bg-orange-500'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="w-8 text-right font-medium">{pct}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {reviewSuccessNotice && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{reviewSuccessNotice}</span>
                      </div>
                    )}

                    {/* Meesho-style Interactive Write a Review Form */}
                    {showReviewForm && (
                      <form
                        onSubmit={handleReviewSubmit}
                        className="p-3.5 bg-white border-2 border-[#9F2089]/30 rounded-lg space-y-3 text-xs animate-fadeIn"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#222222]">
                            Rate this Product (Tap Stars):
                          </span>
                          <span className="text-[11px] font-bold text-[#038D63]">
                            {['Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'][(hoverRating || reviewRating) - 1]}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const active = star <= (hoverRating ?? reviewRating);
                            return (
                              <button
                                key={star}
                                type="button"
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(null)}
                                onClick={() => setReviewRating(star)}
                                className="p-1 focus:outline-none cursor-pointer transition-transform hover:scale-110"
                                aria-label={`Rate ${star} stars`}
                              >
                                <Star
                                  className={`w-6 h-6 ${
                                    active ? 'fill-[#038D63] text-[#038D63]' : 'text-[#CCCCCC]'
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            value={reviewName}
                            onChange={(e) => setReviewName(e.target.value)}
                            placeholder="Your Name *"
                            className="px-2.5 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none text-xs"
                          />
                          <input
                            type="text"
                            value={reviewLocation}
                            onChange={(e) => setReviewLocation(e.target.value)}
                            placeholder="City / State (e.g. Kishanganj)"
                            className="px-2.5 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none text-xs"
                          />
                        </div>

                        <textarea
                          rows={2}
                          required
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Apna experience likhein (kapda quality, design, fitting kaisa laga)..."
                          className="w-full px-2.5 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none text-xs resize-none"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FAF8F5] border border-[#CCCCCC] hover:border-[#9F2089] rounded text-[11px] font-semibold text-[#444444] cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setReviewCompressing(true);
                                try {
                                  const res = await compressImageFile(file, 360, 360, 0.55, 6);
                                  setReviewImage(res.dataUrl);
                                } finally {
                                  setReviewCompressing(false);
                                }
                              }}
                            />
                            {reviewCompressing ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#9F2089]" />
                            ) : (
                              <Camera className="w-3.5 h-3.5 text-[#9F2089]" />
                            )}
                            <span>{reviewImage ? 'Photo Added ✓' : 'Add Photo (Optional)'}</span>
                          </label>

                          <button
                            type="submit"
                            disabled={reviewSubmitting}
                            className="px-4 py-1.5 bg-[#9F2089] hover:bg-[#80182E] text-white font-bold rounded text-xs disabled:opacity-50 cursor-pointer"
                          >
                            {reviewSubmitting ? 'Saving...' : 'Submit Review'}
                          </button>
                        </div>

                        {reviewImage && (
                          <div className="flex items-center gap-2">
                            <img
                              src={reviewImage}
                              alt="Review upload preview"
                              className="w-12 h-12 object-cover rounded border border-[#E8E8E8]"
                            />
                            <button
                              type="button"
                              onClick={() => setReviewImage('')}
                              className="text-[11px] text-red-600 font-semibold hover:underline"
                            >
                              Remove Photo
                            </button>
                          </div>
                        )}

                        {reviewError && <p className="text-[11px] text-red-600">{reviewError}</p>}
                      </form>
                    )}

                    {/* Customer Review List */}
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {(product.reviews || []).length === 0 ? (
                        <div className="p-4 text-center bg-white border border-[#E8E8E8] rounded text-xs text-[#666666]">
                          Abhi tak koi review nahi hai — pehla review aur rating aap dein!
                        </div>
                      ) : (
                        (product.reviews || []).map((rev) => (
                          <div key={rev.id} className="p-2.5 bg-white border border-[#E8E8E8] rounded text-xs space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="bg-[#038D63] text-white font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0">
                                  {rev.rating} ★
                                </span>
                                <span className="font-bold text-[#222222] truncate">{rev.userName}</span>
                                <span className="text-[10px] text-[#888888] truncate">· {rev.location}</span>
                              </div>
                              <span className="text-[10px] text-[#888888] shrink-0">{rev.date}</span>
                            </div>
                            <p className="text-[#444444] leading-relaxed">{rev.comment}</p>
                            {rev.reviewImage && (
                              <img
                                src={rev.reviewImage}
                                alt="Customer review photo"
                                className="w-14 h-14 object-cover rounded border border-[#E8E8E8] mt-1"
                                referrerPolicy="no-referrer"
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

            {/* Bottom Actions: Add to Cart & Buy Now */}
            <div className="pt-4 border-t border-[#E8E8E8] flex flex-col sm:flex-row items-stretch gap-3">
              <button
                onClick={handleAddToCart}
                className={`flex-1 py-3 px-4 text-xs sm:text-sm font-bold rounded transition-all flex items-center justify-center gap-2 shadow-xs ${
                  addedAnimation
                    ? 'bg-[#038D63] text-white'
                    : 'bg-white border-2 border-[#9F2089] text-[#9F2089] hover:bg-[#FDE5F4]'
                }`}
              >
                {addedAnimation ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <span>Add to Cart</span>
                )}
              </button>

              <button
                onClick={() => onBuyNow(product, effectiveSizeLabel)}
                className="flex-1 py-3 px-4 bg-[#9F2089] hover:bg-[#80182E] text-white text-xs sm:text-sm font-bold rounded shadow-md active:scale-98 flex items-center justify-center gap-2 transition-all"
              >
                <span>Buy Now (Instant Checkout)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Size Chart Modal Popup */}
        {showSizeChart && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-5 max-w-md w-full border border-[#E8E8E8] shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-2">
                <h4 className="font-bold text-sm text-[#222222]">RAZVI SHOP Size &amp; Measurement Guide</h4>
                <button onClick={() => setShowSizeChart(false)} className="text-[#666666]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border">
                  <thead className="bg-[#FAF8F5] text-[#222222] font-bold">
                    <tr>
                      <th className="p-2 border">Size</th>
                      <th className="p-2 border">Bust (in)</th>
                      <th className="p-2 border">Waist (in)</th>
                      <th className="p-2 border">Length (in)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="p-2 border font-bold">S</td><td className="p-2 border">36</td><td className="p-2 border">32</td><td className="p-2 border">48</td></tr>
                    <tr><td className="p-2 border font-bold">M</td><td className="p-2 border">38</td><td className="p-2 border">34</td><td className="p-2 border">48</td></tr>
                    <tr><td className="p-2 border font-bold">L</td><td className="p-2 border">40</td><td className="p-2 border">36</td><td className="p-2 border">50</td></tr>
                    <tr><td className="p-2 border font-bold">XL</td><td className="p-2 border">42</td><td className="p-2 border">38</td><td className="p-2 border">50</td></tr>
                    <tr><td className="p-2 border font-bold">Free Size</td><td className="p-2 border">Up to 44</td><td className="p-2 border">Adjustable</td><td className="p-2 border">Full 6.3m</td></tr>
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-[#666666]">
                All ethnic sarees and lehengas include unstitched/semi-stitched fabric pieces that can be tailored to your custom measurements.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
