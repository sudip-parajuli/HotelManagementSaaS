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
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

export default function InventoryItemsPage() {
  // Lists
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);

  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [filterLowStock, setFilterLowStock] = useState(false);

  const t = useTranslations("Inventory");
  const tCommon = useTranslations("Common");
  const tData = useTransData();
  const locale = useLocale();

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

  const ensureArray = <T,>(data: any): T[] => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  };

  // Fetch Data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [itemsRes, catRes] = await Promise.all([
        inventoryApi.getItems(),
        inventoryApi.getCategories()
      ]);
      setItems(ensureArray<InventoryItem>(itemsRes.data));
      setCategories(ensureArray<Category>(catRes.data));
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
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-workspace-200 to-workspace-400 bg-clip-text text-transparent">
            {t("stock_ledger")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("stock_ledger_desc")}
          </p>
        </div>
        <div>
          <Sheet open={isNewItemOpen} onOpenChange={setIsNewItemOpen}>
            <SheetTrigger
              render={
                <Button className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t("add_catalog_item")}
                </Button>
              }
            />
            <SheetContent className="bg-workspace-900 border-workspace-800 text-foreground overflow-y-auto w-full sm:max-w-md">
              <SheetHeader className="pb-6">
                <SheetTitle className="text-xl font-bold text-foreground">{t("new_item_title")}</SheetTitle>
              </SheetHeader>
              <form onSubmit={handleNewItemSubmit} className="space-y-4 text-workspace-300">
                <div className="space-y-1">
                  <Label htmlFor="name">{t("item_name")}</Label>
                  <Input
                    id="name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="bg-workspace-950 border-workspace-800 text-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sku">{t("sku_code")}</Label>
                  <Input
                    id="sku"
                    value={newItem.sku}
                    onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                    className="bg-workspace-950 border-workspace-800 text-white"
                    placeholder="e.g. RAW-CHK-01"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="category">{t("category")}</Label>
                  <select
                    id="category"
                    value={newItem.category_id}
                    onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-md bg-workspace-950 border border-workspace-800 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="">{t("select_category")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{tData(c.name)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="unit">{t("measurement_unit")}</Label>
                  <select
                    id="unit"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value as InventoryUnit })}
                    className="w-full h-10 px-3 rounded-md bg-workspace-950 border border-workspace-800 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="piece">{tData("piece")}</option>
                    <option value="kg">{locale === "ne" ? "किलोग्राम (के.जी.)" : "Kilogram (kg)"}</option>
                    <option value="litre">{locale === "ne" ? "लिटर (l)" : "Litre (l)"}</option>
                    <option value="box">{tData("box")}</option>
                    <option value="dozen">{tData("dozen")}</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="reorder">{t("reorder_level")}</Label>
                    <Input
                      id="reorder"
                      type="number"
                      step="any"
                      value={newItem.reorder_level}
                      onChange={(e) => setNewItem({ ...newItem, reorder_level: parseFloat(e.target.value) || 0 })}
                      className="bg-workspace-950 border-workspace-800 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="max">{t("max_capacity")}</Label>
                    <Input
                      id="max"
                      type="number"
                      step="any"
                      value={newItem.max_stock}
                      onChange={(e) => setNewItem({ ...newItem, max_stock: parseFloat(e.target.value) || 0 })}
                      className="bg-workspace-950 border-workspace-800 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="price">{t("cost_price")}</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={newItem.cost_price}
                    onChange={(e) => setNewItem({ ...newItem, cost_price: e.target.value })}
                    className="bg-workspace-950 border-workspace-800 text-white"
                  />
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newItem.is_perishable}
                      onChange={(e) => setNewItem({ ...newItem, is_perishable: e.target.checked })}
                      className="w-4 h-4 accent-emerald-500 rounded border-workspace-800 bg-workspace-950"
                    />
                    {t("is_perishable")}
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newItem.expiry_tracking}
                      onChange={(e) => setNewItem({ ...newItem, expiry_tracking: e.target.checked })}
                      className="w-4 h-4 accent-emerald-500 rounded border-workspace-800 bg-workspace-950"
                    />
                    {t("enable_expiry")}
                  </label>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white mt-6">
                  {tCommon("save")}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-workspace-900/30 p-4 rounded-xl border border-slate-850/80 backdrop-blur-md">
        {/* Search */}
        <div className="md:col-span-5 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-workspace-500" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("search_placeholder")}
            className="pl-9 bg-workspace-950/50 border-workspace-800 text-white"
          />
        </div>
        {/* Category selector */}
        <div className="md:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value === "all" ? "all" : parseInt(e.target.value))}
            className="w-full h-10 px-3 rounded-md bg-workspace-950/50 border border-workspace-800 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">{t("all_categories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{tData(c.name)}</option>
            ))}
          </select>
        </div>
        {/* Low stock toggle */}
        <div className="md:col-span-4 flex items-center justify-end">
          <label className="flex items-center gap-2 text-sm text-workspace-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterLowStock}
              onChange={(e) => setFilterLowStock(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded border-workspace-800 bg-workspace-950"
            />
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {t("show_low_stock")}
          </label>
        </div>
      </div>

      {/* Items Table / List */}
      <Card className="bg-workspace-900/20 border-workspace-800/60 shadow-xl overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Package className="h-12 w-12 text-workspace-600 mx-auto" />
              <p className="text-workspace-400 font-medium">{t("no_items_found")}</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-workspace-800/60 text-workspace-400 font-semibold bg-workspace-950/20">
                  <th className="py-3 px-4">{t("item_details")}</th>
                  <th className="py-3 px-4">{t("category")}</th>
                  <th className="py-3 px-4">{t("sku")}</th>
                  <th className="py-3 px-4">{t("current_stock")}</th>
                  <th className="py-3 px-4">{t("reorder_limit")}</th>
                  <th className="py-3 px-4">{t("cost_price_col")}</th>
                  <th className="py-3 px-4">{t("perishable")}</th>
                  <th className="py-3 px-4 text-right">{t("audit_adjust")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isLow = parseFloat(item.current_stock) <= parseFloat(item.reorder_level);
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-workspace-900/50 hover:bg-workspace-950/10 transition-colors ${
                        isLow ? "bg-amber-950/5 hover:bg-amber-950/10" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground text-sm">{item.name}</div>
                        <div className="text-workspace-500 text-[10px]">
                          {locale === "ne" ? tData(item.unit) : item.unit.toUpperCase()}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-workspace-400 font-medium">{tData(item.category_name)}</td>
                      <td className="py-3 px-4 text-workspace-400 font-mono font-bold">{item.sku}</td>
                      <td className="py-3 px-4">
                        <div className={`font-bold ${isLow ? "text-amber-500" : "text-white"}`}>
                          {parseFloat(item.current_stock).toFixed(2)} {tData(item.unit)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-workspace-500 font-medium">
                        {parseFloat(item.reorder_level).toFixed(2)} {tData(item.unit)}
                      </td>
                      <td className="py-3 px-4 text-workspace-300 font-bold">
                        {locale === "ne" ? `रु. ${parseFloat(item.cost_price).toFixed(2)}` : `Rs. ${parseFloat(item.cost_price).toFixed(2)}`}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={item.is_perishable ? "border-amber-500/20 text-amber-500 bg-amber-500/5" : "border-workspace-800 text-workspace-500 bg-workspace-950"}>
                          {item.is_perishable ? (locale === "ne" ? "हो" : "Yes") : (locale === "ne" ? "होइन" : "No")}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          onClick={() => setSelectedItemForAdjust(item)}
                          size="sm"
                          variant="ghost"
                          className="h-8 text-emerald-500 hover:bg-workspace-800/80 hover:text-white"
                        >
                          {t("adjust")}
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
        <DialogContent className="bg-workspace-900 border-workspace-800 text-foreground w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-emerald-500" />
              {t("adjust_title")}
            </DialogTitle>
          </DialogHeader>
          {selectedItemForAdjust && (
            <form onSubmit={handleAdjustSubmit} className="space-y-4 pt-2">
              <div className="bg-workspace-950 p-3 rounded-lg border border-workspace-800 text-xs space-y-1">
                <div>{locale === "ne" ? "सामग्री:" : "Item:"} <span className="font-bold text-foreground">{selectedItemForAdjust.name}</span></div>
                <div>SKU: <span className="font-mono text-workspace-400">{selectedItemForAdjust.sku}</span></div>
                <div>
                  {locale === "ne" ? "हालको मौज्दात:" : "Current Stock:"}{" "}
                  <span className="font-bold text-emerald-500">
                    {parseFloat(selectedItemForAdjust.current_stock).toFixed(2)} {tData(selectedItemForAdjust.unit)}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="qty">{t("relative_change")}</Label>
                <Input
                  id="qty"
                  type="number"
                  step="any"
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                  placeholder={locale === "ne" ? "उदा. +५.५० (थप) वा -३.०० (घटाउ)" : "e.g. +5.50 (addition) or -3.00 (subtraction)"}
                  className="bg-workspace-950 border-workspace-800 text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mov_type">{t("movement_type")}</Label>
                <select
                  id="mov_type"
                  value={adjustData.movement_type}
                  onChange={(e) => setAdjustData({ ...adjustData, movement_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-workspace-950 border border-workspace-800 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="adjustment">{tData("adjustment")}</option>
                  <option value="manual_in">{tData("manual_in")}</option>
                  <option value="manual_out">{tData("manual_out")}</option>
                  <option value="waste">{tData("waste")}</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">{t("audit_notes")}</Label>
                <Textarea
                  id="notes"
                  value={adjustData.notes}
                  onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
                  placeholder={locale === "ne" ? "उदा. प्याकेजिङ बिग्रेको, भौतिक मौज्दात र रेकर्ड नमिलेको..." : "e.g. Broken packaging, physical stock count mismatch..."}
                  className="bg-workspace-950 border-workspace-800 text-white text-xs h-20"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-workspace-800">
                <Button type="button" variant="ghost" onClick={() => setSelectedItemForAdjust(null)} className="h-9 hover:bg-workspace-800 text-workspace-400">
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" className="h-9 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white">
                  {t("execute_audit")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
