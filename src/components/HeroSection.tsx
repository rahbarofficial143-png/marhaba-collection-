import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Truck, RotateCcw, MoreVertical } from 'lucide-react';
import { Banner, Category } from '../types';

interface HeroSectionProps {
  banners: Banner[];
  categories: Category[];
  onExploreCategory: (category: string) => void;
  onOpenArtisans: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  banners,
  categories,
  onExploreCategory,
  onOpenArtisans
}) => {
  const activeBanners = banners.filter((b) => b.active);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPolicyMenuOpen, setIsPolicyMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Auto rotate banners every 5 seconds
  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  // Close 3-dot menu on outside click
  useEffect(() => {
    if (!isPolicyMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsPolicyMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isPolicyMenuOpen]);

  // Use dynamic categories from admin (exclude 'all', only show bubbles with uploaded image)
  const categoryBubbles = categories
    .filter((c) => c.id !== 'all' && Boolean(c.imageUrl))
    .slice(0, 8);

  const current = activeBanners[currentSlide] || activeBanners[0];

  return (
    <div className="bg-white border-b border-[#E8E8E8]">
      {/* Dynamic Category Circles Rail + Right-Side Three-Dot Policies Dropdown (Above Banners) */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3.5 border-b border-[#F0F0F0] flex items-center justify-between gap-2">
        {categoryBubbles.length > 0 ? (
          <div className="flex-1 flex items-center justify-start sm:justify-center gap-4 sm:gap-8 overflow-x-auto scrollbar-none">
            {categoryBubbles.map((bubble) => (
              <button
                key={bubble.id}
                onClick={() => onExploreCategory(bubble.id)}
                className="flex flex-col items-center group shrink-0 focus:outline-none cursor-pointer"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-transparent group-hover:border-[#9F2089] p-0.5 transition-all shadow-xs bg-[#FAF8F5]">
                  <img
                    src={bubble.imageUrl}
                    alt={bubble.label}
                    className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-[#444444] group-hover:text-[#9F2089] mt-1.5 transition-colors">
                  {bubble.label}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex-1 text-xs font-semibold text-[#666666]">
            RAZVI SHOP Highlights
          </div>
        )}

        {/* Right-Side Three-Dot Menu for Free Delivery Pan-India & 7-Day Easy Returns */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsPolicyMenuOpen((prev) => !prev)}
            className="p-2 rounded-full bg-[#FAF8F5] hover:bg-[#FDE5F4] border border-[#E8E8E8] text-[#444444] hover:text-[#9F2089] transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Delivery and Return Info"
            title="Delivery & Return Policies"
          >
            <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {isPolicyMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-[#E8E8E8] p-2.5 space-y-2 z-50 animate-fadeIn">
              <div className="flex items-center gap-2.5 p-2.5 bg-[#FAF8F5] rounded-lg border border-[#EFEAE2]">
                <Truck className="w-5 h-5 text-[#038D63] shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#222222]">Free Delivery Pan-India</div>
                  <div className="text-[11px] text-[#666666]">Orders above ₹999</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 bg-[#FAF8F5] rounded-lg border border-[#EFEAE2]">
                <RotateCcw className="w-5 h-5 text-[#80182E] shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#222222]">7-Day Easy Returns</div>
                  <div className="text-[11px] text-[#666666]">100% Instant Refund</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hero Carousel Banner & Trust Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {current && (
          <div className={`relative rounded-xl overflow-hidden shadow-sm bg-gradient-to-r ${current.bgGradient || 'from-[#9F2089] to-[#80182E]'} text-white`}>
            <div className="grid grid-cols-1 md:grid-cols-12 items-center">
              {/* Left / Top Text Content */}
              <div
                className={`md:col-span-7 px-4 pt-4 pb-2.5 sm:p-8 md:py-9 ${
                  activeBanners.length > 1 ? 'md:pl-14 md:pr-5' : 'md:px-10'
                } space-y-2 sm:space-y-3 z-10`}
              >
                <div className="inline-block bg-[#FECE57] text-[#4B0013] text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 sm:py-1 rounded shadow-xs tracking-wider uppercase">
                  {current.badgeText}
                </div>

                <h1 className="text-xl sm:text-3xl lg:text-4xl font-black leading-snug sm:leading-tight tracking-tight text-white drop-shadow-xs font-editorial">
                  {current.title}
                </h1>

                <p className="text-xs sm:text-sm text-white/90 max-w-md leading-relaxed font-medium">
                  {current.subtitle}
                </p>

                <div className="pt-1 sm:pt-2 flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => onExploreCategory(current.categoryLink)}
                    className="px-4 py-2 sm:px-5 sm:py-2.5 bg-white text-[#9F2089] hover:bg-[#FAF8F5] text-xs sm:text-sm font-bold rounded shadow-md transition-all active:scale-98 cursor-pointer"
                  >
                    {current.ctaText} →
                  </button>

                  <button
                    onClick={onOpenArtisans}
                    className="px-3.5 py-2 bg-black/20 hover:bg-black/30 text-white text-xs font-semibold rounded border border-white/30 transition-colors cursor-pointer"
                  >
                    Meet Direct Weavers
                  </button>
                </div>
              </div>

              {/* Right / Bottom Full Image Showcase (Zero Cropping on Phone & Desktop) */}
              <div
                className={`md:col-span-5 flex items-center justify-center px-3 pt-1 ${
                  activeBanners.length > 1 ? 'pb-11 md:py-5 md:pr-14' : 'pb-4 md:py-5 md:pr-6'
                } md:pl-2`}
              >
                {current.imageUrl && (
                  <div className="w-full flex items-center justify-center rounded-lg bg-black/15 p-1.5 sm:p-2 border border-white/15">
                    <img
                      src={current.imageUrl}
                      alt={current.title}
                      className="w-auto max-w-full max-h-[260px] sm:max-h-[300px] md:max-h-[320px] h-auto object-contain rounded-md shadow-md mx-auto"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Side Arrows (Safe Gutters) */}
            {activeBanners.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setCurrentSlide((prev) => (prev - 1 + activeBanners.length) % activeBanners.length)
                  }
                  className="hidden md:flex absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white items-center justify-center transition-colors z-20 cursor-pointer"
                  aria-label="Previous banner"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  onClick={() =>
                    setCurrentSlide((prev) => (prev + 1) % activeBanners.length)
                  }
                  className="hidden md:flex absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white items-center justify-center transition-colors z-20 cursor-pointer"
                  aria-label="Next banner"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Desktop Bottom Dots */}
                <div className="hidden md:flex absolute bottom-3 left-1/2 -translate-x-1/2 items-center gap-1.5 z-20">
                  {activeBanners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        currentSlide === idx ? 'w-6 bg-[#FECE57]' : 'w-2 bg-white/50'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* Mobile Clean Bottom Bar (Arrows + Dots — never overlaps buttons or photo) */}
                <div className="md:hidden absolute bottom-2 inset-x-3 flex items-center justify-between z-20">
                  <button
                    onClick={() =>
                      setCurrentSlide((prev) => (prev - 1 + activeBanners.length) % activeBanners.length)
                    }
                    className="w-7 h-7 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Previous banner"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {activeBanners.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          currentSlide === idx ? 'w-5 bg-[#FECE57]' : 'w-2 bg-white/55'
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentSlide((prev) => (prev + 1) % activeBanners.length)
                    }
                    className="w-7 h-7 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Next banner"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
