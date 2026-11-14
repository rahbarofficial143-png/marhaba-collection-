import React, { useState, useEffect } from 'react';
import {
  X, User, Package, Edit3, CheckCircle2, MapPin, Phone, Calendar,
  Building2, Home, Truck, Clock, ShoppingBag, ChevronDown, ChevronUp, ShieldCheck, LogOut
} from 'lucide-react';
import { Order, UserProfile } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  initialTab?: 'profile' | 'orders';
  onClose: () => void;
  userProfile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
  onOpenCreateAccount: () => void;
  onLogout: () => void;
  orders: Order[];
}

function getStatusMeta(status: Order['status']) {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending',
        stepIndex: 0,
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        summary: 'Order received — awaiting payment/confirmation'
      };
    case 'confirmed':
      return {
        label: 'Confirmed',
        stepIndex: 1,
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        summary: 'Order confirmed by RAZVI SHOP'
      };
    case 'artisan_packing':
    case 'loom_inspection':
      return {
        label: status === 'loom_inspection' ? 'Quality Checked & Packed' : 'Packed',
        stepIndex: 2,
        badgeClass: 'bg-purple-100 text-[#9F2089] border-purple-200',
        summary: 'Handloom packed & ready for dispatch'
      };
    case 'dispatched':
      return {
        label: 'Shipped / In Transit',
        stepIndex: 3,
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        summary: 'Package shipped with BlueDart Express'
      };
    case 'out_for_delivery':
      return {
        label: 'Out for Delivery',
        stepIndex: 4,
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
        summary: 'Delivery partner is on the way to your address'
      };
    case 'delivered':
      return {
        label: 'Delivered',
        stepIndex: 5,
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        summary: 'Delivered successfully to recipient'
      };
    default:
      return {
        label: 'Confirmed',
        stepIndex: 1,
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        summary: 'Order confirmed'
      };
  }
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  initialTab = 'profile',
  onClose,
  userProfile,
  onUpdateProfile,
  onOpenCreateAccount,
  onLogout,
  orders
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    age: '',
    buildingOrVillage: '',
    fullAddress: '',
    landmark: '',
    city: '',
    state: '',
    pincode: ''
  });

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setIsEditing(false);
      setConfirmLogout(false);
      setSaveNotice(null);
      setErrors({});
      if (userProfile) {
        setFormData({
          fullName: userProfile.fullName,
          phone: userProfile.phone,
          age: userProfile.age,
          buildingOrVillage: userProfile.buildingOrVillage,
          fullAddress: userProfile.fullAddress,
          landmark: userProfile.landmark || '',
          city: userProfile.city,
          state: userProfile.state,
          pincode: userProfile.pincode
        });
      }
      // Auto-expand latest order tracker if orders exist
      if (orders.length > 0) {
        setExpandedOrderIds((prev) => ({ [orders[0].id]: true, ...prev }));
      }
    }
  }, [isOpen, initialTab, userProfile]);

  if (!isOpen) return null;

  const toggleTrackOrder = (orderId: string) => {
    setExpandedOrderIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Name required';
    if (!/^\d{10}$/.test(formData.phone.trim())) newErrors.phone = '10-digit phone required';
    const numericAge = Number(formData.age.trim());
    if (!formData.age.trim() || Number.isNaN(numericAge) || numericAge < 10 || numericAge > 110) {
      newErrors.age = 'Valid age required';
    }
    if (!formData.buildingOrVillage.trim()) newErrors.buildingOrVillage = 'Building / Village required';
    if (!formData.fullAddress.trim()) newErrors.fullAddress = 'Full address required';
    if (!formData.city.trim()) newErrors.city = 'City required';
    if (!formData.state.trim()) newErrors.state = 'State required';
    if (!/^\d{6}$/.test(formData.pincode.trim())) newErrors.pincode = '6-digit pincode required';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const updated: UserProfile = {
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim(),
      age: formData.age.trim(),
      buildingOrVillage: formData.buildingOrVillage.trim(),
      fullAddress: formData.fullAddress.trim(),
      landmark: formData.landmark.trim() || undefined,
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      createdAt: userProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onUpdateProfile(updated);
    setIsEditing(false);
    setSaveNotice('Profile details saved permanently on your device!');
    setTimeout(() => setSaveNotice(null), 3500);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-fadeIn text-[#222222]"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-[#E8E8E8] overflow-hidden my-auto max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4B0013] via-[#80182E] to-[#9F2089] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/15 border border-white/25 flex items-center justify-center font-bold text-base text-[#FECE57]">
              {userProfile?.fullName ? userProfile.fullName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">
                {userProfile?.fullName || 'My Account'}
              </h2>
              <p className="text-[11px] text-white/80">
                {userProfile ? `+91 ${userProfile.phone} · ${userProfile.city}, ${userProfile.state}` : 'Profile & Order Tracking'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {userProfile && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('profile');
                  setIsEditing(false);
                  setConfirmLogout(true);
                }}
                className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-md flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                title="Logout from Account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-white/85 hover:text-white rounded-full hover:bg-white/15"
              aria-label="Close profile"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs: My Profile | My Orders */}
        <div className="grid grid-cols-2 border-b border-[#E8E8E8] bg-[#FAF8F5] shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#9F2089] text-[#9F2089] bg-white'
                : 'border-transparent text-[#666666] hover:text-[#222222]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>My Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-3 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'orders'
                ? 'border-[#9F2089] text-[#9F2089] bg-white'
                : 'border-transparent text-[#666666] hover:text-[#222222]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>My Orders ({orders.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4">
          {activeTab === 'profile' ? (
            !userProfile ? (
              <div className="py-10 text-center space-y-3">
                <User className="w-12 h-12 text-[#CCCCCC] mx-auto" />
                <div className="font-bold text-sm text-[#222222]">No Account Saved Yet</div>
                <p className="text-xs text-[#666666] max-w-xs mx-auto">
                  Create your account once so your address auto-fills on every order.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCreateAccount();
                  }}
                  className="px-5 py-2.5 bg-[#9F2089] text-white text-xs font-bold rounded-lg hover:bg-[#80182E]"
                >
                  Create Account Now
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {saveNotice && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{saveNotice}</span>
                  </div>
                )}

                {/* Quick My Orders Summary Banner */}
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="w-full p-3.5 bg-[#FDE5F4]/40 hover:bg-[#FDE5F4]/70 border border-[#9F2089]/25 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#9F2089] text-white flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#222222]">
                        My Orders ({orders.length})
                      </div>
                      <div className="text-[11px] text-[#555555]">
                        Track live order status — Confirmed, Pending, Out for Delivery &amp; Delivered
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#9F2089] shrink-0">View Orders →</span>
                </button>

                {!isEditing ? (
                  <div className="bg-[#FAF8F5] border border-[#E8E8E8] rounded-xl p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-2.5">
                      <span className="font-bold text-[#222222] uppercase tracking-wider text-[11px]">
                        Saved Account &amp; Delivery Details
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1.5 bg-[#9F2089] hover:bg-[#80182E] text-white rounded-md font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Profile</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white p-2.5 rounded-lg border border-[#EFEAE2]">
                        <div className="text-[10px] text-[#888888] font-semibold">Full Name</div>
                        <div className="font-bold text-[#222222] mt-0.5">{userProfile.fullName}</div>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-[#EFEAE2]">
                        <div className="text-[10px] text-[#888888] font-semibold">Phone Number</div>
                        <div className="font-bold text-[#222222] font-mono mt-0.5">+91 {userProfile.phone}</div>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-[#EFEAE2]">
                        <div className="text-[10px] text-[#888888] font-semibold">Age</div>
                        <div className="font-bold text-[#222222] mt-0.5">{userProfile.age} Years</div>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-[#EFEAE2]">
                        <div className="text-[10px] text-[#888888] font-semibold">Pincode</div>
                        <div className="font-bold text-[#222222] font-mono mt-0.5">{userProfile.pincode}</div>
                      </div>
                      <div className="sm:col-span-2 bg-white p-2.5 rounded-lg border border-[#EFEAE2]">
                        <div className="text-[10px] text-[#888888] font-semibold">Village / Building Name</div>
                        <div className="font-bold text-[#222222] mt-0.5">{userProfile.buildingOrVillage}</div>
                      </div>
                      <div className="sm:col-span-2 bg-white p-2.5 rounded-lg border border-[#EFEAE2]">
                        <div className="text-[10px] text-[#888888] font-semibold">Full Address</div>
                        <div className="font-medium text-[#222222] mt-0.5">
                          {userProfile.fullAddress}
                          {userProfile.landmark ? `, Near ${userProfile.landmark}` : ''}
                        </div>
                        <div className="text-[11px] text-[#555555] mt-1 font-semibold">
                          {userProfile.city}, {userProfile.state} - {userProfile.pincode}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-[#038D63] font-medium pt-1">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Automatically pre-fills your delivery address whenever you place an order.</span>
                    </div>

                    {/* Account Logout Bar */}
                    <div className="pt-3 mt-2 border-t border-[#E8E8E8]">
                      {confirmLogout ? (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2.5">
                          <div className="text-xs font-bold text-red-900">
                            Kya aap apne account se Logout karna chahte hain?
                          </div>
                          <p className="text-[11px] text-red-700">
                            Logout karne ke baad saved profile aur delivery address is device se clear ho jayega aur aap naya account bana sakenge.
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmLogout(false);
                                onLogout();
                              }}
                              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md flex items-center gap-1.5 cursor-pointer"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Yes, Logout</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmLogout(false)}
                              className="px-3.5 py-1.5 bg-white border border-[#CCCCCC] hover:bg-slate-50 text-[#222222] font-semibold text-xs rounded-md cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmLogout(true)}
                          className="w-full py-2.5 bg-white hover:bg-red-50 border border-red-200 text-red-600 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Logout Account</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveProfile} className="bg-[#FAF8F5] border border-[#E8E8E8] rounded-xl p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-2">
                      <span className="font-bold text-[#222222]">Edit Your Profile Details</span>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="text-[#666666] hover:text-[#222222] font-semibold"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block font-bold mb-1">Full Name *</label>
                        <input
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                        />
                        {errors.fullName && <p className="text-[10px] text-red-600 mt-0.5">{errors.fullName}</p>}
                      </div>

                      <div>
                        <label className="flex items-center gap-1 font-bold mb-1">
                          <Phone className="w-3 h-3 text-[#9F2089]" />
                          <span>Phone No *</span>
                        </label>
                        <input
                          type="tel"
                          maxLength={10}
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                          className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none font-mono"
                        />
                        {errors.phone && <p className="text-[10px] text-red-600 mt-0.5">{errors.phone}</p>}
                      </div>

                      <div>
                        <label className="flex items-center gap-1 font-bold mb-1">
                          <Calendar className="w-3 h-3 text-[#9F2089]" />
                          <span>Age *</span>
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={110}
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                        />
                        {errors.age && <p className="text-[10px] text-red-600 mt-0.5">{errors.age}</p>}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="flex items-center gap-1 font-bold mb-1">
                          <Building2 className="w-3 h-3 text-[#9F2089]" />
                          <span>Village / Building Name *</span>
                        </label>
                        <input
                          type="text"
                          value={formData.buildingOrVillage}
                          onChange={(e) => setFormData({ ...formData, buildingOrVillage: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                        />
                        {errors.buildingOrVillage && <p className="text-[10px] text-red-600 mt-0.5">{errors.buildingOrVillage}</p>}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="flex items-center gap-1 font-bold mb-1">
                          <Home className="w-3 h-3 text-[#9F2089]" />
                          <span>Full Address *</span>
                        </label>
                        <textarea
                          rows={2}
                          value={formData.fullAddress}
                          onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none resize-none"
                        />
                        {errors.fullAddress && <p className="text-[10px] text-red-600 mt-0.5">{errors.fullAddress}</p>}
                      </div>

                      <div>
                        <label className="block font-bold mb-1">City *</label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                        />
                        {errors.city && <p className="text-[10px] text-red-600 mt-0.5">{errors.city}</p>}
                      </div>

                      <div>
                        <label className="block font-bold mb-1">State *</label>
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                        />
                        {errors.state && <p className="text-[10px] text-red-600 mt-0.5">{errors.state}</p>}
                      </div>

                      <div>
                        <label className="flex items-center gap-1 font-bold mb-1">
                          <MapPin className="w-3 h-3 text-[#9F2089]" />
                          <span>Pincode *</span>
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={formData.pincode}
                          onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                          className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none font-mono"
                        />
                        {errors.pincode && <p className="text-[10px] text-red-600 mt-0.5">{errors.pincode}</p>}
                      </div>

                      <div>
                        <label className="block font-bold mb-1">Landmark (Optional)</label>
                        <input
                          type="text"
                          value={formData.landmark}
                          onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded focus:border-[#9F2089] focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#9F2089] hover:bg-[#80182E] text-white font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Save Profile Changes
                    </button>
                  </form>
                )}
              </div>
            )
          ) : (
            /* MY ORDERS TAB (Meesho-style Order List + Per-Order Live Track Stepper) */
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="py-12 text-center space-y-3 bg-[#FAF8F5] rounded-xl border border-[#E8E8E8]">
                  <ShoppingBag className="w-12 h-12 text-[#CCCCCC] mx-auto" />
                  <div className="font-bold text-sm text-[#222222]">No Orders Yet</div>
                  <p className="text-xs text-[#666666] max-w-xs mx-auto">
                    Aap jo bhi order place karenge — starting se lekar abhi tak sabhi orders aur unka live tracking status yahan dikhega.
                  </p>
                </div>
              ) : (
                orders.map((order) => {
                  const meta = getStatusMeta(order.status);
                  const isExpanded = Boolean(expandedOrderIds[order.id]);
                  const orderDate = new Date(order.createdAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  const steps = [
                    { title: 'Order Placed / Pending', desc: `Order #${order.id} placed (${orderDate})` },
                    { title: 'Order Confirmed', desc: 'Seller confirmed & verified your order' },
                    { title: 'Packed & Ready', desc: 'Handloom packaging & quality seal completed' },
                    { title: 'Shipped', desc: `Dispatched via BlueDart (${order.trackingNumber})` },
                    { title: 'Out for Delivery', desc: `Out for delivery in ${order.shippingAddress.city}` },
                    { title: 'Delivered', desc: `Estimated / Delivered at ${order.shippingAddress.addressLine}` }
                  ];

                  return (
                    <div
                      key={order.id}
                      className="bg-white border border-[#E2DCD5] rounded-xl overflow-hidden shadow-xs"
                    >
                      {/* Order Card Header */}
                      <div className="bg-[#FAF8F5] px-4 py-3 border-b border-[#EFEAE2] flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="font-bold text-[#222222] font-mono">
                            Order #{order.id}
                          </div>
                          <div className="text-[11px] text-[#666666] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{orderDate}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                        </div>
                      </div>

                      {/* Order Items Summary */}
                      <div className="p-4 space-y-3">
                        <div className="space-y-2.5">
                          {order.items.map((item, idx) => (
                            <div
                              key={`${order.id}-${item.product.id}-${idx}`}
                              className="flex items-center gap-3 text-xs"
                            >
                              {item.product.images?.[0] ? (
                                <img
                                  src={item.product.images[0]}
                                  alt={item.product.title}
                                  className="w-12 h-14 object-cover rounded border border-[#E8E8E8] shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-12 h-14 bg-[#FAF8F5] rounded border border-[#E8E8E8] flex items-center justify-center shrink-0">
                                  <ShoppingBag className="w-5 h-5 text-[#CCCCCC]" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-[#222222] truncate">
                                  {item.product.title}
                                </div>
                                <div className="text-[11px] text-[#666666]">
                                  Qty: {item.quantity} · Size: {item.selectedSize}
                                </div>
                              </div>
                              <div className="font-bold text-[#222222] tabular-nums shrink-0">
                                ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Order Total & Track Button Row */}
                        <div className="pt-3 border-t border-[#EFEAE2] flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="text-[#666666]">Total Paid ({order.paymentMethod.toUpperCase()}): </span>
                            <strong className="text-[#9F2089] text-sm">
                              ₹{order.pricing.finalTotal.toLocaleString('en-IN')}
                            </strong>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleTrackOrder(order.id)}
                            className="px-3.5 py-2 bg-[#9F2089] hover:bg-[#80182E] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>{isExpanded ? 'Hide Tracking' : 'Track Order'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Meesho-style Live Tracking Stepper */}
                        {isExpanded && (
                          <div className="mt-3 p-4 bg-[#FAF8F5] rounded-xl border border-[#E8E8E8] space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E2DCD5] text-[11px]">
                              <div>
                                <span className="text-[#888888]">Status: </span>
                                <strong className="text-[#9F2089]">{meta.summary}</strong>
                              </div>
                              <div>
                                <span className="text-[#888888]">Est. Delivery: </span>
                                <strong className="text-emerald-700">{order.estimatedDeliveryDate}</strong>
                              </div>
                            </div>

                            <div className="relative pl-6 space-y-4 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2DCD5]">
                              {steps.map((s, idx) => {
                                const isCompleted = idx <= meta.stepIndex;
                                const isCurrent = idx === meta.stepIndex;
                                return (
                                  <div key={s.title} className="relative flex items-start gap-2.5">
                                    <div
                                      className={`absolute -left-6 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ring-4 ring-[#FAF8F5] ${
                                        isCompleted
                                          ? 'bg-[#038D63] text-white'
                                          : 'bg-[#E2DCD5] text-[#888888]'
                                      } ${isCurrent ? 'ring-[#038D63]/20' : ''}`}
                                    >
                                      {isCompleted ? '✓' : idx + 1}
                                    </div>
                                    <div>
                                      <div
                                        className={`text-xs font-bold ${
                                          isCompleted ? 'text-[#111C2D]' : 'text-[#888888]'
                                        }`}
                                      >
                                        {s.title}
                                        {isCurrent && (
                                          <span className="ml-2 inline-block px-1.5 py-0.5 bg-[#FDE5F4] text-[#9F2089] text-[9px] font-extrabold rounded uppercase">
                                            Current
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-[#666666]">{s.desc}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="pt-2 border-t border-[#E2DCD5] text-[11px] text-[#555555]">
                              <strong>Delivery Address:</strong> {order.shippingAddress.fullName} ({order.shippingAddress.phone}) · {order.shippingAddress.addressLine}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
