import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, Tag, ShieldCheck, ArrowRight, ShoppingBag } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, selectedSize: string, delta: number) => void;
  onRemoveItem: (productId: string, selectedSize: string) => void;
  onProceedToCheckout: (couponDiscount: number, appliedCode: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout
}) => {
  if (!isOpen) return null;

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>('RAZVI10');
  const [couponError, setCouponError] = useState<string | null>(null);

  const subtotalMRP = items.reduce(
    (sum, item) => sum + item.product.originalPrice * item.quantity,
    0
  );
  const itemsTotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const directSavings = subtotalMRP - itemsTotal;

  // Calculate coupon discount
  let couponDiscount = 0;
  if (appliedCoupon === 'RAZVI10' || appliedCoupon === 'MARHABA10') {
    couponDiscount = Math.round(itemsTotal * 0.1);
  } else if (appliedCoupon === 'WEAVER200') {
    couponDiscount = itemsTotal >= 1500 ? 200 : 0;
  }

  const freeDeliveryThreshold = 999;
  const isFreeDelivery = itemsTotal >= freeDeliveryThreshold;
  const deliveryFee = items.length === 0 ? 0 : isFreeDelivery ? 0 : 99;
  const finalTotal = Math.max(0, itemsTotal - couponDiscount + deliveryFee);

  const handleApplyCoupon = (codeToApply?: string) => {
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (code === 'RAZVI10' || code === 'MARHABA10') {
      setAppliedCoupon('RAZVI10');
      setCouponError(null);
    } else if (code === 'WEAVER200') {
      if (itemsTotal < 1500) {
        setCouponError('WEAVER200 requires minimum cart value of ₹1,500');
        return;
      }
      setAppliedCoupon('WEAVER200');
      setCouponError(null);
    } else {
      setCouponError('Invalid coupon code. Try RAZVI10 or WEAVER200');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div
        className="w-full max-w-md bg-[#FAF8F5] h-full shadow-2xl flex flex-col border-l border-[#EFEAE2] animate-slideLeft"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-[#EFEAE2]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#9F2089]" />
            <h2 className="font-editorial text-lg font-semibold text-[#111C2D]">
              Shopping Bag ({items.reduce((acc, i) => acc + i.quantity, 0)})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#554243] hover:text-[#111C2D] rounded-full hover:bg-black/5"
            aria-label="Close bag"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Progress Strip */}
        <div className="bg-[#FAF8F5] px-5 py-2.5 border-b border-[#EFEAE2]">
          {isFreeDelivery ? (
            <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
              <span>🎉 Congratulations! You have unlocked Free Pan-India Delivery.</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-xs text-[#554243] flex items-center justify-between">
                <span>
                  Add <strong>₹{(freeDeliveryThreshold - itemsTotal).toLocaleString('en-IN')}</strong> more for Free Shipping
                </span>
                <span className="font-bold text-[#6B1426]">
                  {Math.round((itemsTotal / freeDeliveryThreshold) * 100)}%
                </span>
              </div>
              <div className="w-full bg-[#E2DCD5] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#6B1426] h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (itemsTotal / freeDeliveryThreshold) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#554243]">
              <div className="w-16 h-16 rounded-full bg-[#EFEAE2] flex items-center justify-center mb-3">
                <ShoppingBag className="w-8 h-8 text-[#887173]" />
              </div>
              <h3 className="font-editorial text-lg font-semibold text-[#111C2D] mb-1">
                Your Bag is Empty
              </h3>
              <p className="text-xs text-[#554243] max-w-xs mb-4">
                Explore our handloom silks, bridal lehengas, and royal ethnic attire direct from weavers.
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-[#6B1426] text-white text-xs font-semibold rounded hover:bg-[#80182E] transition-colors"
              >
                Start Exploring
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.product.id}-${item.selectedSize}`}
                className="bg-white p-3 rounded border border-[#EFEAE2] flex gap-3 shadow-xs"
              >
                {/* Thumbnail */}
                <div className="w-20 h-24 rounded overflow-hidden bg-[#FAF8F5] shrink-0 border border-[#EFEAE2] flex items-center justify-center">
                  {item.product.images[0] ? (
                    <img
                      src={item.product.images[0]}
                      alt={item.product.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <ShoppingBag className="w-6 h-6 text-[#CCCCCC]" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-[#C59B27] uppercase tracking-wider">
                      {item.product.provenanceTag}
                    </div>
                    <h4 className="text-xs font-semibold text-[#111C2D] line-clamp-1">
                      {item.product.title}
                    </h4>
                    <div className="text-[11px] text-[#887173] mt-0.5">
                      Size/Option: <strong>{item.selectedSize}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {/* Quantity controls */}
                    <div className="flex items-center border border-[#E2DCD5] rounded bg-[#FAF8F5]">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.selectedSize, -1)}
                        className="p-1 text-[#554243] hover:text-[#111C2D]"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold text-[#111C2D] tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.selectedSize, 1)}
                        className="p-1 text-[#554243] hover:text-[#111C2D]"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-[#111C2D] tabular-nums">
                        ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-[#887173] line-through tabular-nums">
                        ₹{(item.product.originalPrice * item.quantity).toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => onRemoveItem(item.product.id, item.selectedSize)}
                      className="text-[#887173] hover:text-red-700 p-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Coupon Code Section */}
          {items.length > 0 && (
            <div className="bg-white p-3 rounded border border-[#EFEAE2] space-y-2">
              <div className="text-xs font-bold text-[#111C2D] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#C59B27]" />
                <span>Apply Promo Code / Weaver Voucher</span>
              </div>

              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2 rounded text-xs">
                  <div>
                    <span className="font-bold text-emerald-900">{appliedCoupon}</span>
                    <span className="text-emerald-700 ml-2">
                      (Saved ₹{couponDiscount.toLocaleString('en-IN')})
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Enter RAZVI10"
                      className="flex-1 px-3 py-1.5 text-xs border border-[#E2DCD5] rounded uppercase focus:border-[#6B1426] focus:outline-none"
                    />
                    <button
                      onClick={() => handleApplyCoupon()}
                      className="px-3 py-1.5 bg-[#FAF8F5] border border-[#E2DCD5] hover:border-[#C59B27] text-xs font-semibold rounded text-[#111C2D]"
                    >
                      Apply
                    </button>
                  </div>

                  {couponError && (
                    <div className="text-[11px] text-red-700">{couponError}</div>
                  )}

                  <div className="flex gap-1.5 pt-1">
                    <button
                      onClick={() => handleApplyCoupon('RAZVI10')}
                      className="text-[10px] bg-[#FAF8F5] text-[#775A00] border border-[#C59B27]/40 px-2 py-0.5 rounded font-medium"
                    >
                      Use RAZVI10 (10% off)
                    </button>
                    <button
                      onClick={() => handleApplyCoupon('WEAVER200')}
                      className="text-[10px] bg-[#FAF8F5] text-[#775A00] border border-[#C59B27]/40 px-2 py-0.5 rounded font-medium"
                    >
                      Use WEAVER200 (₹200 off)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bill Breakdown & Checkout Footer */}
        {items.length > 0 && (
          <div className="p-4 bg-white border-t border-[#EFEAE2] space-y-3">
            <div className="space-y-1.5 text-xs text-[#554243]">
              <div className="flex justify-between">
                <span>Total MRP (Boutique Valuation)</span>
                <span className="tabular-nums">₹{subtotalMRP.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-medium">
                <span>Direct Weaver Price Savings</span>
                <span className="tabular-nums">-₹{directSavings.toLocaleString('en-IN')}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-[#6B1426] font-medium">
                  <span>Coupon Discount ({appliedCoupon})</span>
                  <span className="tabular-nums">-₹{couponDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Pan-India Delivery</span>
                <span>
                  {deliveryFee === 0 ? (
                    <strong className="text-emerald-700">FREE</strong>
                  ) : (
                    `₹${deliveryFee}`
                  )}
                </span>
              </div>
              <div className="border-t border-[#EFEAE2] pt-2 flex justify-between text-sm font-extrabold text-[#111C2D]">
                <span>Total Payable</span>
                <span className="text-base text-[#4B0013] tabular-nums">
                  ₹{finalTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <button
              onClick={() => onProceedToCheckout(couponDiscount, appliedCoupon || '')}
              className="w-full py-3 bg-[#9F2089] hover:bg-[#80182E] text-white text-xs sm:text-sm font-bold rounded-md transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-[#887173]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C59B27]" />
              <span>Silk Mark Certified · 100% Cash on Delivery & Free Returns</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
