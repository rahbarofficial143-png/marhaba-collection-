import React, { useState } from 'react';
import { X, Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    // Verification against owner credentials
    if (cleanUser === 'RAHBAR786' && cleanPass === 'RAHBAR7860') {
      try {
        localStorage.setItem('marhaba_admin_auth', 'true');
        sessionStorage.setItem('marhaba_admin_auth', 'true');
      } catch {
        // ignore storage errors
      }
      setUsername('');
      setPassword('');
      setIsSubmitting(false);
      onLoginSuccess();
    } else {
      setIsSubmitting(false);
      setError('Galat Username ya Password! Kripya sahi owner credentials enter karein.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn text-[#222222]">
      <div
        className="bg-white rounded-xl shadow-2xl border border-[#E8E8E8] w-full max-w-md overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-[#80182E] via-[#9F2089] to-[#4B0013] text-white p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.png"
              alt="RAZVI SHOP"
              className="w-11 h-11 rounded-full object-contain shrink-0 shadow-inner"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-editorial text-xl font-bold tracking-tight">RAZVI SHOP</span>
                <span className="bg-[#FECE57] text-[#4B0013] text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                  Owner Suite
                </span>
              </div>
              <p className="text-xs text-white/85 mt-0.5">
                Admin Panel Security Login
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-xs text-[#666666] bg-[#FAF8F5] p-3 rounded-lg border border-[#E8E8E8] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#9F2089] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Login karne ke baad aap turant <strong>Supabase Project URL &amp; Anon Key</strong> enter kar sakte hain, aur products, banners &amp; orders manage kar sakte hain.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2 animate-fadeIn font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Username */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#222222]">
              Admin Username *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#888888]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                autoFocus
                autoComplete="off"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                placeholder="Enter admin username"
                className="w-full pl-9 pr-3 py-2.5 text-xs font-medium border border-[#CCCCCC] rounded-lg focus:border-[#9F2089] focus:ring-1 focus:ring-[#9F2089] focus:outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#222222]">
              Admin Password *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#888888]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="off"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Enter admin password"
                className="w-full pl-9 pr-10 py-2.5 text-xs font-medium border border-[#CCCCCC] rounded-lg focus:border-[#9F2089] focus:ring-1 focus:ring-[#9F2089] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#888888] hover:text-[#222222]"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !username.trim() || !password.trim()}
              className="w-full py-2.5 bg-[#9F2089] hover:bg-[#80182E] text-white font-bold text-xs rounded-lg transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#FECE57]" />
              <span>Login to RAZVI SHOP Admin Panel</span>
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-[#777777] hover:text-[#222222] hover:underline"
            >
              Cancel and return to store
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
