import React, { useState, useRef } from 'react';
import { Search, Heart, ShoppingBag, Smartphone, Store, User, X, Sparkles, Download, CheckCircle2, Share, MoreVertical, RefreshCw } from 'lucide-react';
import { Category } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (catId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  wishlistCount: number;
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onTriggerAdminLogin: () => void;
  onOpenArtisans: () => void;
  onOpenTracking: () => void;
  onOpenProfile: () => void;
  userName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  wishlistCount,
  cartCount,
  cartTotal,
  onOpenCart,
  onOpenWishlist,
  onTriggerAdminLogin,
  onOpenArtisans,
  onOpenTracking,
  onOpenProfile,
  userName
}) => {
  const [showAppPrompt, setShowAppPrompt] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);
  const clickCountRef = useRef(0);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const handleMobileAppClick = async () => {
    setInstallFeedback(null);
    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'accepted') {
        setInstallFeedback('RAZVI SHOP App is being installed on your device!');
        return;
      }
    }
    setShowAppPrompt(true);
  };

  // 5 consecutive clicks on "RAZVI SHOP" logo opens the Admin Login modal
  const handleLogoClick = () => {
    onSelectCategory('all');
    const next = clickCountRef.current + 1;
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    if (next >= 5) {
      clickCountRef.current = 0;
      onTriggerAdminLogin();
      return;
    }
    clickCountRef.current = next;
    clickTimeoutRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 3000);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E8E8E8] shadow-xs">
      {/* Top Utilities Strip */}
      <div className="bg-[#FAF8F5] border-b border-[#E8E8E8] text-[11px] text-[#555555] py-1.5 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 font-semibold text-[#038D63]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Lowest Prices Every Day · Free Delivery & UPI / PhonePe (9334808340)</span>
            </span>
          </div>

          <div className="flex items-center gap-5">
            {!isInstalled && (
              <button
                onClick={handleMobileAppClick}
                className="text-[#9F2089] hover:text-[#4B0013] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Mobile App</span>
              </button>
            )}
            <span className="text-[#DDDDDD]">|</span>
            <button
              onClick={onOpenArtisans}
              className="hover:text-[#9F2089] flex items-center gap-1 transition-colors"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Master Weavers Guild</span>
            </button>
            <span className="text-[#DDDDDD]">|</span>
            <button
              onClick={onOpenTracking}
              className="hover:text-[#9F2089] transition-colors"
            >
              Track Order
            </button>
            <span className="text-[#DDDDDD]">|</span>
            <span className="text-[10px] text-[#888888]">
              Owner Helpline: <strong className="text-[#9F2089]">9334808340</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand: RAZVI SHOP with 5-Click Secret Admin Doorway */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 text-left focus:outline-none group select-none relative cursor-pointer"
            title="RAZVI SHOP"
          >
            <img
              src="/rz-icon-192.png"
              alt="RAZVI SHOP Logo"
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-contain shrink-0 shadow-xs"
            />
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="font-editorial text-xl sm:text-3xl font-bold tracking-tight text-[#4B0013] group-hover:text-[#9F2089] transition-colors leading-none">
                  RAZVI
                </span>
                <span className="text-lg sm:text-2xl font-light text-[#9F2089] tracking-tight leading-none">
                  SHOP
                </span>
              </div>
              <span className="text-[9px] font-bold text-[#C59B27] tracking-widest uppercase mt-0.5">
                Haute Handloom &amp; Direct Looms
              </span>
            </div>
          </button>
        </div>

        {/* Global Search Input */}
        <div className="relative flex-1 max-w-xl hidden sm:block">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#888888] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search Sarees, Lehengas, Kurti, Banarasi Silk or Product Code..."
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-white border border-[#CCCCCC] rounded-md focus:border-[#9F2089] focus:ring-1 focus:ring-[#9F2089] focus:outline-none transition-all placeholder:text-[#999999]"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 text-[#888888] hover:text-[#222222]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
          {/* Mobile Install App Button (visible on mobile when not yet installed) */}
          {!isInstalled && (
            <button
              onClick={handleMobileAppClick}
              className="md:hidden flex items-center gap-1 text-[11px] font-bold text-[#9F2089] bg-[#FDE5F4] border border-[#9F2089]/30 px-2 py-1 rounded"
              title="Install RAZVI SHOP Mobile App"
            >
              <Download className="w-3.5 h-3.5" />
              <span>App</span>
            </button>
          )}

          {/* Profile & My Orders (Visible on both Mobile & Desktop) */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex flex-col items-center cursor-pointer group text-[#444444] hover:text-[#9F2089] transition-colors focus:outline-none"
            aria-label="Profile and My Orders"
          >
            <User className="w-5 h-5" />
            <span className="text-[11px] font-medium mt-0.5 max-w-[68px] truncate">
              {userName ? userName.split(' ')[0] : 'Profile'}
            </span>
          </button>

          {/* Wishlist */}
          <button
            onClick={onOpenWishlist}
            className="relative flex flex-col items-center text-[#444444] hover:text-[#9F2089] transition-colors focus:outline-none"
            aria-label="Wishlist"
          >
            <div className="relative">
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-[#9F2089] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {wishlistCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium mt-0.5 hidden sm:block">Wishlist</span>
          </button>

          {/* Shopping Bag / Cart */}
          <button
            onClick={onOpenCart}
            className="relative flex flex-col items-center text-[#444444] hover:text-[#9F2089] transition-colors focus:outline-none"
            aria-label="Cart"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-[#9F2089] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium mt-0.5 hidden sm:block">
              {cartCount > 0 ? `₹${cartTotal.toLocaleString('en-IN')}` : 'Cart'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Search Input */}
      <div className="px-4 pb-2.5 sm:hidden">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#888888] absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Sarees, Lehengas, Kurtis, Jewelry..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 text-[#888888]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Category Navigation Bar */}
      <div className="border-t border-[#E8E8E8] bg-white overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 sm:gap-3 py-2">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-md transition-all shrink-0 ${
                  isActive
                    ? 'bg-[#9F2089] text-white shadow-2xs font-bold'
                    : 'text-[#444444] hover:text-[#9F2089] hover:bg-[#FDE5F4]/60'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile App Direct Install Modal */}
      {showAppPrompt && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowAppPrompt(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md w-full text-center space-y-4 border border-[#E8E8E8] shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAppPrompt(false)}
              className="absolute top-3 right-3 p-1.5 text-[#666666] hover:text-[#222222] rounded-full hover:bg-black/5"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-md">
              <img
                src="/rz-icon-192.png"
                alt="RAZVI SHOP App Icon"
                className="w-full h-full rounded-full object-contain"
              />
            </div>

            <div>
              <h3 className="font-bold text-lg text-[#222222]">
                RAZVI SHOP Mobile App
              </h3>
              <p className="text-xs text-[#666666] mt-1">
                Install RAZVI SHOP directly on your phone as a standalone Android/iOS app — same store, instant launch from Home Screen, and live automatic updates whenever Admin adds or edits products.
              </p>
            </div>

            {isInstalled ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>App is already installed on your device!</span>
              </div>
            ) : isInstallable ? (
              <button
                onClick={async () => {
                  const outcome = await install();
                  if (outcome === 'accepted') {
                    setInstallFeedback('Installing RAZVI SHOP App on your device...');
                    setShowAppPrompt(false);
                  }
                }}
                className="w-full py-3 bg-[#9F2089] hover:bg-[#80182E] text-white font-bold rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Install App on Device Now</span>
              </button>
            ) : isIOS ? (
              <div className="p-3.5 bg-[#FAF8F5] border border-[#E8E8E8] rounded-lg text-left text-xs space-y-2">
                <div className="font-bold text-[#222222]">Install on iPhone / iPad (Safari):</div>
                <ol className="space-y-1.5 text-[#555555] list-decimal list-inside">
                  <li className="flex items-center gap-1.5">
                    <span>Tap the</span>
                    <Share className="w-3.5 h-3.5 text-[#9F2089] inline" />
                    <strong>Share</strong>
                    <span>button at the bottom of Safari.</span>
                  </li>
                  <li>
                    Select <strong>"Add to Home Screen"</strong> and tap <strong>Add</strong>.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="p-3.5 bg-[#FAF8F5] border border-[#E8E8E8] rounded-lg text-left text-xs space-y-2">
                <div className="font-bold text-[#222222]">Install on Android Phone (Chrome / Edge):</div>
                <ol className="space-y-1.5 text-[#555555] list-decimal list-inside">
                  <li>
                    Open this store directly in <strong>Google Chrome</strong> (not inside an in-app browser).
                  </li>
                  <li className="flex items-center gap-1 flex-wrap">
                    <span>Tap</span>
                    <MoreVertical className="w-3.5 h-3.5 text-[#9F2089] inline" />
                    <strong>Menu (⋮)</strong>
                    <span>➔</span>
                    <strong>"Install app"</strong>
                    <span>or</span>
                    <strong>"Add to Home screen"</strong>.
                  </li>
                  <li>
                    Chrome installs RAZVI SHOP directly onto your phone like a native Android app (WebAPK) with auto-updates!
                  </li>
                </ol>
              </div>
            )}

            {installFeedback && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 font-semibold">
                {installFeedback}
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#038D63] font-medium bg-emerald-50/70 py-2 px-3 rounded-md border border-emerald-100">
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>Admin changes sync live across all installed user devices.</span>
            </div>

            <button
              onClick={() => setShowAppPrompt(false)}
              className="w-full py-2.5 bg-white border border-[#CCCCCC] text-[#222222] font-bold rounded-lg text-xs hover:bg-[#FAF8F5] transition-colors"
            >
              Continue to Store
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
