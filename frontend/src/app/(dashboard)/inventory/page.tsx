"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Package, 
  AlertTriangle, 
  FileText, 
  ArrowUpDown, 
  Plus, 
  TrendingDown, 
  TrendingUp, 
  Users,
  Activity,
  ArrowRight
} from "lucide-react";
import { inventoryApi } from "@/lib/api/inventory";
import type { InventoryItem, PurchaseOrder, StockMovement } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function InventoryDashboard() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [itemsRes, posRes, movementsRes] = await Promise.all([
          inventoryApi.getItems(),
          inventoryApi.getPOs(),
          inventoryApi.getMovements(),
        ]);
        setItems(itemsRes.data || []);
        setPos(posRes.data || []);
        setMovements(movementsRes.data || []);
      } catch (err) {
        console.error("Error fetching inventory dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const lowStockItems = items.filter(
    (item) => parseFloat(item.current_stock) <= parseFloat(item.reorder_level)
  );

  const activePOs = pos.filter(
    (po) => po.status === "draft" || po.status === "sent" || po.status === "partial"
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Inventory Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Monitor stocks, recipe auto-deductions, purchase orders, and supplier catalogs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/inventory/items">
            <Button className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Manage Items
            </Button>
          </Link>
          <Link href="/inventory/po">
            <Button className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Purchase Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-900/40 backdrop-blur-md border-slate-800/80 shadow-lg shadow-black/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-200">
            <Package className="h-24 w-24 text-white" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Catalog Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{items.length}</div>
            <p className="text-xs text-slate-500 mt-1">Active ingredients and commodities</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 backdrop-blur-md border-slate-800/80 shadow-lg shadow-black/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-200">
            <AlertTriangle className="h-24 w-24 text-white" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className={`text-3xl font-bold ${lowStockItems.length > 0 ? "text-amber-500 animate-pulse" : "text-white"}`}>
                {lowStockItems.length}
              </div>
              {lowStockItems.length > 0 && (
                <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10 text-[10px]">
                  Reorder Needed
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">Items at or below critical level</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 backdrop-blur-md border-slate-800/80 shadow-lg shadow-black/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-200">
            <FileText className="h-24 w-24 text-white" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Active Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{activePOs.length}</div>
            <p className="text-xs text-slate-500 mt-1">Pending delivery and GRN audits</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 backdrop-blur-md border-slate-800/80 shadow-lg shadow-black/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-200">
            <Activity className="h-24 w-24 text-white" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Stock Movements (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{movements.length}</div>
            <p className="text-xs text-slate-500 mt-1">Serves, manual adjustments & inputs</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Low stock alerts & Stock Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Low Stock Alerts */}
        <Card className="lg:col-span-5 bg-slate-900/20 border-slate-800/60 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/50 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Critical Low Stock
              </CardTitle>
            </div>
            {lowStockItems.length > 0 && (
              <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 font-semibold">
                Action Required
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {lowStockItems.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Package className="h-10 w-10 text-emerald-500 mx-auto opacity-40" />
                <p className="text-slate-400 font-medium text-sm">All stocks healthy</p>
                <p className="text-xs text-slate-500">No items are below reorder level</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {lowStockItems.map((item) => (
                  <div 
                    key={item.id}
                    className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/50 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-white text-sm">{item.name}</div>
                      <div className="text-xs text-slate-500 font-mono">SKU: {item.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-amber-500">
                        {parseFloat(item.current_stock).toFixed(1)} {item.unit}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Limit: {parseFloat(item.reorder_level).toFixed(1)} {item.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Recent movements */}
        <Card className="lg:col-span-7 bg-slate-900/20 border-slate-800/60 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/50 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5 text-emerald-500" />
                Recent Stock Ledger Feed
              </CardTitle>
            </div>
            <Link href="/inventory/items" className="text-xs text-primary hover:underline flex items-center gap-1">
              View Items Ledger
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {movements.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Activity className="h-10 w-10 text-slate-500 mx-auto opacity-40" />
                <p className="text-slate-400 text-sm">No ledger entries logged yet</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {movements.slice(0, 10).map((m) => {
                  const isPositive = ["purchase_in", "manual_in", "adjustment"].includes(m.movement_type);
                  return (
                    <div 
                      key={m.id}
                      className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{m.item_name}</div>
                          <div className="text-slate-500 mt-0.5">
                            {m.notes || `Type: ${m.movement_type}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className={`font-bold ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                          {isPositive ? "+" : "-"}{parseFloat(m.quantity).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(m.created_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Active PO list summary */}
      <Card className="bg-slate-900/20 border-slate-800/60 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/50 pb-4">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            Ongoing Purchase Orders
          </CardTitle>
          <Link href="/inventory/po" className="text-xs text-primary hover:underline flex items-center gap-1">
            Open PO Workspace
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="pt-4 overflow-x-auto">
          {activePOs.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <FileText className="h-10 w-10 text-slate-500 mx-auto opacity-40" />
              <p className="text-slate-400 text-sm">No active purchase orders</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-3 px-4">PO Code</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {activePOs.slice(0, 5).map((po) => (
                  <tr key={po.id} className="border-b border-slate-900 hover:bg-slate-950/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">#PO-{po.id}</td>
                    <td className="py-3 px-4 text-slate-300 font-medium">{po.supplier_name}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(po.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-bold">Rs. {parseFloat(po.total_amount).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <Badge className={
                        po.status === "sent" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                        po.status === "partial" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                        "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                      }>
                        {po.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href="/inventory/po">
                        <Button size="sm" variant="ghost" className="h-7 text-primary hover:text-white hover:bg-slate-800 text-[11px]">
                          Open GRN Wizard
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
