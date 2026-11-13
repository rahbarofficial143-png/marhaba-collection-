import React, { useState } from 'react';
import { X, Search, Truck, CheckCircle2, Clock, MapPin, PackageCheck } from 'lucide-react';
import { Order } from '../types';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  recentOrders: Order[];
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  recentOrders
}) => {
  if (!isOpen) return null;

  const [searchQuery, setSearchQuery] = useState(
    recentOrders.length > 0 ? recentOrders[0].id : ''
  );

  const activeOrder: Order | null =
    recentOrders.find(
      (o) =>
        o.id.toLowerCase() === searchQuery.trim().toLowerCase() ||
        o.shippingAddress.phone === searchQuery.trim()
    ) || null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div
        className="relative bg-white w-full max-w-2xl rounded-lg shadow-2xl border border-[#EFEAE2] overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EFEAE2] bg-[#FAF8F5]">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#6B1426]" />
            <h2 className="font-editorial text-lg font-semibold text-[#111C2D]">
              Direct Loom Order Tracking
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

        {/* Search Input */}
        <div className="p-4 bg-[#FAF8F5] border-b border-[#EFEAE2] space-y-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#887173] absolute left-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter Order ID (e.g. MC-123456) or 10-digit Mobile Number"
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-[#E2DCD5] rounded focus:border-[#6B1426] focus:outline-none"
            />
          </div>
          {recentOrders.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-[#887173]">Recent Orders:</span>
              {recentOrders.slice(0, 5).map((ord) => (
                <button
                  key={ord.id}
                  type="button"
                  onClick={() => setSearchQuery(ord.id)}
                  className={`px-2 py-0.5 rounded border font-mono ${
                    activeOrder?.id === ord.id
                      ? 'bg-[#9F2089] text-white border-[#9F2089]'
                      : 'bg-white text-[#554243] border-[#E2DCD5] hover:border-[#9F2089]'
                  }`}
                >
                  {ord.id}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Order Details Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {!activeOrder ? (
            <div className="py-10 text-center space-y-2 text-[#666666]">
              <Truck className="w-10 h-10 text-[#CCCCCC] mx-auto" />
              <div className="font-bold text-sm text-[#222222]">
                {recentOrders.length === 0 ? 'No Orders Placed Yet' : 'Order Not Found'}
              </div>
              <p className="text-xs max-w-sm mx-auto">
                {recentOrders.length === 0
                  ? 'Once an order is placed at checkout, you can track its live status here.'
                  : 'Enter a valid Order ID or customer mobile number to view tracking details.'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#FAF8F5] rounded border border-[#EFEAE2]">
                <div>
                  <div className="text-xs text-[#887173]">Order Reference</div>
                  <div className="font-bold text-[#111C2D] text-sm">{activeOrder.id}</div>
                  <div className="text-[11px] text-[#554243]">
                    Courier: <strong>BlueDart Express</strong> ({activeOrder.trackingNumber})
                  </div>
                </div>

                <div className="sm:text-right">
                  <div className="text-xs text-[#887173]">Estimated Delivery</div>
                  <div className="text-sm font-extrabold text-emerald-800">
                    {activeOrder.estimatedDeliveryDate}
                  </div>
                  <div className="text-[11px] text-[#775A00] font-medium">
                    Payment: {activeOrder.paymentMethod.toUpperCase()} (₹{activeOrder.pricing.finalTotal.toLocaleString('en-IN')})
                  </div>
                </div>
              </div>

              {/* Stepper Timeline */}
              <div className="space-y-4 pt-2">
                <div className="text-xs font-bold text-[#111C2D] uppercase tracking-wider">
                  Loom-to-Doorstep Progress ({activeOrder.status.replace('_', ' ')})
                </div>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2DCD5]">
                  <div className="relative flex items-start gap-3">
                    <div className={`absolute -left-6 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ring-4 ring-white ${
                      activeOrder.status === 'pending'
                        ? 'bg-[#FECE57] text-[#4B0013]'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {activeOrder.status === 'pending' ? '1' : '✓'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#111C2D]">
                        {activeOrder.status === 'pending' ? 'Order Pending Confirmation' : 'Order Confirmed'}
                      </div>
                      <div className="text-[11px] text-[#554243]">Order registered for {activeOrder.shippingAddress.fullName}.</div>
                    </div>
                  </div>

                  <div className="relative flex items-start gap-3">
                    <div className={`absolute -left-6 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ring-4 ring-white ${
                      ['artisan_packing', 'loom_inspection', 'dispatched', 'out_for_delivery', 'delivered'].includes(activeOrder.status)
                        ? 'bg-emerald-600 text-white'
                        : activeOrder.status === 'confirmed'
                          ? 'bg-[#FECE57] text-[#4B0013]'
                          : 'bg-[#E2DCD5] text-[#888888]'
                    }`}>
                      {['artisan_packing', 'loom_inspection', 'dispatched', 'out_for_delivery', 'delivered'].includes(activeOrder.status) ? '✓' : '2'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#111C2D]">Packed &amp; Quality Checked</div>
                      <div className="text-[11px] text-[#554243]">Handloom quality check &amp; protective packaging.</div>
                    </div>
                  </div>

                  <div className="relative flex items-start gap-3">
                    <div className={`absolute -left-6 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ring-4 ring-white ${
                      ['out_for_delivery', 'delivered'].includes(activeOrder.status)
                        ? 'bg-emerald-600 text-white'
                        : activeOrder.status === 'dispatched'
                          ? 'bg-[#FECE57] text-[#4B0013]'
                          : 'bg-[#E2DCD5] text-[#888888]'
                    }`}>
                      {['out_for_delivery', 'delivered'].includes(activeOrder.status) ? '✓' : '3'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#111C2D]">
                        {activeOrder.status === 'delivered' ? 'Delivered' : 'Dispatched & Out for Delivery'}
                      </div>
                      <div className="text-[11px] text-[#554243]">
                        Delivery to {activeOrder.shippingAddress.city} by {activeOrder.estimatedDeliveryDate}.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>Open Box Inspection Guarantee:</strong> You are welcome to inspect the weave and texture before completing your delivery.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
