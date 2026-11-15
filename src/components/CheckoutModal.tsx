import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, CheckCircle2, Truck, Banknote, 
  Copy, Check, ArrowRight, UserCheck, Landmark, QrCode, ZoomIn, PhoneCall, Video
} from 'lucide-react';
import { CartItem, Order, UserProfile, PaymentAccount } from '../types';

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
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [qrZoomed, setQrZoomed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setPlacedOrder(null);
      setUtrNumber('');
      setErrors({});
      setQrZoomed(false);
      setFormData(buildAddressFromProfile(userProfile));
    }
  }, [isOpen, userProfile]);

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

    if (paymentMethod === 'upi' && !utrNumber.trim()) {
      newErrors.utr = 'Please enter 12-digit UPI Reference / UTR Number after payment';
    }

    setErrors(newErrors);
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

  // Admin Helpline for Pre-Payment Voice / WhatsApp Video Confirmation
  const adminHelplinePhone = '9334808340';
  const audioCallUrl = `tel:${adminHelplinePhone}`;
  const whatsappVideoUrl = `https://wa.me/91${adminHelplinePhone}?text=${encodeURIComponent(
    `Assalamu Alaikum! Main RAZVI SHOP par ₹${finalTotal.toLocaleString('en-IN')} ka order (${items.length} item) confirm karne ke liye baat/video call karna chahta hoon.`
  )}`;

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
      utrNumber: paymentMethod === 'upi' ? utrNumber : undefined,
      paymentPhone: merchantPhone
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

                          {/* UTR / Transaction Reference Input */}
                          <div className="bg-white p-3 rounded border border-[#CCCCCC] space-y-1">
                            <label className="block text-xs font-bold text-[#222222]">
                              Payment ke baad 12-digit UTR / UPI Ref Number yahan likhein: *
                            </label>
                            <input
                              type="text"
                              value={utrNumber}
                              onChange={(e) => setUtrNumber(e.target.value)}
                              placeholder="e.g. 412345678901 (from your payment receipt)"
                              className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none font-mono text-xs font-bold"
                            />
                            {errors.utr && <p className="text-[11px] text-red-600 font-bold">{errors.utr}</p>}
                            <span className="text-[10px] text-[#888888] block">
                              Payment complete hone par aapke app mein 12-digit UPI Transaction / UTR number milta hai.
                            </span>
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
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#9F2089] hover:bg-[#80182E] text-white text-xs sm:text-sm font-bold rounded-md transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
                  >
                    <span>Submit Payment & Confirm Order (₹{finalTotal.toLocaleString('en-IN')})</span>
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

            <div className="space-y-1 max-w-md">
              <h3 className="font-editorial text-2xl font-bold text-[#222222]">
                Order Confirmed!
              </h3>
              <p className="text-xs text-[#555555]">
                Order <strong>#{placedOrder?.id}</strong> is registered with RAZVI SHOP.
              </p>
              {placedOrder?.utrNumber && (
                <div className="p-2 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-xs font-semibold mt-2">
                  Payment verified via UPI / QR to <strong>{placedOrder.paymentPhone || merchantPhone}</strong> ({merchantBank}) · UTR: {placedOrder.utrNumber}
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
