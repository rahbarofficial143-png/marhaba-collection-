import React, { useState, useRef } from 'react';
import { UserCheck, Phone, MapPin, Building2, Home, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../types';

interface CreateAccountModalProps {
  isOpen: boolean;
  onSaveAccount: (profile: UserProfile) => void;
  onTriggerAdminLogin: () => void;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  onSaveAccount,
  onTriggerAdminLogin
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [buildingOrVillage, setBuildingOrVillage] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Secret 5-click Admin trigger on brand logo
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!isOpen) return null;

  const handleLogoTap = () => {
    clickCountRef.current += 1;
    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      onTriggerAdminLogin();
      return;
    }
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 3000);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Please enter your full name';
    if (!/^\d{10}$/.test(phone.trim())) newErrors.phone = 'Enter valid 10-digit mobile number';
    const numericAge = Number(age.trim());
    if (!age.trim() || Number.isNaN(numericAge) || numericAge < 10 || numericAge > 110) {
      newErrors.age = 'Enter valid age';
    }
    if (!buildingOrVillage.trim()) newErrors.buildingOrVillage = 'Enter village, house, or building name';
    if (!fullAddress.trim()) newErrors.fullAddress = 'Enter full street / area address';
    if (!city.trim()) newErrors.city = 'Enter city / town name';
    if (!state.trim()) newErrors.state = 'Enter state name';
    if (!/^\d{6}$/.test(pincode.trim())) newErrors.pincode = 'Enter valid 6-digit pincode';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const now = new Date().toISOString();
    const profile: UserProfile = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      age: age.trim(),
      buildingOrVillage: buildingOrVillage.trim(),
      fullAddress: fullAddress.trim(),
      landmark: landmark.trim() || undefined,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      createdAt: now,
      updatedAt: now
    };
    onSaveAccount(profile);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn text-[#222222]">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#E8E8E8] overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-[#4B0013] via-[#80182E] to-[#9F2089] text-white px-5 py-4 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleLogoTap}
              className="text-left focus:outline-none select-none cursor-pointer"
            >
              <div className="flex items-baseline gap-1.5">
                <span className="font-editorial text-2xl font-bold tracking-tight text-white">
                  Marhaba
                </span>
                <span className="text-xl font-light text-[#FECE57] tracking-tight">
                  Collection
                </span>
              </div>
              <p className="text-[11px] text-white/85 mt-0.5">
                Create Your Account · Saved Permanently on This Device
              </p>
            </button>
            <div className="w-10 h-10 rounded-full bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-[#FECE57]" />
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
          <div className="p-3 bg-[#FDE5F4]/40 border border-[#9F2089]/25 rounded-lg text-[11px] text-[#4B0013] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#9F2089] shrink-0 mt-0.5" />
            <span>
              Ek baar apni details save karne ke baad jab tak aap app delete nahi karte, aapka account aur delivery address hamesha saved rahega.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-[#222222] mb-1">Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-3 py-2.5 border border-[#CCCCCC] rounded-lg focus:border-[#9F2089] focus:ring-1 focus:ring-[#9F2089] focus:outline-none"
              />
              {errors.fullName && <p className="text-[11px] text-red-600 mt-0.5">{errors.fullName}</p>}
            </div>

            <div>
              <label className="flex items-center gap-1 font-bold text-[#222222] mb-1">
                <Phone className="w-3.5 h-3.5 text-[#9F2089]" />
                <span>Phone No *</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit mobile number"
                className="w-full px-3 py-2.5 border border-[#CCCCCC] rounded-lg focus:border-[#9F2089] focus:ring-1 focus:ring-[#9F2089] focus:outline-none font-mono"
              />
              {errors.phone && <p className="text-[11px] text-red-600 mt-0.5">{errors.phone}</p>}
            </div>

            <div>
              <label className="flex items-center gap-1 font-bold text-[#222222] mb-1">
                <Calendar className="w-3.5 h-3.5 text-[#9F2089]" />
                <span>Age *</span>
              </label>
              <input
                type="number"
                min={10}
                max={110}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 24"
                className="w-full px-3 py-2.5 border border-[#CCCCCC] rounded-lg focus:border-[#9F2089] focus:ring-1 focus:ring-[#9F2089] focus:outline-none"
              />
              {errors.age && <p className="text-[11px] text-red-600 mt-0.5">{errors.age}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-1 font-bold text-[#222222] mb-1">
                <Building2 className="w-3.5 h-3.5 text-[#9F2089]" />
                <span>Village / House / Building Name *</span>
              </label>
              <input
                type="text"
                value={buildingOrVillage}
                onChange={(e) => setBuildingOrVillage(e.target.value)}
                placeholder="e.g. Ward No. 12, Noor Nagar / Green Residency"
                className="w-full px-3 py-2.5 border border-[#CCCCCC] rounded-lg focus:border-[#9F2089] focus:ring-1 focus:ring-[#9F2089] focus:outline-none"
              />
              {errors.buildingOrVillage && <p className="text-[11px] text-red-600 mt-0.5">{errors.buildingOrVillage}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-1 font-bold text-[#222222] mb-1">
                <Home className="w-3.5 h-3.5 text-[#9F2089]" />
                <span>Full Address (Road / Mohalla / Area) *</span>
              </label>
              <textarea
                rows={2}
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="House No, Street, Post Office, Area details..."
                className="w-full px-3 py-2 border border-[#CCCCCC] rounded-lg focus:border-[#9F2089] focus:ring-1 focus:ring-[#9F2089] focus:outline-none resize-none"
              />
              {errors.fullAddress && <p className="text-[11px] text-red-600 mt-0.5">{errors.fullAddress}</p>}
            </div>

            <div>
              <label className="block font-bold text-[#222222] mb-1">City / Town *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Kishanganj"
                className="w-full px-3 py-2.5 border border-[#CCCCCC] rounded-lg focus:border-[#9F2089] focus:ring-1 focus:ring-[#9F2089] focus:outline-none"
              />
              {errors.city && <p className="text-[11px] text-red-600 mt-0.5">{errors.city}</p>}
            </div>

            <div>
              <label className="block font-bold text-[#222222] mb-1">State *</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Bihar"
                className="w-full px-3 py-2.5 border border-[#CCCCCC] rounded-lg focus:border-[#9F2089] focus:ring-1 focus:ring-[#9F2089] focus:outline-none"
              />
              {errors.state && <p className="text-[11px] text-red-600 mt-0.5">{errors.state}</p>}
            </div>

            <div>
              <label className="flex items-center gap-1 font-bold text-[#222222] mb-1">
                <MapPin className="w-3.5 h-3.5 text-[#9F2089]" />
                <span>Pincode *</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit pincode"
                className="w-full px-3 py-2.5 border border-[#CCCCCC] rounded-lg focus:border-[#9F2089] focus:ring-1 focus:ring-[#9F2089] focus:outline-none font-mono"
              />
              {errors.pincode && <p className="text-[11px] text-red-600 mt-0.5">{errors.pincode}</p>}
            </div>

            <div>
              <label className="block font-bold text-[#222222] mb-1">Nearby Landmark (Optional)</label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Jama Masjid / Station"
                className="w-full px-3 py-2.5 border border-[#CCCCCC] rounded-lg focus:border-[#9F2089] focus:ring-1 focus:ring-[#9F2089] focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-[#9F2089] hover:bg-[#80182E] text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-99 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#FECE57]" />
              <span>Save Account &amp; Continue</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
