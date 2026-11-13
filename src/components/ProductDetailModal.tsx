import React, { useState } from 'react';
import { 
  X, Heart, Star, ShieldCheck, Truck, RotateCcw, Check, Share2, 
  Store, Copy, Ruler, MessageSquare, ChevronRight, ThumbsUp
} from 'lucide-react';
import { Product } from '../types';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
  onAddToCart: (product: Product, selectedSize: string) => void;
  onBuyNow: (product: Product, selectedSize: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  isWishlisted,
  onToggleWishlist,
  onAddToCart,
  onBuyNow
}) => {
  if (!isOpen || !product) return null;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>(
    product.availableSizes && product.availableSizes.length > 0
      ? product.availableSizes[0]
      : 'Free Size'
  );
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<'idle' | 'checking' | 'verified' | 'error'>('idle');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [isFollowingSupplier, setIsFollowingSupplier] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');

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

  const handleAddToCart = () => {
    onAddToCart(product, selectedSize);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div
        className="relative bg-white w-full max-w-5xl rounded-lg shadow-2xl border border-[#E8E8E8] overflow-hidden my-auto max-h-[94vh] flex flex-col text-[#222222]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Product Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#E8E8E8] bg-[#FAF8F5]">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-[#9F2089] uppercase tracking-wider">
              {product.supplierName || product.provenanceTag}
            </span>
            <span className="text-[#CCCCCC]">·</span>
            <span className="text-[#666666]">{product.categoryLabel}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyCode}
              className="text-[11px] font-semibold text-[#666666] hover:text-[#9F2089] flex items-center gap-1 bg-white border border-[#CCCCCC] px-2 py-1 rounded"
              title="Copy Marhaba Product Code"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedCode ? 'Code Copied!' : `Code: ${productCode}`}</span>
            </button>

            <button
              onClick={handleShare}
              className="text-[11px] font-semibold text-[#666666] hover:text-[#9F2089] flex items-center gap-1 bg-white border border-[#CCCCCC] px-2 py-1 rounded"
              title="Share Product"
            >
              <Share2 className="w-3 h-3" />
              <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#666666] hover:text-[#222222] rounded-full hover:bg-black/5 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
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
                      Marhaba Trusted
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
                    className={`py-2 px-3 border-b-2 transition-colors ${
                      activeTab === 'reviews'
                        ? 'border-[#9F2089] text-[#9F2089]'
                        : 'border-transparent text-[#666666]'
                    }`}
                  >
                    Ratings & Reviews ({product.reviews?.length || 2})
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
                    {/* Rating Breakdown Bar Chart */}
                    <div className="p-3 bg-[#FAF8F5] rounded border border-[#E8E8E8] space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 font-bold text-sm text-[#222222]">
                        <span className="text-base text-[#038D63] font-black">{product.rating} ★</span>
                        <span>Overall Customer Rating</span>
                      </div>

                      <div className="space-y-1 text-[11px] text-[#666666]">
                        <div className="flex items-center gap-2">
                          <span className="w-8">5 ★</span>
                          <div className="flex-1 bg-[#E8E8E8] h-2 rounded-full overflow-hidden">
                            <div className="bg-[#038D63] h-full w-[72%]" />
                          </div>
                          <span className="w-8 text-right font-medium">72%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-8">4 ★</span>
                          <div className="flex-1 bg-[#E8E8E8] h-2 rounded-full overflow-hidden">
                            <div className="bg-[#038D63] h-full w-[18%]" />
                          </div>
                          <span className="w-8 text-right font-medium">18%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-8">3 ★</span>
                          <div className="flex-1 bg-[#E8E8E8] h-2 rounded-full overflow-hidden">
                            <div className="bg-[#FECE57] h-full w-[7%]" />
                          </div>
                          <span className="w-8 text-right font-medium">7%</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Review List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {(product.reviews || []).map((rev) => (
                        <div key={rev.id} className="p-2.5 bg-white border border-[#E8E8E8] rounded text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-[#038D63] text-white font-bold px-1 py-0.2 rounded text-[10px]">
                                {rev.rating} ★
                              </span>
                              <span className="font-bold text-[#222222]">{rev.userName}</span>
                              <span className="text-[10px] text-[#888888]">· {rev.location}</span>
                            </div>
                            <span className="text-[10px] text-[#888888]">{rev.date}</span>
                          </div>
                          <p className="text-[#555555]">{rev.comment}</p>
                          {rev.reviewImage && (
                            <img
                              src={rev.reviewImage}
                              alt="Customer review photo"
                              className="w-14 h-14 object-cover rounded border border-[#E8E8E8] mt-1"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </div>
                      ))}
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
                onClick={() => onBuyNow(product, selectedSize)}
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
                <h4 className="font-bold text-sm text-[#222222]">Marhaba Collection Size & Measurement Guide</h4>
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
