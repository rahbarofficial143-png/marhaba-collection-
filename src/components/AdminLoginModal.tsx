import React, { useState, useEffect } from 'react';
import { X, Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle, Sparkles, KeyRound, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { normalizeSecretCode, isValidSecretCode } from '../lib/userCodec';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (adminProfile?: UserProfile) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [loginTab, setLoginTab] = useState<'secret' | 'credentials'>('secret');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [secretCode, setSecretCode] = useState('');
  const [showSecretCode, setShowSecretCode] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const completeLogin = (profile?: UserProfile) => {
    try {
      localStorage.setItem('marhaba_admin_auth', 'true');
      sessionStorage.setItem('marhaba_admin_auth', 'true');
    } catch {
      // ignore storage errors
    }
    setUsername('');
    setPassword('');
    setSecretCode('');
    setIsSubmitting(false);
    onLoginSuccess(profile);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        completeLogin(data.profile);
        return;
      }
      setError(data?.error || 'Galat Username ya Password! Kripya sahi owner credentials enter karein.');
    } catch {
      setError('Server connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSecretSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean = normalizeSecretCode(secretCode);
    if (!isValidSecretCode(clean)) {
      setError('Sirf 6 digit ka Admin Secret Code enter karein.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/secret-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ secretCode: clean })
      });
      const data = await res.json();
      if (res.ok && data?.ok && data?.role === 'admin') {
        completeLogin(data.profile);
        return;
      }
      if (res.ok && data?.role === 'user') {
        setError('Ye 6-digit code customer account ka hai. Kripya Admin 6-digit Secret Code daalein.');
      } else {
        setError(data?.error || 'Galat Admin 6-digit Secret Code!');
      }
    } catch {
      setError('Server connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
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
              src="/rs-icon-192.png"
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

        {/* Auth Method Switcher */}
        <div className="grid grid-cols-2 border-b border-[#E8E8E8] bg-[#FAF8F5] text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setLoginTab('secret');
              setError(null);
            }}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              loginTab === 'secret'
                ? 'border-[#9F2089] text-[#9F2089] bg-white'
                : 'border-transparent text-[#666666] hover:text-[#222222]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>6-Digit Secret Code</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginTab('credentials');
              setError(null);
            }}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              loginTab === 'credentials'
                ? 'border-[#9F2089] text-[#9F2089] bg-white'
                : 'border-transparent text-[#666666] hover:text-[#222222]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>ID &amp; Password</span>
          </button>
        </div>

        {/* Form Body */}
        {loginTab === 'secret' ? (
          <form onSubmit={handleSecretSubmit} className="p-6 space-y-4">
            <div className="text-xs text-[#666666] bg-[#FAF8F5] p-3 rounded-lg border border-[#E8E8E8] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#9F2089] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Apna <strong>6-Digit Admin Secret Code</strong> enter karein — login hote hi Admin Panel aur aapka saved Admin profile &amp; address turant khul jayega.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2 animate-fadeIn font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-[#222222]">
                <span>Admin 6-Digit Secret Code *</span>
                <span className="font-mono text-[11px] text-[#666666]">{secretCode.length}/6</span>
              </label>
              <div className="relative">
                <input
                  type={showSecretCode ? 'tel' : 'password'}
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoFocus
                  value={secretCode}
                  onChange={(e) => {
                    setSecretCode(normalizeSecretCode(e.target.value));
                    setError(null);
                  }}
                  placeholder="••••••"
                  className="w-full px-4 py-3 text-center text-xl tracking-[0.4em] font-mono font-black border-2 border-[#CCCCCC] rounded-lg focus:border-[#9F2089] focus:ring-1 focus:ring-[#9F2089] focus:outline-none bg-[#FAF8F5]"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretCode((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#888888] hover:text-[#222222]"
                  tabIndex={-1}
                >
                  {showSecretCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-[#777777]">
                Admin Panel ke Users / Admin Profile section se aap kabhi bhi apna 6-digit secret code badal sakte hain.
              </p>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting || secretCode.length !== 6}
                className="w-full py-2.5 bg-[#9F2089] hover:bg-[#80182E] text-white font-bold text-xs rounded-lg transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#FECE57]" />
                    <span>Verifying Secret Code...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#FECE57]" />
                    <span>Verify &amp; Open Admin Panel</span>
                  </>
                )}
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
        ) : (
          <form onSubmit={handleCredentialsSubmit} className="p-6 space-y-4">
            <div className="text-xs text-[#666666] bg-[#FAF8F5] p-3 rounded-lg border border-[#E8E8E8] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#9F2089] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Owner Username &amp; Password enter karke RAZVI SHOP Admin Panel login karein.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2 animate-fadeIn font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

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
                <span>{isSubmitting ? 'Verifying...' : 'Login to RAZVI SHOP Admin Panel'}</span>
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
        )}
      </div>
    </div>
  );
};
