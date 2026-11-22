import React, { useState, useRef, useEffect } from 'react';
import {
  UserCheck,
  Phone,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  Loader2,
  User
} from 'lucide-react';
import { UserProfile } from '../types';
import { normalizeSecretCode, isValidSecretCode } from '../lib/userCodec';
import { checkSecretCodeDuplicate } from '../lib/supabase';

interface CreateAccountModalProps {
  isOpen: boolean;
  localUsers?: UserProfile[];
  onSaveAccount: (profile: UserProfile) => void;
  onSecretCodeLogin: (secretCode: string) => Promise<{ ok: boolean; error?: string }>;
  onTriggerAdminLogin: () => void;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  localUsers = [],
  onSaveAccount,
  onSecretCodeLogin,
  onTriggerAdminLogin
}) => {
  const [authMode, setAuthMode] = useState<'register' | 'secret_login'>('register');

  // Strictly 3 initial onboarding fields: Name, Phone Number, 6-Digit Secret Code
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [showRegisterSecret, setShowRegisterSecret] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Secret Code Login state
  const [loginSecretCode, setLoginSecretCode] = useState('');
  const [showLoginSecret, setShowLoginSecret] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Secret 5-click Admin trigger on brand logo
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setLoginError(null);
      setIsSaving(false);
      setIsLoggingIn(false);
    }
  }, [isOpen]);

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
    if (!fullName.trim()) newErrors.fullName = 'Apna poora naam enter karein';
    if (!/^\d{10}$/.test(phone.trim())) newErrors.phone = '10-digit mobile number enter karein';
    if (!isValidSecretCode(secretCode)) {
      newErrors.secretCode = 'Sirf 6 digit ka Secret Code enter karein (e.g. 458912)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSaving) return;

    const cleanSecret = normalizeSecretCode(secretCode);
    setIsSaving(true);
    try {
      const taken = await checkSecretCodeDuplicate(cleanSecret, undefined, localUsers);
      if (taken) {
        setErrors((prev) => ({
          ...prev,
          secretCode: 'Ye 6-digit Secret Code pehle se kisi account me save hai. Koi doosra 6-digit code daalein.'
        }));
        setIsSaving(false);
        return;
      }

      const now = new Date().toISOString();
      const profile: UserProfile = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        age: '',
        secretCode: cleanSecret,
        role: 'user',
        buildingOrVillage: '',
        fullAddress: '',
        landmark: undefined,
        city: '',
        state: '',
        pincode: '',
        createdAt: now,
        updatedAt: now
      };
      onSaveAccount(profile);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSecretLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const clean = normalizeSecretCode(loginSecretCode);
    if (!isValidSecretCode(clean)) {
      setLoginError('Sirf 6 digit ka numeric Secret Code enter karein.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const result = await onSecretCodeLogin(clean);
      if (!result.ok) {
        setLoginError(result.error || 'Ye 6-digit Secret Code match nahi hua.');
      } else {
        setLoginSecretCode('');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn text-[#222222]">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#E8E8E8] overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-[#4B0013] via-[#80182E] to-[#9F2089] text-white px-5 py-4 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleLogoTap}
              className="flex items-center gap-2.5 text-left focus:outline-none select-none cursor-pointer"
            >
              <img
                src="/rs-icon-192.png"
                alt="RAZVI SHOP"
                className="w-10 h-10 rounded-full object-contain shrink-0 shadow-xs"
              />
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-editorial text-2xl font-bold tracking-tight text-white">
                    RAZVI
                  </span>
                  <span className="text-xl font-light text-[#FECE57] tracking-tight">
                    SHOP
                  </span>
                </div>
                <p className="text-[11px] text-white/85 mt-0.5">
                  {authMode === 'register'
                    ? 'Enter Name, Phone & 6-Digit Secret Code'
                    : 'Login with 6-Digit Secret Code (User / Admin)'}
                </p>
              </div>
            </button>
            <div className="w-10 h-10 rounded-full bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              {authMode === 'register' ? (
                <UserCheck className="w-5 h-5 text-[#FECE57]" />
              ) : (
                <KeyRound className="w-5 h-5 text-[#FECE57]" />
              )}
            </div>
          </div>
        </div>

        {/* Mode Switcher: Quick Entry vs Login with 6-Digit Secret Code */}
        <div className="grid grid-cols-2 border-b border-[#E8E8E8] bg-[#FAF8F5] shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setLoginError(null);
            }}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              authMode === 'register'
                ? 'border-[#9F2089] text-[#9F2089] bg-white'
                : 'border-transparent text-[#666666] hover:text-[#222222]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>New Account</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('secret_login');
              setErrors({});
            }}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              authMode === 'secret_login'
                ? 'border-[#9F2089] text-[#9F2089] bg-white'
                : 'border-transparent text-[#666666] hover:text-[#222222]'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Login via Secret Code</span>
          </button>
        </div>

        {authMode === 'secret_login' ? (
          <form onSubmit={handleSecretLoginSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            <div className="p-3.5 bg-[#FDE5F4]/45 border border-[#9F2089]/25 rounded-xl flex items-start gap-2.5 text-[#4B0013]">
              <KeyRound className="w-4 h-4 text-[#9F2089] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">6-Digit Secret Code se Direct Login Karein</p>
                <p className="text-[11px] leading-relaxed text-[#5A1E46]">
                  Agar aapne pehle account banaya tha ya logout kar diya tha, toh apna <strong>6-digit Secret Code</strong> daalte hi aapka saved Name, Phone aur Delivery Address turant wapas open ho jayega.
                </p>
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="flex items-center justify-between font-bold text-[#222222]">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-[#9F2089]" />
                  <span>Enter 6-Digit Secret Code *</span>
                </span>
                <span className="text-[11px] font-mono text-[#666666]">
                  {loginSecretCode.length}/6 digits
                </span>
              </label>

              <div className="relative">
                <input
                  type={showLoginSecret ? 'tel' : 'password'}
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoFocus
                  value={loginSecretCode}
                  onChange={(e) => {
                    setLoginSecretCode(normalizeSecretCode(e.target.value));
                    setLoginError(null);
                  }}
                  placeholder="••••••"
                  className="w-full px-4 py-3.5 text-center text-2xl tracking-[0.45em] font-mono font-black border-2 border-[#CCCCCC] rounded-xl focus:border-[#9F2089] focus:ring-2 focus:ring-[#9F2089]/20 focus:outline-none bg-[#FAF8F5]"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginSecret((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#777777] hover:text-[#222222]"
                  aria-label="Toggle secret code visibility"
                >
                  {showLoginSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-[#666666] text-center">
                Sirf 6 number (0–9) enter karne ki permission hai · User aur Admin dono ke liye
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn || loginSecretCode.length !== 6}
              className="w-full py-3 bg-[#9F2089] hover:bg-[#80182E] disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#FECE57]" />
                  <span>Verifying Secret Code...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-[#FECE57]" />
                  <span>Login &amp; Open Store</span>
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className="text-xs font-bold text-[#9F2089] hover:underline cursor-pointer"
              >
                Naya User hain? Yahan se New Account banayein →
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            <div className="p-3 bg-[#FDE5F4]/40 border border-[#9F2089]/25 rounded-lg text-[11px] text-[#4B0013] flex items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#9F2089] shrink-0 mt-0.5" />
                <span>
                  Pehle se account hai? Apna <strong>6-digit Secret Code</strong> daal kar sidha wapas login karein.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAuthMode('secret_login')}
                className="px-2.5 py-1.5 bg-[#9F2089] text-white font-bold rounded-md text-[10px] shrink-0 hover:bg-[#80182E] cursor-pointer"
              >
                Secret Login
              </button>
            </div>

            <div className="space-y-3.5">
              {/* 1. Full Name */}
              <div>
                <label className="flex items-center gap-1.5 font-bold text-[#222222] mb-1">
                  <User className="w-3.5 h-3.5 text-[#9F2089]" />
                  <span>Your Name *</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                  }}
                  placeholder="Apna poora naam likhein"
                  className="w-full px-3.5 py-2.5 border border-[#CCCCCC] rounded-lg focus:border-[#9F2089] focus:ring-1 focus:ring-[#9F2089] focus:outline-none"
                />
                {errors.fullName && <p className="text-[11px] text-red-600 mt-0.5">{errors.fullName}</p>}
              </div>

              {/* 2. Phone Number */}
              <div>
                <label className="flex items-center gap-1.5 font-bold text-[#222222] mb-1">
                  <Phone className="w-3.5 h-3.5 text-[#9F2089]" />
                  <span>Phone Number (10-Digit) *</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, ''));
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  placeholder="10-digit mobile number"
                  className="w-full px-3.5 py-2.5 border border-[#CCCCCC] rounded-lg focus:border-[#9F2089] focus:ring-1 focus:ring-[#9F2089] focus:outline-none font-mono font-bold tracking-wider"
                />
                {errors.phone && <p className="text-[11px] text-red-600 mt-0.5">{errors.phone}</p>}
              </div>

              {/* 3. Strictly 6-Digit Secret Code */}
              <div className="p-3.5 bg-[#FAF8F5] border border-[#9F2089]/30 rounded-xl space-y-1.5">
                <label className="flex items-center justify-between font-bold text-[#222222]">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#9F2089]" />
                    <span>6-Digit Secret Code * (Login PIN)</span>
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      secretCode.length === 6 ? 'text-emerald-700' : 'text-[#777777]'
                    }`}
                  >
                    {secretCode.length}/6 digits
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showRegisterSecret ? 'tel' : 'password'}
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={secretCode}
                    onChange={(e) => {
                      setSecretCode(normalizeSecretCode(e.target.value));
                      if (errors.secretCode) setErrors((prev) => ({ ...prev, secretCode: '' }));
                    }}
                    placeholder="6-digit secret code (e.g. 123456)"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-[#CCCCCC] rounded-lg focus:border-[#9F2089] focus:ring-1 focus:ring-[#9F2089] focus:outline-none font-mono tracking-[0.3em] font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterSecret((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#777777] hover:text-[#222222]"
                    tabIndex={-1}
                  >
                    {showRegisterSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-[#666666] leading-relaxed">
                  Bas Name, Phone aur ye 6-digit Secret Code daalkar store khol lein — Supabase me save ho jayega. Address aap order karte waqt save kar sakte hain.
                </p>
                {errors.secretCode && <p className="text-[11px] text-red-600 font-medium">{errors.secretCode}</p>}
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-[#9F2089] hover:bg-[#80182E] disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-99 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-[#FECE57]" />
                <span>{isSaving ? 'Saving to Supabase...' : 'Enter Website & Continue →'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
