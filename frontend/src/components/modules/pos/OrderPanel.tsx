import React, { useState, useEffect } from "react";
import { Trash2, Plus, Minus, User, Utensils, Clipboard, Receipt, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { usePOSStore } from "@/lib/store/posStore";
import { posApi } from "@/lib/api/pos";
import { frontdeskApi } from "@/lib/api/frontdesk";
import { PaymentModal } from "./PaymentModal";
import type { Order, DiningTable, Reservation, OrderType, OrderItemStatus } from "@/lib/types";

interface OrderPanelProps {
  activeOrder: Order | null;
  selectedTable: DiningTable | null;
  onOrderCreated: (order: Order) => void;
  onOrderUpdated: (order: Order) => void;
  onOrderPaid: (order: Order) => void;
  onOrderVoided: () => void;
  onCancelActiveView: () => void;
}

export function OrderPanel({
  activeOrder,
  selectedTable,
  onOrderCreated,
  onOrderUpdated,
  onOrderPaid,
  onOrderVoided,
  onCancelActiveView,
}: OrderPanelProps) {
  const {
    cartItems,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalAmount: cartTotalAmount,
  } = usePOSStore();

  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const [inHouseList, setInHouseList] = useState<Reservation[]>([]);
  const [selectedResId, setSelectedResId] = useState<string>("none");

  // Sync order type with table availability
  useEffect(() => {
    if (selectedTable) {
      setOrderType("dine_in");
    }
  }, [selectedTable]);

  // Load in-house checkins for binding to takeaway/room service orders
  useEffect(() => {
    if (orderType === "room_service" || orderType === "bar") {
      frontdeskApi.getTodayStats()
        .then((res) => {
          setInHouseList(res.data.in_house || []);
        })
        .catch((err) => {
          console.error("Failed to load in-house list in OrderPanel", err);
        });
    }
  }, [orderType]);

  const handleUpdateItemStatus = async (itemId: number, newStatus: OrderItemStatus) => {
    if (!activeOrder) return;
    try {
      const res = await posApi.updateOrderItemStatus(activeOrder.id, itemId, newStatus);
      // Fetch latest order details to update state
      const updatedOrder = await posApi.getOrder(activeOrder.id);
      onOrderUpdated(updatedOrder.data);
    } catch (err) {
      alert("Failed to update item status.");
    }
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    setIsSubmitting(true);
    try {
      const payload = {
        table_id: selectedTable?.id || null,
        reservation_id: selectedResId !== "none" ? parseInt(selectedResId) : null,
        order_type: orderType,
        notes: notes,
        discount_amount: discountAmount,
        items: cartItems.map((c) => ({
          menu_item_id: c.id,
          quantity: c.quantity,
          modifiers: {},
          notes: "",
        })),
      };

      const res = await posApi.createOrder(payload);
      clearCart();
      setNotes("");
      setDiscountAmount("0");
      onOrderCreated(res.data);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to place order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItemsToActive = async () => {
    if (!activeOrder || cartItems.length === 0) return;
    setIsSubmitting(true);
    try {
      const payload = {
        items: cartItems.map((c) => ({
          menu_item_id: c.id,
          quantity: c.quantity,
          modifiers: {},
          notes: "",
        })),
      };
      const res = await posApi.addOrderItems(activeOrder.id, payload);
      clearCart();
      onOrderUpdated(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to add items.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentConfirm = async (
    method: "cash" | "card" | "room" | "esewa" | "khalti" | "fonepay",
    resId?: number
  ) => {
    if (!activeOrder) return;
    setIsSubmitting(true);
    try {
      const payload: any = { payment_method: method };
      if (method === "room" && resId) {
        payload.reservation_id = resId;
      }
      const res = await posApi.payOrder(activeOrder.id, payload);
      setIsPaymentOpen(false);
      onOrderPaid(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to process payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoidOrder = async () => {
    if (!activeOrder || !voidReason.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await posApi.voidOrder(activeOrder.id, voidReason);
      setVoidReason("");
      setIsVoiding(false);
      onOrderVoided();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to void order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations
  const subtotal = activeOrder ? parseFloat(activeOrder.subtotal) : cartTotalAmount();
  const tax = subtotal * 0.13;
  const discount = activeOrder ? parseFloat(activeOrder.discount_amount) : parseFloat(discountAmount) || 0;
  const total = activeOrder ? parseFloat(activeOrder.total_amount) : Math.max((subtotal + tax) - discount, 0);

  return (
    <div className="flex flex-col h-full bg-slate-950/65 border-l border-slate-900 text-slate-100 flex-1 min-w-[340px] max-w-[420px] backdrop-blur-xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-900 flex items-center justify-between bg-slate-950">
        <div>
          {activeOrder ? (
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-100 text-base">Order #{activeOrder.id}</h2>
                <Badge className="bg-cyan-500/10 text-cyan-400 capitalize text-[10px] border-cyan-500/20">
                  {activeOrder.status}
                </Badge>
              </div>
              <span className="text-xs text-slate-500 block mt-0.5">
                {activeOrder.table_number ? `Dining Table ${activeOrder.table_number}` : "Takeaway / Service"}
              </span>
            </div>
          ) : (
            <div>
              <h2 className="font-bold text-slate-100 text-base">New Order</h2>
              <span className="text-xs text-slate-500 block mt-0.5">
                {selectedTable ? `Dine-In Table ${selectedTable.table_number}` : "Cart Checkout"}
              </span>
            </div>
          )}
        </div>
        {activeOrder && (
          <Button variant="ghost" size="sm" onClick={onCancelActiveView} className="text-slate-400 hover:text-slate-200">
            Exit View
          </Button>
        )}
      </div>

      {/* Inputs (Only for new orders) */}
      {!activeOrder && (
        <div className="p-4 border-b border-slate-900 space-y-3.5 bg-slate-900/10">
          {/* Order Type */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 font-semibold tracking-wide">Order Type</Label>
            <Select
              value={orderType}
              onValueChange={(val) => setOrderType(val as OrderType)}
              disabled={!!selectedTable}
            >
              <SelectTrigger className="bg-slate-900/60 border-slate-800 text-slate-200 text-sm">
                <SelectValue placeholder="Select order type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                <SelectItem value="dine_in">Dine-In</SelectItem>
                <SelectItem value="takeaway">Takeaway</SelectItem>
                <SelectItem value="room_service">Room Service</SelectItem>
                <SelectItem value="bar">Bar tab</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Guest Linkage (for Room Service/Bar tab) */}
          {(orderType === "room_service" || orderType === "bar") && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <Label className="text-xs text-slate-400 font-semibold tracking-wide flex items-center gap-1">
                <User className="h-3 w-3 text-cyan-400" /> Linked Room Guest
              </Label>
              <Select value={selectedResId} onValueChange={(val) => setSelectedResId(val || "none")}>
                <SelectTrigger className="bg-slate-900/60 border-slate-800 text-slate-200 text-xs">
                  <SelectValue placeholder="Select active check-in guest" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="none">Walk-in Guest (No Room Tab)</SelectItem>
                  {inHouseList.map((res) => (
                    <SelectItem key={res.id} value={res.id.toString()}>
                      Room {res.room?.room_number || "N/A"} - {res.guest.first_name} {res.guest.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Items Scroll List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-900">
        {/* Active Items */}
        {activeOrder && activeOrder.items.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <Utensils className="h-3.5 w-3.5" /> Placed Items
            </h3>
            {activeOrder.items.map((item) => (
              <div key={item.id} className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-900 flex justify-between items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-200 block truncate">
                      {item.menu_item.name}
                    </span>
                    <span className="text-[10px] text-slate-500">x{item.quantity}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Rs. {(parseFloat(item.unit_price) * item.quantity).toFixed(2)}
                  </span>
                </div>
                {/* Status Badges with shift buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge
                    className={`capitalize text-[9px] px-1.5 py-0.5 border ${
                      item.status === "ready" 
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                        : item.status === "served"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-slate-900 text-slate-500 border-slate-800"
                    }`}
                  >
                    {item.status}
                  </Badge>
                  {item.status === "pending" && (
                    <Button
                      size="xs"
                      onClick={() => handleUpdateItemStatus(item.id, "preparing")}
                      className="h-5 px-1.5 text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      Prep
                    </Button>
                  )}
                  {item.status === "preparing" && (
                    <Button
                      size="xs"
                      onClick={() => handleUpdateItemStatus(item.id, "ready")}
                      className="h-5 px-1.5 text-[9px] bg-amber-600/30 hover:bg-amber-600/50 text-amber-300"
                    >
                      Ready
                    </Button>
                  )}
                  {item.status === "ready" && (
                    <Button
                      size="xs"
                      onClick={() => handleUpdateItemStatus(item.id, "served")}
                      className="h-5 px-1.5 text-[9px] bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300"
                    >
                      Serve
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Draft Items (Cart) */}
        <div className="space-y-2">
          {activeOrder && cartItems.length > 0 && (
            <h3 className="text-xs text-amber-500 font-semibold uppercase tracking-wider flex items-center gap-1.5 mt-4 mb-2.5">
              <Clipboard className="h-3.5 w-3.5" /> Pending Additions
            </h3>
          )}
          {cartItems.length === 0 ? (
            !activeOrder && (
              <div className="flex flex-col items-center justify-center h-48 border border-dashed border-slate-900 rounded-xl bg-slate-950/10">
                <Receipt className="h-9 w-9 text-slate-700 mb-2" />
                <p className="text-xs text-slate-500 font-medium">Your cart is empty.</p>
                <p className="text-[10px] text-slate-600">Select items from the menu grid.</p>
              </div>
            )
          ) : (
            cartItems.map((c) => (
              <div key={c.id} className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/60 flex justify-between items-center gap-3">
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-xs text-slate-200 block truncate">{c.name}</span>
                  <span className="text-[10px] text-cyan-400 font-medium">Rs. {c.price.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center border border-slate-800 rounded-md bg-slate-950">
                    <button
                      onClick={() => updateQuantity(c.id, c.quantity - 1)}
                      className="p-1 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-2 text-xs font-semibold text-slate-200">{c.quantity}</span>
                    <button
                      onClick={() => addItem({ id: c.id, name: c.name, price: c.price })}
                      className="p-1 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(c.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bill Footer Calculations */}
      <div className="p-4 border-t border-slate-900 bg-slate-950 space-y-3.5">
        <div className="space-y-1.5 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="text-slate-200 font-medium">Rs. {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT (13%)</span>
            <span className="text-slate-200 font-medium">Rs. {tax.toFixed(2)}</span>
          </div>
          
          {/* Discount input or display */}
          <div className="flex justify-between items-center">
            <span>Discount (Rs.)</span>
            {activeOrder ? (
              <span className="text-emerald-400 font-medium">- Rs. {discount.toFixed(2)}</span>
            ) : (
              <Input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-20 h-6 bg-slate-900 border-slate-800 text-[11px] text-right py-0 px-1.5 text-slate-200 focus-visible:ring-cyan-500"
              />
            )}
          </div>

          <div className="border-t border-slate-900 pt-2 flex justify-between font-bold text-sm text-slate-100">
            <span>Grand Total</span>
            <span className="text-cyan-400">Rs. {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Order overall Notes (Only for draft) */}
        {!activeOrder && cartItems.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="order-notes" className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Order Instructions</Label>
            <Textarea
              id="order-notes"
              placeholder="E.g. No onions, Extra spicy..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[44px] bg-slate-900 border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus-visible:ring-cyan-500"
            />
          </div>
        )}

        {/* Actions Pane */}
        <div className="space-y-2">
          {activeOrder ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsVoiding(true)}
                className="flex-1 border-slate-800 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-medium"
              >
                Void Order
              </Button>
              <Button
                onClick={() => setIsPaymentOpen(true)}
                className="flex-1 bg-emerald-600 text-white hover:bg-emerald-500 font-semibold"
              >
                Settle Pay
              </Button>
            </div>
          ) : cartItems.length > 0 ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={clearCart}
                className="border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200 font-medium"
              >
                Clear
              </Button>
              <Button
                onClick={selectedTable ? handlePlaceOrder : handlePlaceOrder}
                disabled={isSubmitting}
                className="flex-1 bg-cyan-600 text-white hover:bg-cyan-500 font-semibold"
              >
                {isSubmitting ? "Placing..." : selectedTable ? "Place Order" : "Place Order"}
              </Button>
            </div>
          ) : null}

          {/* Add items option to active order */}
          {activeOrder && cartItems.length > 0 && (
            <Button
              onClick={handleAddItemsToActive}
              disabled={isSubmitting}
              className="w-full bg-amber-600 text-white hover:bg-amber-500 font-semibold flex items-center gap-1.5"
            >
              Add {cartItems.length} items to Order
            </Button>
          )}
        </div>
      </div>

      {/* Settle Payment Modal */}
      {activeOrder && (
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          onConfirm={handlePaymentConfirm}
          totalAmount={total}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Void Dialog */}
      {activeOrder && isVoiding && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-[380px] w-full space-y-4">
            <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
              <ShieldAlert className="h-5 w-5 text-red-500" /> Void Active Order
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Voiding an order cancels it completely. A valid reason must be logged for auditing.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="void-reason" className="text-xs text-slate-400">Reason for Void</Label>
              <Input
                id="void-reason"
                placeholder="E.g. Customer changed mind, Duplicate order"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <Button size="sm" variant="outline" onClick={() => setIsVoiding(false)} className="border-slate-800">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleVoidOrder}
                disabled={isSubmitting || !voidReason.trim()}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                Confirm Void
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
