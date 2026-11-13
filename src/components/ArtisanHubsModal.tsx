import React from 'react';
import { X, Award, MapPin, Users, CheckCircle2, ArrowRight } from 'lucide-react';
import { ARTISAN_HUBS } from '../data/artisanHubs';
import { ArtisanHub } from '../types';

interface ArtisanHubsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCluster: (clusterId: string) => void;
}

export const ArtisanHubsModal: React.FC<ArtisanHubsModalProps> = ({
  isOpen,
  onClose,
  onSelectCluster
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div
        className="relative bg-white w-full max-w-4xl rounded-lg shadow-2xl border border-[#EFEAE2] overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EFEAE2] bg-[#FAF8F5]">
          <div>
            <div className="text-[10px] font-bold text-[#C59B27] uppercase tracking-wider">
              Loom-to-Wardrobe Provenance
            </div>
            <h2 className="font-editorial text-xl font-semibold text-[#4B0013]">
              The Master Weaver Guilds & Craft Clusters
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#554243] hover:text-[#111C2D] rounded-full hover:bg-black/5"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-6">
          <p className="text-xs sm:text-sm text-[#554243] leading-relaxed max-w-2xl">
            Marhaba Elegance operates on a fair-trade, direct-from-weaver protocol. By eliminating multiple middlemen and urban boutique markups, our artisan collectives retain 100% of fair loom value while buyers access pure heritage textiles at honest prices.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ARTISAN_HUBS.map((hub: ArtisanHub) => (
              <div
                key={hub.id}
                className="bg-[#FAF8F5] border border-[#EFEAE2] rounded-lg p-4 flex flex-col justify-between space-y-3 hover:border-[#C59B27] transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-editorial text-base font-semibold text-[#111C2D]">
                        {hub.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-[#775A00] font-medium mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{hub.state}, India</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-[#FECE57]/20 text-[#775A00] px-2 py-0.5 rounded shrink-0">
                      GI Registered
                    </span>
                  </div>

                  <p className="text-xs text-[#554243] mt-2 leading-relaxed">
                    {hub.history}
                  </p>

                  <div className="mt-3 pt-2 border-t border-[#EFEAE2] space-y-1 text-xs">
                    <div className="text-[11px] text-[#111C2D] font-semibold">
                      Specialty: <span className="font-normal text-[#554243]">{hub.specialty}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-[#775A00] font-medium">
                      <Users className="w-3 h-3 text-[#C59B27]" />
                      <span>{hub.activeWeaversCount.toLocaleString()} Registered Active Weavers</span>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-1.5 pt-1">
                      {hub.certifications.map((cert) => (
                        <span
                          key={cert}
                          className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-white border border-[#EFEAE2] px-1.5 py-0.5 rounded"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          <span>{cert}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSelectCluster(hub.id);
                    onClose();
                  }}
                  className="w-full py-2 px-3 bg-white border border-[#6B1426] text-[#6B1426] hover:bg-[#6B1426] hover:text-white text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Explore {hub.id} Weaves</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
