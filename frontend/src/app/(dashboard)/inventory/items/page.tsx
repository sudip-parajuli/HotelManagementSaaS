"use client";

import React, { useState, useEffect } from "react";
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  AlertTriangle, 
  Check, 
  SlidersHorizontal,
  ChevronDown
} from "lucide-react";
import { inventoryApi } from "@/lib/api/inventory";
import type { InventoryItem, Category, InventoryUnit } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function InventoryItemsPage() {
  // Lists
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [filterLowStock, setFilterLowStock] = useState(false);
  
  // Sheet: New Item
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    sku: "",
    category_id: "",
    unit: "piece" as InventoryUnit,
    reorder_level: 0,
    max_stock: 0,
    cost_price: "0.00",
    is_perishable: false,
    expiry_tracking: false
  });

  // Dialog: Stock Adjustment
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<InventoryItem | null>(null);
  const [adjustData, setAdjustData] = useState({
    quantity: "",
    movement_type: "adjustment",
    notes: ""
  });

  const [isLoading, setIsLoading] = useState(true);

  // Fetch Data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [itemsRes, catRes] = await Promise.all([
        inventoryApi.getItems(),
        inventoryApi.getCategories()
      ]);
      setItems(itemsRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error("Error loading inventory items data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Logic
  useEffect(() => {
    let result = [...items];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (i) => i.name.toLowerCase().includes(term) || i.sku.toLowerCase().includes(term)
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter((i) => i.category === selectedCategory);
    }

    if (filterLowStock) {
      result = result.filter(
        (i) => parseFloat(i.current_stock) <= parseFloat(i.reorder_level)
      );
    }

    setFilteredItems(result);
  }, [items, searchTerm, selectedCategory, filterLowStock]);

  // Handle New Item Submit
  const handleNewItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.sku || !newItem.category_id) return;
    
    try {
      await inventoryApi.createItem({
        name: newItem.name,
        sku: newItem.sku,
        category_id: parseInt(newItem.category_id),
        unit: newItem.unit,
        reorder_level: Number(newItem.reorder_level),
        max_stock: Number(newItem.max_stock),
        cost_price: newItem.cost_price,
        is_perishable: newItem.is_perishable,
        expiry_tracking: newItem.expiry_tracking
      });
      setIsNewItemOpen(false);
      // Reset form
      setNewItem({
        name: "",
        sku: "",
        category_id: "",
        unit: "piece",
        reorder_level: 0,
        max_stock: 0,
        cost_price: "0.00",
        is_perishable: false,
        expiry_tracking: false
      });
      fetchData();
    } catch (err) {
      console.error("Error creating inventory item", err);
    }
  };

  // Handle Stock Adjustment Submit
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAdjust || !adjustData.quantity) return;

    try {
      await inventoryApi.adjustStock(selectedItemForAdjust.id, {
        quantity: parseFloat(adjustData.quantity),
        movement_type: adjustData.movement_type,
        notes: adjustData.notes
      });
      setSelectedItemForAdjust(null);
      setAdjustData({ quantity: "", movement_type: "adjustment", notes: "" });
      fetchData();
    } catch (err) {
      console.error("Error adjusting stock", err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Inventory Stock Ledger
          </h1>
          <p className="text-muted-foreground text-sm">
            Auditing stock thresholds, catalog listings, and ingredient measurements.
          </p>
        </div>
        <div>
          <Sheet open={isNewItemOpen} onOpenChange={setIsNewItemOpen}>
            <SheetTrigger
              render={
                <Button className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Catalog Item
                </Button>
              }
            />
            <SheetContent className="bg-slate-900 border-slate-800 text-white overflow-y-auto w-full sm:max-w-md">
              <SheetHeader className="pb-6">
                <SheetTitle className="text-xl font-bold text-white">New Inventory Item</SheetTitle>
              </SheetHeader>
              <form onSubmit={handleNewItemSubmit} className="space-y-4 text-slate-300">
                <div className="space-y-1">
                  <Label htmlFor="name">Item Name *</Label>
                  <Input 
                    id="name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sku">SKU Code *</Label>
                  <Input 
                    id="sku"
                    value={newItem.sku}
                    onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white" 
                    placeholder="e.g. RAW-CHK-01"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="category">Category *</Label>
                  <select 
                    id="category"
                    value={newItem.category_id}
                    onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="unit">Measurement Unit</Label>
                  <select 
                    id="unit"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value as InventoryUnit })}
                    className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="piece">Piece</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="litre">Litre (l)</option>
                    <option value="box">Box</option>
                    <option value="dozen">Dozen</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="reorder">Reorder Alert Level</Label>
                    <Input 
                      id="reorder"
                      type="number"
                      step="any"
                      value={newItem.reorder_level}
                      onChange={(e) => setNewItem({ ...newItem, reorder_level: parseFloat(e.target.value) || 0 })}
                      className="bg-slate-950 border-slate-800 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="max">Max Capacity Level</Label>
                    <Input 
                      id="max"
                      type="number"
                      step="any"
                      value={newItem.max_stock}
                      onChange={(e) => setNewItem({ ...newItem, max_stock: parseFloat(e.target.value) || 0 })}
                      className="bg-slate-950 border-slate-800 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="price">Default Cost Price (Rs.)</Label>
                  <Input 
                    id="price"
                    type="number"
                    step="0.01"
                    value={newItem.cost_price}
                    onChange={(e) => setNewItem({ ...newItem, cost_price: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={newItem.is_perishable}
                      onChange={(e) => setNewItem({ ...newItem, is_perishable: e.target.checked })}
                      className="w-4 h-4 accent-emerald-500 rounded border-slate-800 bg-slate-950"
                    />
                    Is Perishable Item
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={newItem.expiry_tracking}
                      onChange={(e) => setNewItem({ ...newItem, expiry_tracking: e.target.checked })}
                      className="w-4 h-4 accent-emerald-500 rounded border-slate-800 bg-slate-950"
                    />
                    Enable Expiry Date Warnings
                  </label>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white mt-6">
                  Save Catalog Item
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-900/30 p-4 rounded-xl border border-slate-850/80 backdrop-blur-md">
        {/* Search */}
        <div className="md:col-span-5 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items by name or SKU..."
            className="pl-9 bg-slate-950/50 border-slate-800 text-white"
          />
        </div>
        {/* Category selector */}
        <div className="md:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value === "all" ? "all" : parseInt(e.target.value))}
            className="w-full h-10 px-3 rounded-md bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {/* Low stock toggle */}
        <div className="md:col-span-4 flex items-center justify-end">
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterLowStock}
              onChange={(e) => setFilterLowStock(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded border-slate-800 bg-slate-950"
            />
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Show Low Stock Alerts Only
          </label>
        </div>
      </div>

      {/* Items Table / List */}
      <Card className="bg-slate-900/20 border-slate-800/60 shadow-xl overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Package className="h-12 w-12 text-slate-600 mx-auto" />
              <p className="text-slate-400 font-medium">No inventory items match your search criteria</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-400 font-semibold bg-slate-950/20">
                  <th className="py-3 px-4">Item details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">SKU Code</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Reorder Limit</th>
                  <th className="py-3 px-4">Cost Price</th>
                  <th className="py-3 px-4">Perishable</th>
                  <th className="py-3 px-4 text-right">Audit Adjust</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isLow = parseFloat(item.current_stock) <= parseFloat(item.reorder_level);
                  return (
                    <tr 
                      key={item.id} 
                      className={`border-b border-slate-900/50 hover:bg-slate-950/10 transition-colors ${
                        isLow ? "bg-amber-950/5 hover:bg-amber-950/10" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm">{item.name}</div>
                        <div className="text-slate-500 text-[10px]">{item.unit.toUpperCase()}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-medium">{item.category_name}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono font-bold">{item.sku}</td>
                      <td className="py-3 px-4">
                        <div className={`font-bold ${isLow ? "text-amber-500" : "text-white"}`}>
                          {parseFloat(item.current_stock).toFixed(2)} {item.unit}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {parseFloat(item.reorder_level).toFixed(2)} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-bold">Rs. {parseFloat(item.cost_price).toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={item.is_perishable ? "border-amber-500/20 text-amber-500 bg-amber-500/5" : "border-slate-800 text-slate-500 bg-slate-950"}>
                          {item.is_perishable ? "Yes" : "No"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button 
                          onClick={() => setSelectedItemForAdjust(item)}
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-emerald-500 hover:bg-slate-800/80 hover:text-white"
                        >
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Stock Adjustment */}
      <Dialog open={selectedItemForAdjust !== null} onOpenChange={() => setSelectedItemForAdjust(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-emerald-500" />
              Manual Stock Adjustment
            </DialogTitle>
          </DialogHeader>
          {selectedItemForAdjust && (
            <form onSubmit={handleAdjustSubmit} className="space-y-4 pt-2">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                <div>Item: <span className="font-bold text-white">{selectedItemForAdjust.name}</span></div>
                <div>SKU: <span className="font-mono text-slate-400">{selectedItemForAdjust.sku}</span></div>
                <div>Current Stock: <span className="font-bold text-emerald-500">{parseFloat(selectedItemForAdjust.current_stock).toFixed(2)} {selectedItemForAdjust.unit}</span></div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="qty">Relative quantity change *</Label>
                <Input 
                  id="qty"
                  type="number"
                  step="any"
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                  placeholder="e.g. +5.50 (addition) or -3.00 (subtraction)"
                  className="bg-slate-950 border-slate-800 text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mov_type">Movement Type</Label>
                <select 
                  id="mov_type"
                  value={adjustData.movement_type}
                  onChange={(e) => setAdjustData({ ...adjustData, movement_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="adjustment">Audit Adjustment</option>
                  <option value="manual_in">Manual Stock-in</option>
                  <option value="manual_out">Manual Stock-out</option>
                  <option value="waste">Waste / Spoiled</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">Audit Explanation / Notes</Label>
                <Textarea 
                  id="notes"
                  value={adjustData.notes}
                  onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
                  placeholder="e.g. Broken packaging, physical stock count mismatch..."
                  className="bg-slate-950 border-slate-800 text-white text-xs h-20"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button type="button" variant="ghost" onClick={() => setSelectedItemForAdjust(null)} className="h-9 hover:bg-slate-800 text-slate-400">
                  Cancel
                </Button>
                <Button type="submit" className="h-9 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white">
                  Execute Audit
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
