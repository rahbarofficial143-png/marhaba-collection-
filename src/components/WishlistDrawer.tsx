import React from 'react';
import { X, Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { Product } from '../types';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wishlist: Product[];
  onRemoveFromWishlist: (productId: string) => void;
  onMoveToCart: (product: Product) => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  onClose,
  wishlist,
  onRemoveFromWishlist,
  onMoveToCart
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div
        className="w-full max-w-md bg-[#FAF8F5] h-full shadow-2xl flex flex-col border-l border-[#EFEAE2] animate-slideLeft"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-[#EFEAE2]">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#6B1426] fill-[#6B1426]" />
            <h2 className="font-editorial text-lg font-semibold text-[#111C2D]">
              Saved Creations ({wishlist.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#554243] hover:text-[#111C2D] rounded-full hover:bg-black/5"
            aria-label="Close wishlist"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {wishlist.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#554243]">
              <div className="w-16 h-16 rounded-full bg-[#EFEAE2] flex items-center justify-center mb-3">
                <Heart className="w-8 h-8 text-[#887173]" />
              </div>
              <h3 className="font-editorial text-lg font-semibold text-[#111C2D] mb-1">
                Your Wishlist is Empty
              </h3>
              <p className="text-xs text-[#554243] max-w-xs mb-4">
                Tap the heart on any handloom creation to save it here for later.
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-[#6B1426] text-white text-xs font-semibold rounded hover:bg-[#80182E] transition-colors"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            wishlist.map((product) => (
              <div
                key={product.id}
                className="bg-white p-3 rounded border border-[#EFEAE2] flex gap-3 shadow-xs"
              >
                {/* Thumbnail */}
                <div className="w-20 h-24 rounded overflow-hidden bg-[#FAF8F5] shrink-0 border border-[#EFEAE2] flex items-center justify-center">
                  {product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Heart className="w-6 h-6 text-[#CCCCCC]" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-[#C59B27] uppercase tracking-wider">
                      {product.provenanceTag}
                    </div>
                    <h4 className="text-xs font-semibold text-[#111C2D] line-clamp-1">
                      {product.title}
                    </h4>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xs font-extrabold text-[#111C2D] tabular-nums">
                        ₹{product.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-[#887173] line-through tabular-nums">
                        ₹{product.originalPrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => onMoveToCart(product)}
                      className="px-3 py-1.5 bg-[#6B1426] hover:bg-[#80182E] text-white text-[11px] font-semibold rounded transition-colors flex items-center gap-1.5"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      <span>Move to Bag</span>
                    </button>

                    <button
                      onClick={() => onRemoveFromWishlist(product.id)}
                      className="text-[#887173] hover:text-red-700 p-1"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
