import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

interface FooterProps {
  onSelectCategory: (catId: string) => void;
  onOpenArtisans: () => void;
  onOpenTracking: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCategory,
  onOpenArtisans,
  onOpenTracking
}) => {
  return (
    <footer className="bg-white border-t border-[#E8E8E8] text-[#222222] mt-10">
      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Brand Column */}
        <div className="md:col-span-4 space-y-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-editorial text-3xl font-bold tracking-tight text-[#4B0013]">
              Marhaba
            </span>
            <span className="text-xl font-light text-[#9F2089] tracking-tight">
              Collection
            </span>
          </div>

          <p className="text-xs text-[#555555] leading-relaxed">
            India’s trusted destination for authentic ethnic and modern fashion. Bridging local weavers and master artisans with households at honest wholesale rates.
          </p>

          <div className="pt-2 text-xs text-[#555555] space-y-1.5">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#9F2089] shrink-0" />
              <span>KISHANGANJ, BIHAR, 855108</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#9F2089] shrink-0" />
              <span>Customer Care / UPI: +91 9334808340 (Mon-Sat, 9am - 7pm IST)</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#9F2089] shrink-0" />
              <a
                href="mailto:marhabacollection@gmail.com"
                className="hover:text-[#9F2089] transition-colors"
              >
                marhabacollection@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="md:col-span-3 space-y-2.5">
          <div className="text-xs font-bold text-[#222222] uppercase tracking-wider">
            Popular Ethnic Categories
          </div>
          <ul className="text-xs text-[#666666] space-y-1.5">
            <li>
              <button
                onClick={() => onSelectCategory('sarees')}
                className="hover:text-[#9F2089] transition-colors"
              >
                Pure Banarasi & Katan Silk Sarees
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectCategory('lehengas')}
                className="hover:text-[#9F2089] transition-colors"
              >
                Bridal Velvet & Zardozi Lehengas
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectCategory('anarkalis')}
                className="hover:text-[#9F2089] transition-colors"
              >
                Chanderi & Gota Patti Anarkalis
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectCategory('mens')}
                className="hover:text-[#9F2089] transition-colors"
              >
                Royal Sherwanis & Raw Silk Kurtas
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectCategory('jewellery')}
                className="hover:text-[#9F2089] transition-colors"
              >
                22K Gold Plated Kundan Polki Chokers
              </button>
            </li>
          </ul>
        </div>

        {/* Weaver Hubs & Verification */}
        <div className="md:col-span-3 space-y-2.5">
          <div className="text-xs font-bold text-[#222222] uppercase tracking-wider">
            Direct Weaver Guilds
          </div>
          <ul className="text-xs text-[#666666] space-y-1.5">
            <li>
              <button onClick={onOpenArtisans} className="hover:text-[#9F2089] transition-colors">
                Varanasi Weavers Guild (U.P.)
              </button>
            </li>
            <li>
              <button onClick={onOpenArtisans} className="hover:text-[#9F2089] transition-colors">
                Surat Direct Textile Cluster (Gujarat)
              </button>
            </li>
            <li>
              <button onClick={onOpenArtisans} className="hover:text-[#9F2089] transition-colors">
                Chanderi Heritage Guild (M.P.)
              </button>
            </li>
            <li>
              <button onClick={onOpenArtisans} className="hover:text-[#9F2089] transition-colors">
                Kanchipuram Loom Collectives (T.N.)
              </button>
            </li>
            <li>
              <button onClick={onOpenArtisans} className="hover:text-[#9F2089] transition-colors">
                Jaipur Royal Blockprint Guild (Rajasthan)
              </button>
            </li>
          </ul>
        </div>

        {/* Customer Care & Orders */}
        <div className="md:col-span-2 space-y-2.5">
          <div className="text-xs font-bold text-[#222222] uppercase tracking-wider">
            Customer Care
          </div>
          <ul className="text-xs text-[#666666] space-y-1.5">
            <li>
              <button onClick={onOpenTracking} className="hover:text-[#9F2089] transition-colors font-bold text-[#9F2089]">
                Track Active Order
              </button>
            </li>
            <li>
              <span className="hover:text-[#9F2089] cursor-pointer">Cash on Delivery Terms</span>
            </li>
            <li>
              <span className="hover:text-[#9F2089] cursor-pointer">Silk Mark Purity Guide</span>
            </li>
            <li>
              <span className="hover:text-[#9F2089] cursor-pointer">Returns & Exchanges</span>
            </li>
            <li>
              <span className="hover:text-[#9F2089] cursor-pointer">Supplier Help Center</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright & Disclaimer Bar */}
      <div className="border-t border-[#E8E8E8] py-4 bg-[#F8F8F9] text-center text-xs text-[#888888]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © {new Date().getFullYear()} Marhaba Collection · Kishanganj, Bihar, 855108. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Privacy Policy</span>
            <span>·</span>
            <span>Terms of Service</span>
            <span>·</span>
            <span>Supplier Guidelines</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
