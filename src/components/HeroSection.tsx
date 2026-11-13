import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ShieldCheck, Truck, RotateCcw, BadgePercent } from 'lucide-react';
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

  // Auto rotate banners every 5 seconds
  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  // Use dynamic categories from admin (exclude 'all', only show bubbles with uploaded image)
  const categoryBubbles = categories
    .filter((c) => c.id !== 'all' && Boolean(c.imageUrl))
    .slice(0, 8);

  const current = activeBanners[currentSlide] || activeBanners[0];

  return (
    <div className="bg-white border-b border-[#E8E8E8]">
      {/* Category Circles Rail (shown once admin adds category images) */}
      {categoryBubbles.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 border-b border-[#F0F0F0]">
          <div className="flex items-center justify-between sm:justify-center gap-4 sm:gap-8 overflow-x-auto scrollbar-none">
            {categoryBubbles.map((bubble) => (
              <button
                key={bubble.id}
                onClick={() => onExploreCategory(bubble.id)}
                className="flex flex-col items-center group shrink-0 focus:outline-none"
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
        </div>
      )}

      {/* Hero Carousel Banner & Trust Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {current && (
          <div className="relative rounded-xl overflow-hidden shadow-sm bg-gradient-to-r from-[#9F2089] to-[#80182E] text-white mb-4">
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[220px] sm:min-h-[280px] items-center">
              {/* Left Content */}
              <div className="md:col-span-7 p-6 sm:p-10 space-y-3 z-10">
                <div className="inline-block bg-[#FECE57] text-[#4B0013] text-[11px] font-black px-2.5 py-1 rounded shadow-xs tracking-wider uppercase">
                  {current.badgeText}
                </div>

                <h1 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight text-white drop-shadow-xs font-editorial">
                  {current.title}
                </h1>

                <p className="text-xs sm:text-sm text-white/90 max-w-md leading-relaxed font-medium">
                  {current.subtitle}
                </p>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => onExploreCategory(current.categoryLink)}
                    className="px-5 py-2.5 bg-white text-[#9F2089] hover:bg-[#FAF8F5] text-xs sm:text-sm font-bold rounded shadow-md transition-all active:scale-98"
                  >
                    {current.ctaText} →
                  </button>

                  <button
                    onClick={onOpenArtisans}
                    className="px-4 py-2 bg-black/20 hover:bg-black/30 text-white text-xs font-semibold rounded border border-white/30 transition-colors"
                  >
                    Meet Direct Weavers
                  </button>
                </div>
              </div>

              {/* Right Image Showcase */}
              <div className="md:col-span-5 h-48 md:h-full relative overflow-hidden">
                {current.imageUrl && (
                  <img
                    src={current.imageUrl}
                    alt={current.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-[#9F2089] via-transparent to-transparent md:block hidden" />
              </div>
            </div>

            {/* Carousel Arrows */}
            {activeBanners.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setCurrentSlide((prev) => (prev - 1 + activeBanners.length) % activeBanners.length)
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                  aria-label="Previous banner"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  onClick={() =>
                    setCurrentSlide((prev) => (prev + 1) % activeBanners.length)
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                  aria-label="Next banner"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                  {activeBanners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2 rounded-full transition-all ${
                        currentSlide === idx ? 'w-6 bg-[#FECE57]' : 'w-2 bg-white/50'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 4-Pillar Trust Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[#444444]">
          <div className="flex items-center gap-2.5 p-2 bg-[#FAF8F5] rounded border border-[#E8E8E8]">
            <BadgePercent className="w-5 h-5 text-[#9F2089] shrink-0" />
            <div>
              <div className="font-bold text-[#222222]">Wholesale Loom Pricing</div>
              <div className="text-[10px] text-[#777777]">No intermediate store markup</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 bg-[#FAF8F5] rounded border border-[#E8E8E8]">
            <Truck className="w-5 h-5 text-[#038D63] shrink-0" />
            <div>
              <div className="font-bold text-[#222222]">Free Delivery Pan-India</div>
              <div className="text-[10px] text-[#777777]">Orders above ₹999</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 bg-[#FAF8F5] rounded border border-[#E8E8E8]">
            <ShieldCheck className="w-5 h-5 text-[#C59B27] shrink-0" />
            <div>
              <div className="font-bold text-[#222222]">PhonePe / UPI: 9334808340</div>
              <div className="text-[10px] text-[#777777]">Direct 1-click verification</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 bg-[#FAF8F5] rounded border border-[#E8E8E8]">
            <RotateCcw className="w-5 h-5 text-[#80182E] shrink-0" />
            <div>
              <div className="font-bold text-[#222222]">7-Day Easy Returns</div>
              <div className="text-[10px] text-[#777777]">100% Instant Refund</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
