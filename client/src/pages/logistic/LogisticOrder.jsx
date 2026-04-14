// pages/logistics/LogisticOrders.jsx
import React, { useEffect, useState } from "react";
import { useUserContext } from "../../context/UserContext.jsx";
import { useOutletContext } from "react-router-dom";
import {
  getOrdersByLogistics, getAvailableOrders, acceptOrder,
  pickupOrder, confirmDelivery, markOutForDelivery
} from "../../services/orderService.js";
import {
  Package, Truck, CheckCircle, MapPin,
  ChevronDown, ChevronUp, Loader2, RefreshCw,
  Navigation, Star
} from "lucide-react";

const PINATA = "https://bronze-magnificent-constrictor-556.mypinata.cloud/ipfs/";

const MY_DELIVERIES_TABS = [
  { id: "all",  label: "All" },
  { id: 2,      label: "Ready for Pickup" },
  { id: 3,      label: "Picked Up" },
  { id: 4,      label: "Out for Delivery" },
  { id: 5,      label: "Delivered" },
  { id: 6,      label: "Completed" },
  { id: 8,      label: "Refunded" },
];

const STATUS_CONFIG = {
  2: { label: "READY FOR PICKUP",  color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  3: { label: "PICKED UP",         color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  4: { label: "OUT FOR DELIVERY",  color: "bg-purple-100 text-purple-800 border-purple-200" },
  5: { label: "DELIVERED",         color: "bg-teal-100 text-teal-800 border-teal-200"       },
  6: { label: "COMPLETED",         color: "bg-green-100 text-green-800 border-green-200"    },
  8: { label: "REFUNDED",          color: "bg-orange-100 text-orange-800 border-orange-200" },
};

const fmtTime = (ts) => (!ts || ts === 0) ? null : new Date(ts * 1000).toLocaleString();
const safeFloat = (val) => { const n = parseFloat(val); return isNaN(n) ? 0 : n; };

const formatAddress = (loc) => {
  if (!loc) return "N/A";
  if (typeof loc === "string") return loc || "N/A";
  const parts = [
    loc.houseNumber ? `#${loc.houseNumber}` : null,
    loc.street   || null,
    loc.barangay || null,
    loc.city     || null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "N/A";
};

const safeName = (val) => (val && val.trim()) ? val.trim() : "Unknown";

const getStatusBadge = (status) => {
  const cfg = STATUS_CONFIG[status] || { label: "UNKNOWN", color: "bg-gray-100 text-gray-800 border-gray-200" };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>{cfg.label}</span>;
};

const LineItemsList = ({ lineItems = [] }) => (
  <div className="space-y-1.5">
    {lineItems.map((item, idx) => (
      <div key={idx} className="flex items-center gap-2">
        {item.imageCID && (
          <img src={`${PINATA}${item.imageCID}`} alt={item.name || "Item"}
            className="w-8 h-8 rounded-lg object-cover border border-white flex-shrink-0"
            onError={e => { e.target.style.display = "none"; }} />
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate">{safeName(item.name)}</p>
          {item.hasVariant && item.variantLabel && (
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">
              {item.variantLabel}
            </span>
          )}
          <p className="text-[10px] text-gray-400">×{item.quantity || 1}</p>
        </div>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MyOrderCard
// ─────────────────────────────────────────────────────────────────────────────
function MyOrderCard({ order, onRefresh, onModalOpen, actionLoading, setActionLoading, lastPosition, startOrderTracking, stopOrderTracking }) {
  const [expanded, setExpanded] = useState(false);

  const isActing   = actionLoading === order.id;
  const canPickup  = order.status === 2;
  const canMarkOFD = order.status === 3;
  const canDeliver = order.status === 4;
  const isRefunded = order.status === 8;
  const lineItems  = order.lineItems || [];

  const locationString = lastPosition
    ? `${lastPosition.lat.toFixed(5)}, ${lastPosition.lng.toFixed(5)}`
    : null;

  const handlePickupClick = () => {
    onModalOpen({
      type: "pickup", order,
      onConfirm: async () => {
        setActionLoading(order.id);
        try {
          await pickupOrder(order.id, locationString || "Picked up from seller");
          startOrderTracking(order.id);
          onRefresh();
        } catch (e) { alert(e.response?.data?.error || "Failed to confirm pickup"); }
        finally { setActionLoading(null); }
      },
    });
  };

  const handleMarkOFDClick = () => {
    onModalOpen({
      type: "outForDelivery", order,
      onConfirm: async () => {
        setActionLoading(order.id);
        try {
          await markOutForDelivery(order.id);
          onRefresh();
        } catch (e) { alert(e.response?.data?.error || "Failed to mark out for delivery"); }
        finally { setActionLoading(null); }
      },
    });
  };

  const handleDeliverClick = () => {
    onModalOpen({
      type: "deliver", order,
      onConfirm: async () => {
        setActionLoading(order.id);
        try {
          await confirmDelivery(order.id, locationString || order.deliveryAddress?.fullAddress || "Delivered");
          stopOrderTracking(order.id);
          onRefresh();
        } catch (e) { alert(e.response?.data?.error || "Failed to confirm delivery"); }
        finally { setActionLoading(null); }
      },
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden">
      <div className="flex flex-col lg:flex-row">

        {/* Left */}
        <div className={`p-5 lg:w-64 border-b lg:border-b-0 lg:border-r border-gray-200 flex-shrink-0 ${isRefunded ? "bg-gradient-to-br from-orange-50 to-amber-50" : "bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50"}`}>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Order ID</p>
              <p className="text-2xl font-bold text-gray-900">#{order.id}</p>
            </div>
            {getStatusBadge(order.status)}
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Items ({lineItems.length})</p>
              <LineItemsList lineItems={lineItems} />
            </div>
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">You Earn</p>
              <p className="font-bold text-green-600">{safeFloat(order.logisticsFee).toFixed(2)} AGT</p>
              {isRefunded && (
                <p className="text-[10px] text-orange-500 mt-0.5">Fee paid before refund</p>
              )}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex-1 p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Pickup From (Seller)</p>
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                <p className="text-sm font-semibold text-gray-900">{safeName(order.sellerName)}</p>
                <p className="text-xs text-gray-600 mt-0.5">{formatAddress(order.sellerLocation)}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Deliver To (Buyer)</p>
              <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                <p className="text-sm font-semibold text-gray-900">{safeName(order.deliveryAddress?.name || order.buyerName)}</p>
                <p className="text-xs text-gray-600 mt-0.5">{order.deliveryAddress?.fullAddress || formatAddress(order.buyerLocation)}</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {canPickup && (
              <button onClick={handlePickupClick} disabled={isActing}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
                Mark as Picked Up
              </button>
            )}
            {canMarkOFD && (
              <button onClick={handleMarkOFDClick} disabled={isActing}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50">
                {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                Out for Delivery
              </button>
            )}
            {canDeliver && (
              <button onClick={handleDeliverClick} disabled={isActing}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50">
                {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Mark as Delivered
              </button>
            )}
            {order.status === 5 && (
              <span className="text-sm text-teal-600 font-medium self-center">🕐 Waiting for buyer confirmation</span>
            )}
            {order.status === 6 && (
              <span className="text-sm text-green-600 font-semibold self-center flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Completed — {safeFloat(order.logisticsFee).toFixed(2)} AGT received
              </span>
            )}
            {isRefunded && (
              <span className="text-sm text-orange-600 font-semibold self-center flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Refunded — {safeFloat(order.logisticsFee).toFixed(2)} AGT earned
              </span>
            )}
            <button onClick={() => setExpanded(v => !v)}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors border border-gray-300">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expanded ? "Hide" : "Details"}
            </button>
          </div>

          {expanded && (
            <div className="border-t border-gray-200 pt-4 grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 text-sm mb-3">Earnings</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Products Value</span><span className="font-semibold">{safeFloat(order.totalProductPrice).toFixed(2)} AGT</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Platform Fee</span><span>{safeFloat(order.platformFee).toFixed(4)} AGT</span></div>
                  <div className="flex justify-between text-green-600 font-semibold border-t pt-2"><span>Your Logistics Fee</span><span>{safeFloat(order.logisticsFee).toFixed(2)} AGT</span></div>
                  <div className="flex justify-between border-t pt-2 font-semibold"><span>Total Order Value</span><span className="text-blue-600">{safeFloat(order.totalPrice).toFixed(2)} AGT</span></div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-semibold text-gray-900 text-sm mb-3">Timeline</h4>
                <div className="space-y-1.5 text-xs">
                  {[
                    ["Created",          order.createdAt],
                    ["Confirmed",        order.confirmAt],
                    ["Picked Up",        order.pickedUpAt],
                    ["Out for Delivery", order.outForDeliveryAt],
                    ["Delivered",        order.deliveredAt],
                    ["Completed",        order.completedAt],
                  ].filter(([, ts]) => ts && ts > 0).map(([label, ts]) => (
                    <div key={label} className="flex justify-between gap-2">
                      <span className="text-gray-500 flex-shrink-0">{label}:</span>
                      <span className="font-medium text-right">{fmtTime(ts)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main LogisticOrders
// ─────────────────────────────────────────────────────────────────────────────
export default function LogisticOrders() {
  const { user } = useUserContext();

  const { tracker, setActiveOrderIds } = useOutletContext();
  const { lastPosition, startOrderTracking, stopOrderTracking } = tracker;

  const [mainTab,           setMainTab]           = useState("my-orders");
  const [myOrders,          setMyOrders]          = useState([]);
  const [availableOrders,   setAvailableOrders]   = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [actionLoading,     setActionLoading]     = useState(null);
  const [statusTab,         setStatusTab]         = useState("all");
  const [modal,             setModal]             = useState(null);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [myRes, availRes] = await Promise.all([
        getOrdersByLogistics(),
        getAvailableOrders(),
      ]);
      const orders = myRes.orders || [];
      setMyOrders(orders);
      setAvailableOrders(availRes.orders || []);

      const activeIds = orders
        .filter(o => o.status >= 2 && o.status <= 4)
        .map(o => String(o.id));
      setActiveOrderIds(activeIds);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [user]);

  const handleAcceptOrder = async (orderId) => {
    setModal(null); setActionLoading(orderId);
    try {
      await acceptOrder(orderId);
      await fetchAll();
      setMainTab("my-orders");
    } catch (e) {
      alert("Failed to accept order or it's already taken by another logistics provider.");
    } finally { setActionLoading(null); }
  };

  const ConfirmModal = () => {
    if (!modal) return null;
    const { type, order, onConfirm } = modal;
    const configs = {
      accept: {
        icon: <Star className="w-12 h-12 text-green-500 mx-auto mb-3" />, 
        title: "Accept Delivery Job",
        body: `Accept Order #${order.id} (${(order.lineItems || []).length} item${(order.lineItems || []).length !== 1 ? "s" : ""})? You'll earn ${safeFloat(order.logisticsFee).toFixed(2)} AGT upon delivery.`,
        confirmLabel: "Accept Job",
        confirmClass: "bg-green-600 hover:bg-green-700",
        onConfirm: () => handleAcceptOrder(order.id),
      },
      pickup: {
        icon: <Package className="w-12 h-12 text-blue-500 mx-auto mb-3" />,
        title: "Confirm Pickup",
        body: `Confirm you've picked up Order #${order.id}? Live location will start broadcasting to the buyer.`,
        confirmLabel: "Yes, Picked Up",
        confirmClass: "bg-blue-600 hover:bg-blue-700",
        onConfirm,
      },
      outForDelivery: {
        icon: <Truck className="w-12 h-12 text-purple-500 mx-auto mb-3" />,
        title: "Mark Out for Delivery",
        body: `Mark Order #${order.id} as out for delivery? Deliver to: ${order.deliveryAddress?.fullAddress || formatAddress(order.buyerLocation)}.`,
        confirmLabel: "Yes, Out for Delivery",
        confirmClass: "bg-purple-600 hover:bg-purple-700",
        onConfirm,
      },
      deliver: {
        icon: <CheckCircle className="w-12 h-12 text-teal-500 mx-auto mb-3" />,
        title: "Confirm Delivery",
        body: `Confirm you've delivered Order #${order.id}? Location broadcasting will stop for this order.`,
        confirmLabel: "Yes, Delivered",
        confirmClass: "bg-teal-600 hover:bg-teal-700",
        onConfirm,
      },
    };
    const cfg = configs[type];
    if (!cfg) return null;
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={() => setModal(null)}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          onClick={e => e.stopPropagation()}>
          {cfg.icon}
          <h3 className="text-lg font-bold text-gray-900 text-center mb-2">{cfg.title}</h3>
          <p className="text-sm text-gray-600 text-center mb-6">{cfg.body}</p>
          <div className="flex gap-3">
            <button onClick={() => setModal(null)}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 text-sm">
              Back
            </button>
            <button onClick={() => { setModal(null); cfg.onConfirm(); }}
              className={`flex-1 py-2.5 text-white rounded-xl font-semibold text-sm ${cfg.confirmClass}`}>
              {cfg.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Include status 8 (Refunded) in My Deliveries
  const filteredMyOrders = (statusTab === "all"
    ? myOrders
    : myOrders.filter(o => o.status === statusTab)
  ).slice().sort((a, b) => b.id - a.id);

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
    </div>
  );

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <ConfirmModal />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deliveries</h1>
          <p className="text-gray-600 mt-1">Accept and manage your delivery jobs</p>
        </div>
        <button onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Main tabs */}
      <div className="flex gap-3 mb-6">
        <button onClick={() => setMainTab("available")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${mainTab === "available" ? "bg-green-600 text-white shadow-md" : "bg-white text-gray-700 border border-gray-200 hover:bg-green-50"}`}>
          <Star className="w-4 h-4" /> Available Jobs
          {availableOrders.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${mainTab === "available" ? "bg-white text-green-700" : "bg-green-600 text-white"}`}>
              {availableOrders.length}
            </span>
          )}
        </button>
        <button onClick={() => setMainTab("my-orders")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${mainTab === "my-orders" ? "bg-green-600 text-white shadow-md" : "bg-white text-gray-700 border border-gray-200 hover:bg-green-50"}`}>
          <Truck className="w-4 h-4" /> My Deliveries
          {myOrders.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${mainTab === "my-orders" ? "bg-white text-green-700" : "bg-gray-200 text-gray-700"}`}>
              {myOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* AVAILABLE ORDERS */}
      {mainTab === "available" && (
        availableOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Star className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No available orders</h3>
            <p className="text-gray-500 text-sm">New delivery jobs will appear here when sellers confirm order</p>
          </div>
        ) : (
          <div className="space-y-4">
            {availableOrders.map(order => {
              const isActing  = actionLoading === order.id;
              const lineItems = order.lineItems || [];
              return (
                <div key={order.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-green-100 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
                  <div className="flex flex-col lg:flex-row">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 lg:w-64 border-b lg:border-b-0 lg:border-r border-gray-200 flex-shrink-0">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Order ID</p>
                          <p className="text-2xl font-bold text-gray-900">#{order.id}</p>
                        </div>
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-100 text-blue-800 border-blue-200">READY FOR PICKUP</span>
                        <div>
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Items ({lineItems.length})</p>
                          <LineItemsList lineItems={lineItems} />
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500">You Earn</p>
                          <p className="text-2xl font-bold text-green-600">{safeFloat(order.logisticsFee).toFixed(2)} <span className="text-sm font-medium">AGT</span></p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 p-5 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Pickup From</p>
                          <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                            <p className="text-sm font-semibold text-gray-900">{safeName(order.sellerName)}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{formatAddress(order.sellerLocation)}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1 flex items-center gap-1"><Navigation className="w-3 h-3" /> Deliver To</p>
                          <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                            <p className="text-sm font-semibold text-gray-900">{safeName(order.deliveryAddress?.name || order.buyerName)}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{order.deliveryAddress?.fullAddress || formatAddress(order.buyerLocation)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-xs text-gray-500 mb-0.5">Products Value</p><p className="font-semibold">{safeFloat(order.totalProductPrice).toFixed(2)} AGT</p></div>
                        <div><p className="text-xs text-gray-500 mb-0.5">Created</p><p className="font-semibold text-xs">{fmtTime(order.createdAt) || "N/A"}</p></div>
                        <div><p className="text-xs text-gray-500 mb-0.5">Confirmed</p><p className="font-semibold text-xs">{fmtTime(order.confirmAt) || "N/A"}</p></div>
                      </div>
                      <button onClick={() => setModal({ type: "accept", order })} disabled={isActing}
                        className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {isActing ? <><Loader2 className="w-5 h-5 animate-spin" /> Accepting…</> : <><Star className="w-5 h-5" /> Accept This Delivery Job</>}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* MY DELIVERIES */}
      {mainTab === "my-orders" && (
        <div>
          <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
            {MY_DELIVERIES_TABS.map(tab => (
              <button key={tab.id} onClick={() => setStatusTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${statusTab === tab.id ? "bg-green-600 text-white shadow-md" : "bg-white text-gray-700 hover:bg-green-50 border border-gray-200"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {filteredMyOrders.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Truck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No deliveries found</h3>
              <p className="text-gray-500 text-sm">
                {statusTab === "all" ? "Accept jobs from the Available Jobs tab" : "No orders with this status"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMyOrders.map(order => (
                <MyOrderCard
                  key={order.id}
                  order={order}
                  onRefresh={fetchAll}
                  onModalOpen={setModal}
                  actionLoading={actionLoading}
                  setActionLoading={setActionLoading}
                  lastPosition={lastPosition}
                  startOrderTracking={startOrderTracking}
                  stopOrderTracking={stopOrderTracking}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}