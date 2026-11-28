import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

interface FooterProps {
  onSelectCategory: (catId: string) => void;
  onOpenTracking: () => void;
  paymentPhone?: string;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCategory,
  onOpenTracking
}) => {
  const activePhone = '9334808340';
  return (
    <footer className="bg-white border-t border-[#E8E8E8] text-[#222222] mt-10">
      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Brand Column */}
        <div className="md:col-span-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/rs-icon-192.png"
              alt="RAZVI SHOP Logo"
              className="w-11 h-11 rounded-full object-contain shrink-0 shadow-xs"
            />
            <div className="flex items-baseline gap-1.5">
              <span className="font-editorial text-3xl font-bold tracking-tight text-[#4B0013]">
                RAZVI
              </span>
              <span className="text-xl font-light text-[#9F2089] tracking-tight">
                SHOP
              </span>
            </div>
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
              <span>Customer Care / UPI: +91 {activePhone} (Mon-Sat, 9am - 7pm IST)</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#9F2089] shrink-0" />
              <a
                href="mailto:razvishop@gmail.com"
                className="hover:text-[#9F2089] transition-colors"
              >
                razvishop@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="md:col-span-4 space-y-2.5">
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

        {/* Customer Care & Orders */}
        <div className="md:col-span-3 space-y-2.5">
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
              <span className="hover:text-[#9F2089] cursor-pointer">Secure Payment Terms</span>
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
            © {new Date().getFullYear()} RAZVI SHOP · Kishanganj, Bihar, 855108. All rights reserved.
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
