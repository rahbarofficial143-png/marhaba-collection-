import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ShieldCheck, CheckCircle2, Truck, Banknote, 
  Copy, Check, ArrowRight, UserCheck, Landmark, QrCode, ZoomIn, PhoneCall, Video,
  Camera, Image as ImageIcon, Send, Share2, Loader2
} from 'lucide-react';
import { CartItem, Order, UserProfile, PaymentAccount } from '../types';

async function compressScreenshotAsJpeg(file: File): Promise<{ dataUrl: string; jpegFile: File }> {
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read screenshot'));
    reader.onload = (ev) => resolve(String(ev.target?.result || ''));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onerror = () => reject(new Error('Invalid screenshot image'));
    el.onload = () => resolve(el);
    el.src = src;
  });

  const maxDim = 960;
  let w = img.width || 720;
  let h = img.height || 1280;
  if (w > maxDim || h > maxDim) {
    if (w >= h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(240, w);
  canvas.height = Math.max(240, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Adaptive quality so receipt text stays sharp while staying ~25-55 KB
  let quality = 0.72;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > 75000 && quality > 0.36) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  const blob = await (await fetch(dataUrl)).blob();
  const jpegFile = new File([blob], `razvi-payment-${Date.now()}.jpg`, { type: 'image/jpeg' });
  return { dataUrl, jpegFile };
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  couponDiscount: number;
  appliedCode: string;
  onOrderPlaced: (order: Order) => void;
  userProfile: UserProfile | null;
  activePaymentAccount?: PaymentAccount | null;
}

function buildAddressFromProfile(profile: UserProfile | null) {
  if (!profile) {
    return {
      fullName: '',
      phone: '',
      pincode: '',
      addressLine: '',
      city: '',
      state: '',
      landmark: ''
    };
  }
  const combinedLine = [profile.buildingOrVillage, profile.fullAddress]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(', ');
  return {
    fullName: profile.fullName || '',
    phone: profile.phone || '',
    pincode: profile.pincode || '',
    addressLine: combinedLine,
    city: profile.city || '',
    state: profile.state || '',
    landmark: profile.landmark || ''
  };
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  couponDiscount,
  appliedCode,
  onOrderPlaced,
  userProfile,
  activePaymentAccount
}) => {
  const [step, setStep] = useState<'form' | 'confirmed'>('form');
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  // Address State (auto-filled from saved UserProfile, freely editable)
  const [formData, setFormData] = useState(() => buildAddressFromProfile(userProfile));

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi' | 'card'>('upi');
  const [showScreenshotOptions, setShowScreenshotOptions] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [compressedShareFile, setCompressedShareFile] = useState<File | null>(null);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string>('');
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  const [proofId, setProofId] = useState<string>('');
  const [proofPageUrl, setProofPageUrl] = useState<string>('');
  const [proofImageUrl, setProofImageUrl] = useState<string>('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [shareHint, setShareHint] = useState('');
  const [screenshotSent, setScreenshotSent] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [qrZoomed, setQrZoomed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const screenshotSectionRef = useRef<HTMLDivElement | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);
  const directWhatsappLinkRef = useRef<HTMLAnchorElement | null>(null);
  const waitingWhatsappReturnRef = useRef(false);
  const whatsappReturnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setPlacedOrder(null);
      setShowScreenshotOptions(false);
      setScreenshotFile(null);
      setCompressedShareFile(null);
      setScreenshotDataUrl('');
      setScreenshotPreview('');
      setProofId('');
      setProofPageUrl('');
      setProofImageUrl('');
      setIsUploadingProof(false);
      setShareHint('');
      setScreenshotSent(false);
      waitingWhatsappReturnRef.current = false;
      if (whatsappReturnTimerRef.current) clearTimeout(whatsappReturnTimerRef.current);
      setErrors({});
      setQrZoomed(false);
      setFormData(buildAddressFromProfile(userProfile));
    }
  }, [isOpen, userProfile]);

  // Clean up object URL on unmount / change
  useEffect(() => {
    return () => {
      if (screenshotPreview && screenshotPreview.startsWith('blob:')) {
        URL.revokeObjectURL(screenshotPreview);
      }
    };
  }, [screenshotPreview]);

  // Auto-detect when customer returns back to the app after sending screenshot in WhatsApp
  useEffect(() => {
    const completeReturn = () => {
      if (!waitingWhatsappReturnRef.current) return;
      waitingWhatsappReturnRef.current = false;
      if (whatsappReturnTimerRef.current) {
        clearTimeout(whatsappReturnTimerRef.current);
        whatsappReturnTimerRef.current = null;
      }
      setScreenshotSent(true);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.screenshot;
        return next;
      });
      setTimeout(() => {
        submitButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        completeReturn();
      }
    };

    window.addEventListener('focus', completeReturn);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', completeReturn);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (whatsappReturnTimerRef.current) clearTimeout(whatsappReturnTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const merchantPhone = activePaymentAccount?.phone?.trim() || '9334808340';
  const merchantBank = activePaymentAccount?.bankName?.trim() || 'RAZVI SHOP Verified Bank';
  const merchantHolder = activePaymentAccount?.accountHolder?.trim() || 'RAZVI SHOP';
  const merchantUpi = activePaymentAccount?.upiId?.trim() || `${merchantPhone}@ybl`;
  const customQrUrl = activePaymentAccount?.qrImageUrl?.trim() || '';

  const itemsTotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const deliveryFee = 0;
  const finalTotal = Math.max(0, itemsTotal - couponDiscount);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.phone.trim() || !/^\d{10}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Valid 10-digit mobile number required';
    }
    if (!formData.pincode.trim() || !/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = 'Valid 6-digit Pincode required';
    }
    if (!formData.addressLine.trim()) newErrors.addressLine = 'Street address required';
    if (!formData.city.trim()) newErrors.city = 'City required';
    if (!formData.state.trim()) newErrors.state = 'State required';

    if (paymentMethod === 'upi' && !screenshotSent) {
      newErrors.screenshot = 'Proof ke liye WhatsApp icon par click karke payment screenshot bhejein.';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0 && newErrors.screenshot && Object.keys(newErrors).length === 1) {
      screenshotSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(merchantPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(merchantUpi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // UPI deep links (always routed to Admin's active payment account)
  const payeeName = merchantHolder || 'RAZVI SHOP';
  const upiUrl = `upi://pay?pa=${encodeURIComponent(merchantUpi)}&pn=${encodeURIComponent(payeeName)}&am=${finalTotal}&cu=INR`;
  const phonepeUrl = `phonepe://pay?pa=${encodeURIComponent(merchantUpi)}&pn=${encodeURIComponent(payeeName)}&am=${finalTotal}&cu=INR`;
  const gpayUrl = `gpay://upi/pay?pa=${encodeURIComponent(activePaymentAccount?.upiId?.trim() || `${merchantPhone}@okaxis`)}&pn=${encodeURIComponent(payeeName)}&am=${finalTotal}&cu=INR`;
  const paytmUrl = `paytmmp://pay?pa=${encodeURIComponent(activePaymentAccount?.upiId?.trim() || `${merchantPhone}@paytm`)}&pn=${encodeURIComponent(payeeName)}&am=${finalTotal}&cu=INR`;
  const activeQrImage =
    customQrUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUrl)}`;

  // Admin Helpline for Voice / WhatsApp Video Confirmation & Screenshot Proof (Owner: 9334808340)
  const adminHelplinePhone = '9334808340';
  const audioCallUrl = `tel:${adminHelplinePhone}`;
  const whatsappVideoUrl = `https://wa.me/91${adminHelplinePhone}?text=${encodeURIComponent(
    `Assalamu Alaikum! Main RAZVI SHOP par ₹${finalTotal.toLocaleString('en-IN')} ka order (${items.length} item) confirm karne ke liye baat/video call karna chahta hoon.`
  )}`;

  const itemTitlesSummary = items
    .map((item) => `${item.product.title} (${item.selectedSize} x${item.quantity})`)
    .join(', ');
  const proofLinkLine = proofPageUrl
    ? `\n• Payment Screenshot Photo: ${proofPageUrl}`
    : '';
  const whatsappProofText = `Assalamu Alaikum! RAZVI SHOP Payment Screenshot Proof:\n• Name: ${formData.fullName || 'Customer'}\n• Phone: ${formData.phone || '-'}\n• Amount Paid: ₹${finalTotal.toLocaleString('en-IN')}\n• Paid To: ${merchantBank} (${merchantPhone})\n• Order Items: ${itemTitlesSummary}${proofLinkLine}\n\n(Screenshot photo saath me bheja gaya hai)`;
  const whatsappScreenshotUrl = `https://wa.me/91${adminHelplinePhone}?text=${encodeURIComponent(whatsappProofText)}`;

  const syncProofMetadataToServer = (targetId: string, dataUrlToSave: string) => {
    if (!dataUrlToSave) return;
    fetch('/api/payment-proofs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: targetId || undefined,
        imageDataUrl: dataUrlToSave,
        customerName: formData.fullName || 'Customer',
        customerPhone: formData.phone || '-',
        amount: finalTotal,
        bankName: merchantBank,
        merchantPhone,
        itemsSummary: itemTitlesSummary
      })
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data?.id) {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          setProofId(data.id);
          setProofPageUrl(`${origin}${data.pagePath}`);
          setProofImageUrl(`${origin}${data.imagePath}`);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsUploadingProof(false);
      });
  };

  const handleSelectScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (screenshotPreview && screenshotPreview.startsWith('blob:')) {
      URL.revokeObjectURL(screenshotPreview);
    }
    const blobUrl = URL.createObjectURL(file);
    setScreenshotFile(file);
    setScreenshotPreview(blobUrl);
    setScreenshotSent(false);
    setShareHint('');
    setProofId('');
    setProofPageUrl('');
    setProofImageUrl('');
    setIsUploadingProof(true);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.screenshot;
      return next;
    });

    try {
      const { dataUrl, jpegFile } = await compressScreenshotAsJpeg(file);
      setCompressedShareFile(jpegFile);
      setScreenshotDataUrl(dataUrl);
      const generatedId = `prf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      syncProofMetadataToServer(generatedId, dataUrl);
    } catch {
      setCompressedShareFile(file);
      setIsUploadingProof(false);
    }
  };

  const markProofAsSent = () => {
    waitingWhatsappReturnRef.current = false;
    if (whatsappReturnTimerRef.current) {
      clearTimeout(whatsappReturnTimerRef.current);
      whatsappReturnTimerRef.current = null;
    }
    setScreenshotSent(true);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.screenshot;
      return next;
    });
    setTimeout(() => {
      submitButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 220);
  };

  const fileForNativeShare = compressedShareFile || screenshotFile;
  const canShareScreenshotFile =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    Boolean(fileForNativeShare) &&
    (() => {
      try {
        return navigator.canShare({ files: [fileForNativeShare!] });
      } catch {
        return false;
      }
    })();

  const handleLaunchWhatsAppSend = async () => {
    waitingWhatsappReturnRef.current = true;
    setShareHint('');
    if (proofId && screenshotDataUrl) {
      syncProofMetadataToServer(proofId, screenshotDataUrl);
    }
    const copyCandidate = compressedShareFile || screenshotFile;
    if (copyCandidate && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      try {
        const mimeType = copyCandidate.type || 'image/jpeg';
        if (mimeType.startsWith('image/')) {
          await navigator.clipboard.write([new ClipboardItem({ [mimeType]: copyCandidate })]);
        }
      } catch {
        // Ignore clipboard errors on unsupported mobile browsers
      }
    }
    if (whatsappReturnTimerRef.current) clearTimeout(whatsappReturnTimerRef.current);
    whatsappReturnTimerRef.current = setTimeout(() => {
      if (waitingWhatsappReturnRef.current) {
        markProofAsSent();
      }
    }, 2000);
  };

  const handleSharePhotoToWhatsApp = async () => {
    setShareHint('');
    if (proofId && screenshotDataUrl) {
      syncProofMetadataToServer(proofId, screenshotDataUrl);
    }
    const shareTargetFile = compressedShareFile || screenshotFile;
    if (canShareScreenshotFile && shareTargetFile) {
      try {
        await navigator.share({
          files: [shareTargetFile],
          title: 'RAZVI SHOP Payment Screenshot Proof',
          text: whatsappProofText
        });
        // Native WhatsApp Share automatically returns right back here once sent
        markProofAsSent();
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          setShareHint('Share cancel hua. Niche "Direct WhatsApp 9334808340" se screenshot link seedha bhejein.');
          return;
        }
        // If blocked (e.g. iframe), fall through seamlessly to direct WhatsApp 9334808340
      }
    }
    directWhatsappLinkRef.current?.click();
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const orderId = `MC-${randomNum}`;
    const trackingNum = `BLUEDART-${Math.floor(100000000 + Math.random() * 900000000)}`;

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 3);
    const formattedDelivery = deliveryDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    const newOrder: Order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      items: [...items],
      shippingAddress: { ...formData },
      paymentMethod,
      pricing: {
        itemsTotal,
        discount: 0,
        couponDiscount,
        deliveryFee,
        finalTotal
      },
      couponCode: appliedCode,
      status: 'confirmed',
      trackingNumber: trackingNum,
      estimatedDeliveryDate: formattedDelivery,
      utrNumber:
        paymentMethod === 'upi'
          ? proofId
            ? `WA-PROOF:${proofId}`
            : 'WHATSAPP-SCREENSHOT-PROOF'
          : undefined,
      paymentPhone: merchantPhone,
      paymentProofUrl: paymentMethod === 'upi' ? proofPageUrl || undefined : undefined,
      paymentScreenshot:
        paymentMethod === 'upi' ? proofImageUrl || screenshotDataUrl || undefined : undefined
    };

    setPlacedOrder(newOrder);
    onOrderPlaced(newOrder);
    setStep('confirmed');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn text-[#222222]">
      <div
        className="relative bg-white w-full max-w-3xl rounded-lg shadow-2xl border border-[#E8E8E8] overflow-hidden my-auto max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8] bg-[#FAF8F5]">
          <div className="flex items-center gap-2">
            <span className="font-editorial text-lg font-bold text-[#4B0013]">
              RAZVI SHOP
            </span>
            <span className="text-[#888888]">·</span>
            <span className="text-xs font-semibold text-[#666666]">
              {step === 'form' ? 'Express Checkout' : 'Order Placed'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#666666] hover:text-[#222222] rounded-full hover:bg-black/5"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'form' ? (
          <form onSubmit={handlePlaceOrder} className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Delivery Address & Payment Method */}
              <div className="md:col-span-7 space-y-5">
                {/* 1. Delivery Address */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 className="text-xs font-bold text-[#222222] uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-[#9F2089]" />
                      <span>1. Delivery Address</span>
                    </h3>
                    {userProfile && (
                      <button
                        type="button"
                        onClick={() => setFormData(buildAddressFromProfile(userProfile))}
                        className="text-[11px] font-bold text-[#9F2089] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Use Saved Profile</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-[#555555] font-medium mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                        placeholder="Recipient full name"
                      />
                      {errors.fullName && <p className="text-[11px] text-red-600 mt-0.5">{errors.fullName}</p>}
                    </div>

                    <div>
                      <label className="block text-[#555555] font-medium mb-1">10-Digit Mobile Phone *</label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                        placeholder="9876543210"
                      />
                      {errors.phone && <p className="text-[11px] text-red-600 mt-0.5">{errors.phone}</p>}
                    </div>

                    <div>
                      <label className="block text-[#555555] font-medium mb-1">Pincode *</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                        placeholder="110001"
                      />
                      {errors.pincode && <p className="text-[11px] text-red-600 mt-0.5">{errors.pincode}</p>}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[#555555] font-medium mb-1">Flat / House No / Street Address *</label>
                      <input
                        type="text"
                        value={formData.addressLine}
                        onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
                        className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                        placeholder="Flat 402, Royal Palms, Connaught Place"
                      />
                      {errors.addressLine && <p className="text-[11px] text-red-600 mt-0.5">{errors.addressLine}</p>}
                    </div>

                    <div>
                      <label className="block text-[#555555] font-medium mb-1">City *</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                      />
                      {errors.city && <p className="text-[11px] text-red-600 mt-0.5">{errors.city}</p>}
                    </div>

                    <div>
                      <label className="block text-[#555555] font-medium mb-1">State *</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                      />
                      {errors.state && <p className="text-[11px] text-red-600 mt-0.5">{errors.state}</p>}
                    </div>
                  </div>
                </div>

                {/* 2. Payment Method (Featuring PhonePe / UPI to 9334808340) */}
                <div>
                  <h3 className="text-xs font-bold text-[#222222] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-[#9F2089]" />
                    <span>2. Payment Option</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    {/* OPTION A: UPI / PhonePe (9334808340) */}
                    <div
                      className={`p-3.5 rounded-lg border transition-all ${
                        paymentMethod === 'upi'
                          ? 'border-[#9F2089] bg-[#FDE5F4]/20 ring-1 ring-[#9F2089]'
                          : 'border-[#CCCCCC] bg-white'
                      }`}
                    >
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="payment"
                          value="upi"
                          checked={paymentMethod === 'upi'}
                          onChange={() => setPaymentMethod('upi')}
                          className="mt-0.5 text-[#9F2089] focus:ring-[#9F2089]"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-[#222222]">
                              UPI / PhonePe / GPay / Paytm
                            </span>
                            <span className="text-[10px] bg-[#9F2089] text-white font-bold px-2 py-0.5 rounded">
                              Instant App Pay
                            </span>
                          </div>

                          <div className="text-[11px] text-[#555555] mt-1">
                            Pay directly via PhonePe, GPay, Paytm, Airtel Bank ya FamPay to phone number:
                          </div>
                        </div>
                      </label>

                      {/* Expanded UPI App Launcher, Admin QR Scanner & Bank Details */}
                      {paymentMethod === 'upi' && (
                        <div className="mt-3 pt-3 border-t border-[#E8E8E8] space-y-3">
                          {/* Admin Bank Name, Account Holder, Phone Number & Copy */}
                          <div className="p-3 bg-white rounded-lg border border-[#E8E8E8] space-y-2 shadow-2xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#F0F0F2]">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#4B0013]">
                                <Landmark className="w-3.5 h-3.5 text-[#9F2089]" />
                                <span>Bank: {merchantBank}</span>
                              </div>
                              {activePaymentAccount?.accountHolder && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#E8E8E8] text-[#444444]">
                                  A/C: {merchantHolder}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="text-[10px] text-[#888888] font-bold uppercase tracking-wider">
                                  Payment Phone Number:
                                </div>
                                <div className="text-base font-black text-[#9F2089] tracking-wider font-mono">
                                  {merchantPhone}
                                </div>
                                <div className="text-[10px] text-[#666666] flex items-center gap-1.5 mt-0.5">
                                  <span>UPI ID: <strong>{merchantUpi}</strong></span>
                                  <button
                                    type="button"
                                    onClick={handleCopyUpi}
                                    className="text-[#9F2089] font-bold hover:underline cursor-pointer"
                                  >
                                    {copiedUpi ? 'Copied!' : 'Copy UPI'}
                                  </button>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={handleCopyPhone}
                                className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#FDE5F4] border border-[#CCCCCC] text-[#9F2089] font-bold text-xs rounded flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                {copiedPhone ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedPhone ? 'Copied!' : 'Copy Number'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Admin QR Code Scanner Box (Clear, Scannable, Tap-to-Zoom) */}
                          <div className="p-3.5 bg-white rounded-lg border-2 border-[#9F2089]/30 flex flex-col sm:flex-row items-center gap-3.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setQrZoomed((z) => !z)}
                              className="relative group shrink-0 bg-white p-1.5 rounded-lg border border-[#E8E8E8] shadow-xs cursor-pointer"
                              title="Tap to zoom QR Scanner"
                            >
                              <img
                                src={activeQrImage}
                                alt={`Scan QR to pay ${merchantBank}`}
                                className={`${qrZoomed ? 'w-52 h-52' : 'w-28 h-28'} object-contain rounded transition-all`}
                              />
                              <span className="mt-1 flex items-center justify-center gap-1 text-[9px] font-bold text-[#9F2089]">
                                <ZoomIn className="w-3 h-3" />
                                <span>{qrZoomed ? 'Tap to Shrink' : 'Tap to Zoom QR'}</span>
                              </span>
                            </button>

                            <div className="text-[11px] text-[#555555] space-y-1.5 text-center sm:text-left">
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                                <QrCode className="w-3 h-3" />
                                <span>Direct Merchant QR Scanner</span>
                              </div>
                              <div className="font-bold text-xs text-[#222222]">
                                Scan QR Code &amp; Pay ₹{finalTotal.toLocaleString('en-IN')}
                              </div>
                              <p className="leading-relaxed">
                                PhonePe, Google Pay, Paytm ya kisi bhi UPI app se scan karein. Paisa seedha <strong>{merchantBank}</strong> ({merchantPhone}) me jayega.
                              </p>
                            </div>
                          </div>

                          {/* 1-Click App Buttons */}
                          <div>
                            <div className="text-[11px] font-bold text-[#222222] mb-1.5">
                              Click to open your payment app directly:
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {/* PhonePe */}
                              <a
                                href={phonepeUrl}
                                className="px-2.5 py-2 bg-[#5F259F] text-white rounded text-center font-bold text-xs hover:bg-[#4D1D82] transition-colors flex items-center justify-center gap-1 shadow-2xs"
                              >
                                <span>PhonePe</span>
                              </a>

                              {/* Google Pay */}
                              <a
                                href={gpayUrl}
                                className="px-2.5 py-2 bg-[#1A73E8] text-white rounded text-center font-bold text-xs hover:bg-[#1557B0] transition-colors flex items-center justify-center gap-1 shadow-2xs"
                              >
                                <span>Google Pay</span>
                              </a>

                              {/* Paytm */}
                              <a
                                href={paytmUrl}
                                className="px-2.5 py-2 bg-[#00BAF2] text-white rounded text-center font-bold text-xs hover:bg-[#0092BE] transition-colors flex items-center justify-center gap-1 shadow-2xs"
                              >
                                <span>Paytm</span>
                              </a>

                              {/* Airtel / FamPay / Any UPI */}
                              <a
                                href={upiUrl}
                                className="px-2.5 py-2 bg-[#038D63] text-white rounded text-center font-bold text-xs hover:bg-[#026B4B] transition-colors flex items-center justify-center gap-1 shadow-2xs"
                              >
                                <span>Airtel / FamPay</span>
                              </a>
                            </div>
                          </div>

                          {/* WhatsApp Payment Screenshot Proof Column (Replaces 12-Digit UTR) */}
                          <div
                            ref={screenshotSectionRef}
                            className="bg-white p-3.5 rounded-lg border-2 border-[#25D366]/45 space-y-3 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-bold text-[#222222]">
                                  Send Your Screenshot *
                                </div>
                                <p className="text-[11px] text-[#555555] mt-0.5">
                                  Proof ke liye apna payment screenshot ismein bhejein (Owner WhatsApp: <strong className="font-mono text-[#075E54]">{adminHelplinePhone}</strong>)
                                </p>
                              </div>
                            </div>

                            {/* Step 1: Clickable WhatsApp Icon Button */}
                            {!screenshotPreview && !screenshotSent && (
                              <button
                                type="button"
                                onClick={() => setShowScreenshotOptions((prev) => !prev)}
                                className="w-full py-2.5 px-3 rounded-lg bg-[#25D366] hover:bg-[#1EB954] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  className="w-5 h-5 shrink-0"
                                  aria-hidden="true"
                                >
                                  <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.469 3.484 1.344 5l-1.406 5.156 5.281-1.375c1.469.797 3.109 1.219 4.75 1.219 5.516 0 9.969-4.453 9.969-9.969S17.547 2 12.031 2zm5.813 14.125c-.25.703-1.438 1.344-2 1.438-.516.078-1.188.109-1.906-.125-.438-.141-1-.328-1.719-.641-3.031-1.313-5-4.375-5.156-4.578-.141-.203-1.234-1.641-1.234-3.125s.781-2.219 1.063-2.516c.281-.297.609-.375.813-.375h.594c.188 0 .438-.078.688.516.25.609.859 2.094.938 2.25.078.156.125.344.031.547-.109.203-.156.328-.313.5-.156.172-.328.391-.469.516-.156.141-.313.297-.141.594.172.297.766 1.266 1.656 2.047 1.141 1.016 2.094 1.328 2.391 1.484.297.141.469.125.641-.078.172-.203.75-.875.953-1.172.203-.297.406-.25.688-.141.281.094 1.781.844 2.078.984.297.156.5.219.578.344.078.125.078.734-.172 1.438z" />
                                </svg>
                                <span>Send Your Screenshot (WhatsApp Proof)</span>
                              </button>
                            )}

                            {/* Step 2: 2 Options after clicking WhatsApp Icon — Photo or Gallery */}
                            {showScreenshotOptions && !screenshotPreview && !screenshotSent && (
                              <div className="p-2.5 bg-[#FAF8F5] rounded-lg border border-[#E8E8E8] space-y-2 animate-fadeIn">
                                <div className="text-[11px] font-bold text-[#222222] text-center">
                                  Option Chunein (Photo ya Gallery):
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <label className="py-2.5 px-3 bg-white hover:bg-[#FDE5F4]/40 border border-[#9F2089]/40 rounded-md flex flex-col items-center justify-center gap-1 cursor-pointer text-[#9F2089] font-bold text-[11px] shadow-2xs transition-colors">
                                    <Camera className="w-4 h-4" />
                                    <span>Photo / Camera</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      onChange={handleSelectScreenshot}
                                      className="hidden"
                                    />
                                  </label>

                                  <label className="py-2.5 px-3 bg-white hover:bg-[#E7F8EE] border border-[#25D366]/50 rounded-md flex flex-col items-center justify-center gap-1 cursor-pointer text-[#075E54] font-bold text-[11px] shadow-2xs transition-colors">
                                    <ImageIcon className="w-4 h-4 text-[#25D366]" />
                                    <span>Gallery Se Chunein</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleSelectScreenshot}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* Step 3: Screenshot Preview + Real Photo Upload + Owner WhatsApp Send (9334808340) */}
                            {screenshotPreview && !screenshotSent && (
                              <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#25D366]/50 space-y-2.5 animate-fadeIn">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={screenshotPreview}
                                    alt="Selected payment screenshot"
                                    className="w-16 h-20 object-cover rounded border border-[#CCCCCC] bg-white shrink-0"
                                  />
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="text-xs font-bold text-[#222222] truncate">
                                      {screenshotFile?.name || 'Payment Screenshot Ready'}
                                    </div>
                                    <p className="text-[11px] text-[#555555]">
                                      {isUploadingProof
                                        ? 'Screenshot photo taiyar ho raha hai...'
                                        : 'Screenshot Owner panel ke liye ready hai! Ab niche click karke WhatsApp par bhejein (send karte hi app me wapas aa jayega).'}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setScreenshotPreview('');
                                        setScreenshotFile(null);
                                        setCompressedShareFile(null);
                                        setScreenshotDataUrl('');
                                        setProofId('');
                                        setProofPageUrl('');
                                        setProofImageUrl('');
                                        setShareHint('');
                                        setShowScreenshotOptions(true);
                                      }}
                                      className="text-[10px] font-bold text-[#9F2089] hover:underline cursor-pointer"
                                    >
                                      Change Screenshot
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {canShareScreenshotFile && (
                                    <button
                                      type="button"
                                      disabled={isUploadingProof}
                                      onClick={handleSharePhotoToWhatsApp}
                                      className="w-full py-2.5 px-3 rounded-md bg-[#25D366] hover:bg-[#1EB954] disabled:opacity-70 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                                    >
                                      {isUploadingProof ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                      ) : (
                                        <Share2 className="w-3.5 h-3.5 shrink-0" />
                                      )}
                                      <span>
                                        {isUploadingProof
                                          ? 'Preparing Screenshot Photo...'
                                          : `Send Actual Screenshot Photo to WhatsApp (${adminHelplinePhone})`}
                                      </span>
                                    </button>
                                  )}

                                  <a
                                    ref={directWhatsappLinkRef}
                                    href={isUploadingProof ? undefined : whatsappScreenshotUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => {
                                      if (isUploadingProof) {
                                        e.preventDefault();
                                        return;
                                      }
                                      handleLaunchWhatsAppSend();
                                    }}
                                    className={`w-full py-2.5 px-3 rounded-md font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors ${
                                      canShareScreenshotFile
                                        ? 'bg-white hover:bg-[#E7F8EE] text-[#075E54] border border-[#25D366]'
                                        : 'bg-[#25D366] hover:bg-[#1EB954] text-white'
                                    } ${isUploadingProof ? 'opacity-70 pointer-events-none' : ''}`}
                                  >
                                    {isUploadingProof ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                    ) : (
                                      <Send className="w-3.5 h-3.5 shrink-0" />
                                    )}
                                    <span>
                                      {isUploadingProof
                                        ? 'Uploading Screenshot Link...'
                                        : canShareScreenshotFile
                                          ? `Direct Chat ${adminHelplinePhone} (With Screenshot Link)`
                                          : `Send Screenshot Proof to WhatsApp (${adminHelplinePhone})`}
                                    </span>
                                  </a>

                                  {shareHint && (
                                    <p className="text-[10px] font-semibold text-[#9F2089] text-center">
                                      {shareHint}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Step 4: Returned from WhatsApp -> Ready to Submit Success Banner */}
                            {screenshotSent && (
                              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg space-y-2 animate-fadeIn">
                                <div className="flex items-center gap-2.5">
                                  {screenshotPreview && (
                                    <img
                                      src={screenshotPreview}
                                      alt="Uploaded payment screenshot proof"
                                      className="w-10 h-12 object-cover rounded border border-emerald-300 bg-white shrink-0"
                                    />
                                  )}
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                      <span>Aapka screenshot successfully send ho gaya hai!</span>
                                    </div>
                                    <p className="text-[11px] text-emerald-700 leading-relaxed">
                                      Ab aap niche <strong>Submit Payment &amp; Confirm Order</strong> button par click karke apna order confirm kar sakte hain.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {errors.screenshot && (
                              <p className="text-[11px] text-red-600 font-bold">{errors.screenshot}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* OPTION B: Cash on Delivery */}
                    <div
                      className={`p-3.5 rounded-lg border transition-all ${
                        paymentMethod === 'cod'
                          ? 'border-[#9F2089] bg-[#FDE5F4]/20 ring-1 ring-[#9F2089]'
                          : 'border-[#CCCCCC] bg-white'
                      }`}
                    >
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="payment"
                          value="cod"
                          checked={paymentMethod === 'cod'}
                          onChange={() => setPaymentMethod('cod')}
                          className="mt-0.5 text-[#9F2089] focus:ring-[#9F2089]"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-[#222222]">
                              Cash on Delivery (COD)
                            </span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                              Verified
                            </span>
                          </div>
                          <p className="text-[11px] text-[#555555] mt-0.5">
                            Pay cash at your doorstep after inspecting the master-weaver packaging.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Order Summary & Review */}
              <div className="md:col-span-5 bg-[#FAF8F5] p-4 rounded-lg border border-[#E8E8E8] flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-[#222222] uppercase tracking-wider mb-2">
                    Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
                  </h4>

                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1 border-b border-[#E8E8E8] pb-3 mb-3">
                    {items.map((item) => (
                      <div
                        key={`${item.product.id}-${item.selectedSize}`}
                        className="flex items-center gap-2 text-xs"
                      >
                        <img
                          src={item.product.images[0]}
                          alt={item.product.title}
                          className="w-10 h-12 object-cover rounded border border-[#E8E8E8]"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#222222] truncate">
                            {item.product.title}
                          </div>
                          <div className="text-[10px] text-[#888888]">
                            Qty: {item.quantity} · {item.selectedSize}
                          </div>
                        </div>
                        <div className="font-bold text-[#222222] tabular-nums">
                          ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calculations */}
                  <div className="space-y-1.5 text-xs text-[#555555]">
                    <div className="flex justify-between">
                      <span>Items Subtotal</span>
                      <span className="tabular-nums font-semibold text-[#222222]">₹{itemsTotal.toLocaleString('en-IN')}</span>
                    </div>
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-[#9F2089] font-medium">
                        <span>Coupon Savings ({appliedCode})</span>
                        <span className="tabular-nums">-₹{couponDiscount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {/* Pre-Payment Admin / Owner Confirmation (Audio Dialer & WhatsApp Video Call) */}
                    <div className="my-2.5 p-3 rounded-lg bg-white border border-[#9F2089]/30 shadow-2xs space-y-2">
                      <div className="text-[11px] font-bold text-[#4B0013] leading-snug">
                        Aap payment karne se pehle ek baar Admin / Owner se baat karke order confirm kar lein:
                      </div>
                      <div className="text-[10px] font-mono font-bold text-[#666666]">
                        Admin Helpline: <span className="text-[#9F2089]">{adminHelplinePhone}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <a
                          href={audioCallUrl}
                          className="px-2.5 py-2 rounded-md bg-[#9F2089] hover:bg-[#80182E] text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                        >
                          <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                          <span>Audio Call</span>
                        </a>

                        <a
                          href={whatsappVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-2 rounded-md bg-[#25D366] hover:bg-[#1EB954] text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-3.5 h-3.5 shrink-0"
                            aria-hidden="true"
                          >
                            <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.469 3.484 1.344 5l-1.406 5.156 5.281-1.375c1.469.797 3.109 1.219 4.75 1.219 5.516 0 9.969-4.453 9.969-9.969S17.547 2 12.031 2zm5.813 14.125c-.25.703-1.438 1.344-2 1.438-.516.078-1.188.109-1.906-.125-.438-.141-1-.328-1.719-.641-3.031-1.313-5-4.375-5.156-4.578-.141-.203-1.234-1.641-1.234-3.125s.781-2.219 1.063-2.516c.281-.297.609-.375.813-.375h.594c.188 0 .438-.078.688.516.25.609.859 2.094.938 2.25.078.156.125.344.031.547-.109.203-.156.328-.313.5-.156.172-.328.391-.469.516-.156.141-.313.297-.141.594.172.297.766 1.266 1.656 2.047 1.141 1.016 2.094 1.328 2.391 1.484.297.141.469.125.641-.078.172-.203.75-.875.953-1.172.203-.297.406-.25.688-.141.281.094 1.781.844 2.078.984.297.156.5.219.578.344.078.125.078.734-.172 1.438z" />
                          </svg>
                          <Video className="w-3.5 h-3.5 shrink-0" />
                          <span>Video Call</span>
                        </a>
                      </div>
                    </div>

                    <div className="border-t border-[#E8E8E8] pt-2 flex justify-between text-base font-extrabold text-[#222222]">
                      <span>Total Amount</span>
                      <span className="text-[#9F2089] tabular-nums">
                        ₹{finalTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {paymentMethod === 'upi' && screenshotSent && (
                    <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Screenshot send ho gaya hai — ab aap Submit kar sakte hain!</span>
                    </div>
                  )}

                  <button
                    ref={submitButtonRef}
                    type="submit"
                    className="w-full py-3 bg-[#9F2089] hover:bg-[#80182E] text-white text-xs sm:text-sm font-bold rounded-md transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Submit Payment &amp; Confirm Order (₹{finalTotal.toLocaleString('en-IN')})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#888888]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#038D63]" />
                    <span>100% Verified · Direct Loom Purity Guarantee</span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        ) : (
          /* Order Confirmed Screen */
          <div className="p-6 sm:p-8 overflow-y-auto flex-1 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <h3 className="font-editorial text-2xl font-bold text-[#222222]">
                Aapka Order Confirm Ho Gaya Hai!
              </h3>
              <p className="text-xs text-[#555555]">
                Order <strong>#{placedOrder?.id}</strong> is successfully confirmed with RAZVI SHOP.
              </p>
              {placedOrder?.utrNumber && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-xs font-semibold mt-2">
                  Payment screenshot proof sent on WhatsApp to <strong>{adminHelplinePhone}</strong> ({merchantBank} · {placedOrder.paymentPhone || merchantPhone})
                </div>
              )}
            </div>

            {/* Tracking Progress */}
            <div className="w-full max-w-lg bg-[#FAF8F5] border border-[#E8E8E8] rounded-lg p-4 text-left space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E8E8E8]">
                <div>
                  <span className="text-[#888888]">Tracking:</span>{' '}
                  <strong className="text-[#222222]">{placedOrder?.trackingNumber}</strong>
                </div>
                <div>
                  <span className="text-[#888888]">Estimated Delivery:</span>{' '}
                  <strong className="text-emerald-800">{placedOrder?.estimatedDeliveryDate}</strong>
                </div>
              </div>

              {/* 4 Steps */}
              <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                <div className="space-y-1">
                  <div className="w-6 h-6 mx-auto rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                    ✓
                  </div>
                  <div className="text-[10px] font-bold text-[#222222]">Payment Received</div>
                </div>

                <div className="space-y-1">
                  <div className="w-6 h-6 mx-auto rounded-full bg-[#FECE57] text-[#4B0013] text-[10px] font-bold flex items-center justify-center">
                    2
                  </div>
                  <div className="text-[10px] font-semibold text-[#555555]">Loom Packing</div>
                </div>

                <div className="space-y-1">
                  <div className="w-6 h-6 mx-auto rounded-full bg-[#E2DCD5] text-[#888888] text-[10px] font-bold flex items-center justify-center">
                    3
                  </div>
                  <div className="text-[10px] text-[#888888]">Quality Seal</div>
                </div>

                <div className="space-y-1">
                  <div className="w-6 h-6 mx-auto rounded-full bg-[#E2DCD5] text-[#888888] text-[10px] font-bold flex items-center justify-center">
                    4
                  </div>
                  <div className="text-[10px] text-[#888888]">Dispatched</div>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-[#9F2089] text-white text-xs font-bold rounded hover:bg-[#80182E] transition-colors"
            >
              Continue Browsing RAZVI SHOP
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
