"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Plus, 
  Trash2, 
  ClipboardCheck, 
  Check, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { inventoryApi } from "@/lib/api/inventory";
import type { PurchaseOrder, Supplier, InventoryItem, POItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PurchaseOrderPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Create PO Form State
  const [newPO, setNewPO] = useState({
    supplier_id: "",
    expected_date: "",
    notes: "",
    items: [] as Array<{ item_id: string; quantity: string; unit_price: string }>
  });

  // GRN Form State
  const [receiveQuantities, setReceiveQuantities] = useState<Record<number, string>>({});

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [posRes, supRes, itemRes] = await Promise.all([
        inventoryApi.getPOs(),
        inventoryApi.getSuppliers(),
        inventoryApi.getItems()
      ]);
      setPos(posRes.data || []);
      setSuppliers(supRes.data || []);
      setItems(itemRes.data || []);
    } catch (err) {
      console.error("Error loading PO workspace data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // PO Add Item row in wizard
  const addPOItemRow = () => {
    setNewPO({
      ...newPO,
      items: [...newPO.items, { item_id: "", quantity: "", unit_price: "" }]
    });
  };

  const removePOItemRow = (index: number) => {
    const updated = [...newPO.items];
    updated.splice(index, 1);
    setNewPO({ ...newPO, items: updated });
  };

  const updatePOItemRow = (index: number, key: "item_id" | "quantity" | "unit_price", value: string) => {
    const updated = [...newPO.items];
    updated[index][key] = value;
    setNewPO({ ...newPO, items: updated });
  };

  // Submit new PO
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPO.supplier_id || newPO.items.length === 0) return;

    // Filter valid items
    const validItems = newPO.items
      .filter((i) => i.item_id && parseFloat(i.quantity) > 0 && parseFloat(i.unit_price) >= 0)
      .map((i) => ({
        item_id: parseInt(i.item_id),
        quantity: parseFloat(i.quantity),
        unit_price: parseFloat(i.unit_price)
      }));

    if (validItems.length === 0) return;

    try {
      await inventoryApi.createPO({
        supplier_id: parseInt(newPO.supplier_id),
        expected_date: newPO.expected_date || null,
        notes: newPO.notes,
        items: validItems
      });
      setIsCreateOpen(false);
      setNewPO({ supplier_id: "", expected_date: "", notes: "", items: [] });
      loadData();
    } catch (err) {
      console.error("Error creating PO", err);
    }
  };

  // Open Receive GRN Dialog
  const openReceiveDialog = (po: PurchaseOrder) => {
    setSelectedPO(po);
    const initialQtys: Record<number, string> = {};
    po.items.forEach((poItem) => {
      // Default to receiving whatever balance remains
      const balance = parseFloat(poItem.quantity) - parseFloat(poItem.received_qty);
      initialQtys[poItem.id] = balance > 0 ? balance.toString() : "0";
    });
    setReceiveQuantities(initialQtys);
    setIsReceiveOpen(true);
  };

  // Submit GRN
  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    const payloadItems = Object.entries(receiveQuantities)
      .map(([poItemId, qty]) => ({
        po_item_id: parseInt(poItemId),
        received_qty: parseFloat(qty) || 0
      }))
      .filter((i) => i.received_qty > 0);

    if (payloadItems.length === 0) return;

    try {
      await inventoryApi.receivePO(selectedPO.id, { items: payloadItems });
      setIsReceiveOpen(false);
      setSelectedPO(null);
      loadData();
    } catch (err) {
      console.error("Error logging GRN receipt", err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Purchase Orders & GRN
          </h1>
          <p className="text-muted-foreground text-sm">
            Draft and send orders to suppliers, and audit deliveries via Goods Receipt Notes (GRN).
          </p>
        </div>
        <div>
          <Button 
            onClick={() => {
              setNewPO({ supplier_id: "", expected_date: "", notes: "", items: [{ item_id: "", quantity: "", unit_price: "" }] });
              setIsCreateOpen(true);
            }}
            className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Purchase Order
          </Button>
        </div>
      </div>

      {/* PO List */}
      <Card className="bg-slate-900/20 border-slate-800/60 shadow-xl overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : pos.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <FileText className="h-12 w-12 text-slate-650 mx-auto" />
              <p className="text-slate-400 font-medium">No purchase orders found</p>
              <p className="text-xs text-slate-500">Create a purchase order to start stock procurement.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/20">
                  <th className="py-3 px-4">PO Code</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Expected Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {pos.map((po) => (
                  <tr key={po.id} className="border-b border-slate-900/50 hover:bg-slate-950/10 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">#PO-{po.id}</td>
                    <td className="py-3 px-4 text-slate-300 font-medium">{po.supplier_name}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(po.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {po.expected_date ? new Date(po.expected_date).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-bold">Rs. {parseFloat(po.total_amount).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <Badge className={
                        po.status === "sent" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                        po.status === "partial" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                        po.status === "fulfilled" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                        po.status === "cancelled" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                        "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                      }>
                        {po.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {["sent", "partial", "draft"].includes(po.status) && (
                        <Button 
                          onClick={() => openReceiveDialog(po)}
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-emerald-500 hover:bg-slate-800/80 hover:text-white"
                        >
                          Receive Goods (GRN)
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Create Purchase Order */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              Build Purchase Order
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="supplier">Supplier *</Label>
                <select 
                  id="supplier"
                  value={newPO.supplier_id}
                  onChange={(e) => setNewPO({ ...newPO, supplier_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="exp_date">Expected Date</Label>
                <Input 
                  id="exp_date"
                  type="date"
                  value={newPO.expected_date}
                  onChange={(e) => setNewPO({ ...newPO, expected_date: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Order Specifications / Notes</Label>
              <Textarea 
                id="notes"
                value={newPO.notes}
                onChange={(e) => setNewPO({ ...newPO, notes: e.target.value })}
                placeholder="Include payment milestones, logistics arrangements, etc."
                className="bg-slate-950 border-slate-800 text-white text-xs h-16"
              />
            </div>

            {/* Items rows */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-slate-300 font-bold">Line Items Checklist</Label>
                <Button type="button" size="sm" onClick={addPOItemRow} className="bg-slate-800 hover:bg-slate-700 h-7 text-xs">
                  + Add Line
                </Button>
              </div>
              <div className="space-y-2">
                {newPO.items.map((poRow, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
                    <div className="col-span-6">
                      <select 
                        value={poRow.item_id}
                        onChange={(e) => updatePOItemRow(index, "item_id", e.target.value)}
                        className="w-full h-9 px-2 rounded-md bg-slate-950 border border-slate-800 text-white text-xs"
                        required
                      >
                        <option value="">Select Stock Item</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <Input 
                        type="number"
                        step="any"
                        placeholder="Qty"
                        value={poRow.quantity}
                        onChange={(e) => updatePOItemRow(index, "quantity", e.target.value)}
                        className="h-9 bg-slate-950 border-slate-800 text-white text-xs"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number"
                        step="any"
                        placeholder="Rate"
                        value={poRow.unit_price}
                        onChange={(e) => updatePOItemRow(index, "unit_price", e.target.value)}
                        className="h-9 bg-slate-950 border-slate-800 text-white text-xs"
                        required
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      <button 
                        type="button" 
                        onClick={() => removePOItemRow(index)}
                        className="text-rose-500 hover:text-rose-400 p-1.5 rounded bg-rose-500/5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="h-9 hover:bg-slate-800 text-slate-400">
                Cancel
              </Button>
              <Button type="submit" className="h-9 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white">
                Submit Purchase Order
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Settle GRN Delivery */}
      <Dialog open={isReceiveOpen} onOpenChange={() => setIsReceiveOpen(false)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-full sm:max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-emerald-500" />
              Goods Receipt Note (GRN) Registry
            </DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <form onSubmit={handleReceiveSubmit} className="space-y-4 pt-2">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs grid grid-cols-2 gap-2">
                <div>PO Reference: <span className="font-mono font-bold text-white">#PO-{selectedPO.id}</span></div>
                <div>Supplier: <span className="font-bold text-white">{selectedPO.supplier_name}</span></div>
                <div className="col-span-2 text-slate-400 mt-1">
                  Instructions: Input physical quantity received on arrival. Unchecked or zero items will not affect inventory.
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-slate-300 font-bold">Line Items Received Check</Label>
                <div className="space-y-2">
                  {selectedPO.items.map((poItem) => {
                    const balance = parseFloat(poItem.quantity) - parseFloat(poItem.received_qty);
                    return (
                      <div key={poItem.id} className="grid grid-cols-12 gap-3 items-center bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                        <div className="col-span-6 text-xs">
                          <div className="font-bold text-white">{poItem.item_name}</div>
                          <div className="text-slate-500 mt-0.5">
                            Ordered: {parseFloat(poItem.quantity).toFixed(1)} | Recvd: {parseFloat(poItem.received_qty).toFixed(1)}
                          </div>
                        </div>
                        <div className="col-span-6 flex items-center gap-2">
                          <Input 
                            type="number"
                            step="any"
                            max={balance.toString()}
                            placeholder={`Balance: ${balance}`}
                            value={receiveQuantities[poItem.id] || ""}
                            onChange={(e) => setReceiveQuantities({
                              ...receiveQuantities,
                              [poItem.id]: e.target.value
                            })}
                            className="h-9 bg-slate-950 border-slate-800 text-white text-xs text-right"
                          />
                          <span className="text-[10px] text-slate-500 w-8">{poItem.item_unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                <Button type="button" variant="ghost" onClick={() => setIsReceiveOpen(false)} className="h-9 hover:bg-slate-800 text-slate-400">
                  Cancel
                </Button>
                <Button type="submit" className="h-9 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white">
                  Validate Receipt (GRN)
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
