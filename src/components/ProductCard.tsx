import React, { useState } from 'react';
import { Heart, Star, Eye, ShoppingBag, Check } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product, selectedSize?: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isWishlisted,
  onToggleWishlist,
  onQuickView,
  onAddToCart
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);

  const variants = product.colorVariants && product.colorVariants.length > 0 ? product.colorVariants : [];
  const activeVariant = variants[activeVariantIdx] || variants[0];
  const displayImage = activeVariant?.image || product.images[0] || '';
  const hasMultipleColors = variants.length > 1;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultSize = product.availableSizes?.[0] || 'Free Size';
    const sizeWithColor = hasMultipleColors && activeVariant?.colorName
      ? `${defaultSize} · ${activeVariant.colorName}`
      : undefined;
    onAddToCart(product, sizeWithColor);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <div
      onClick={() => onQuickView(product)}
      className="group relative bg-white border border-[#E8E8E8] hover:border-[#9F2089]/40 hover:shadow-md rounded-md transition-all duration-200 cursor-pointer flex flex-col h-full overflow-hidden"
    >
      {/* 3:4 Aspect Ratio Product Image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#FAF8F5]">
        {/* Deal Badge: Top-Left */}
        {product.discountPercent > 0 && (
          <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 bg-[#9F2089] text-white text-[10px] font-bold rounded shadow-2xs">
            {product.discountPercent}% OFF
          </div>
        )}

        {/* Color count badge when product has multiple color variants */}
        {hasMultipleColors && (
          <div className="absolute bottom-2 left-2 sm:group-hover:opacity-0 transition-opacity z-10 px-1.5 py-0.5 bg-white/95 text-[#222222] border border-[#E8E8E8] text-[9px] font-bold rounded shadow-2xs flex items-center gap-1">
            <span className="flex -space-x-1">
              {variants.slice(0, 4).map((v, i) => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full border border-white"
                  style={{ backgroundColor: v.colorHex || '#6B1426' }}
                />
              ))}
            </span>
            <span>{variants.length} Colors</span>
          </div>
        )}

        {/* Wishlist Heart: Top-Right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product);
          }}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/90 text-[#444444] hover:text-[#9F2089] transition-colors shadow-2xs active:scale-90"
          title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-label="Toggle wishlist"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isWishlisted ? 'fill-[#9F2089] text-[#9F2089]' : 'text-[#555555]'
            }`}
          />
        </button>

        {/* Product Image */}
        {!imageError && displayImage ? (
          <img
            src={displayImage}
            alt={product.title}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAF8F5] text-[#9F2089] p-4 text-center">
            <span className="font-bold text-xs">{product.artisanCluster}</span>
            <span className="text-[11px] text-[#666666] mt-1">{product.fabric}</span>
          </div>
        )}

        {/* Desktop Quick Action Strip on Hover */}
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="flex-1 py-1.5 px-2 bg-white text-[#222222] text-xs font-bold rounded hover:bg-[#FAF8F5] transition-colors flex items-center justify-center gap-1 shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Quick Preview</span>
          </button>

          <button
            onClick={handleAdd}
            className={`py-1.5 px-3 text-xs font-bold rounded transition-colors flex items-center justify-center gap-1 shadow-xs ${
              justAdded
                ? 'bg-[#038D63] text-white'
                : 'bg-[#9F2089] hover:bg-[#80182E] text-white'
            }`}
            title="Add to cart"
          >
            {justAdded ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <ShoppingBag className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Marhaba Card Meta Details */}
      <div className="p-3 flex flex-col flex-1 justify-between gap-1">
        <div>
          {/* Provenance / Supplier Tag */}
          <div className="flex items-center justify-between text-[10px] text-[#777777] font-semibold uppercase tracking-wider">
            <span className="truncate">{product.supplierName || product.provenanceTag}</span>
            {product.mTrusted && (
              <span className="text-[9px] bg-[#9F2089]/10 text-[#9F2089] font-bold px-1 rounded shrink-0">
                Marhaba Trusted
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            className="text-xs sm:text-sm font-medium text-[#222222] line-clamp-1 mt-1 group-hover:text-[#9F2089] transition-colors"
            title={product.title}
          >
            {product.title}
          </h3>

          {/* Interactive Color Swatches for Same Product Multi-Color Variants */}
          {hasMultipleColors && (
            <div
              className="flex items-center gap-1.5 mt-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              {variants.slice(0, 5).map((v, idx) => {
                const isActive = activeVariantIdx === idx;
                return (
                  <button
                    key={`${v.colorName}-${idx}`}
                    type="button"
                    onClick={() => {
                      setImageError(false);
                      setActiveVariantIdx(idx);
                    }}
                    onMouseEnter={() => {
                      setImageError(false);
                      setActiveVariantIdx(idx);
                    }}
                    title={v.colorName}
                    className={`w-4 h-4 rounded-full border transition-transform ${
                      isActive
                        ? 'ring-2 ring-[#9F2089] ring-offset-1 border-white scale-110'
                        : 'border-black/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: v.colorHex || '#6B1426' }}
                    aria-label={`Color ${v.colorName}`}
                  />
                );
              })}
              {variants.length > 5 && (
                <span className="text-[10px] text-[#666666] font-semibold">
                  +{variants.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          {/* Price Row: Bold Price + Strikethrough + Discount */}
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-base sm:text-lg font-black text-[#222222] tabular-nums">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-[#888888] line-through tabular-nums">
              ₹{product.originalPrice.toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-bold text-[#038D63]">
              {product.discountPercent}% off
            </span>
          </div>

          {/* Delivery & Rating Row */}
          <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-[#F0F0F0] text-[11px]">
            {/* Free Delivery */}
            <span className="text-[#666666] font-medium text-[11px]">
              {product.freeDelivery ? 'Free Delivery' : 'Standard Shipping'}
            </span>

            {/* Signature Green Rating Pill */}
            <div className="flex items-center gap-1 font-bold">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#038D63] text-white rounded text-[10px] font-bold">
                {product.rating} <Star className="w-2.5 h-2.5 fill-white text-white" />
              </span>
              <span className="text-[#888888] text-[10px]">({product.reviewCount})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
