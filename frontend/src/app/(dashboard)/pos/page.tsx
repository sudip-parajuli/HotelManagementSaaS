"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, LayoutGrid, ChefHat, RefreshCw, ShoppingCart, ListCollapse, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MenuPanel } from "@/components/modules/pos/MenuPanel";
import { OrderPanel } from "@/components/modules/pos/OrderPanel";
import { restaurantApi } from "@/lib/api/restaurant";
import { posApi } from "@/lib/api/pos";
import { usePOSStore } from "@/lib/store/posStore";
import type { MenuCategory, MenuItem, Order, DiningTable } from "@/lib/types";

function POSContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("orderId");

  const { tableId, setTable, clearCart } = usePOSStore();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Load baseline tables, categories, and active orders
  const loadBaseData = async () => {
    try {
      const [categoriesRes, tablesRes, activeOrdersRes] = await Promise.all([
        restaurantApi.getCategories(),
        restaurantApi.getTables(),
        posApi.getActiveOrders(),
      ]);
      setCategories(categoriesRes.data);
      setTables(tablesRes.data);
      setActiveOrders(activeOrdersRes.data);
    } catch (err) {
      console.error("Failed to load POS catalog", err);
    }
  };

  // Sync selected table state from store tableId
  useEffect(() => {
    if (tableId && tables.length > 0) {
      const found = tables.find((t) => t.id === tableId);
      setSelectedTable(found || null);
    } else {
      setSelectedTable(null);
    }
  }, [tableId, tables]);

  // Load initial data
  useEffect(() => {
    setLoading(true);
    loadBaseData().finally(() => setLoading(false));
  }, []);

  // Watch URL orderIdParam for viewing active orders
  useEffect(() => {
    if (orderIdParam) {
      setLoadingOrder(true);
      posApi.getOrder(parseInt(orderIdParam))
        .then((res) => {
          setActiveOrder(res.data);
          // Set tableId if order has a table
          if (res.data.table) {
            setTable(res.data.table);
          }
        })
        .catch((err) => {
          console.error("Failed to load active order", err);
          router.replace("/pos");
        })
        .finally(() => {
          setLoadingOrder(false);
        });
    } else {
      setActiveOrder(null);
    }
  }, [orderIdParam, router, setTable]);

  const handleAddItem = (item: MenuItem) => {
    // Convert price to float for cart representation
    usePOSStore.getState().addItem({
      id: item.id,
      name: item.name,
      price: parseFloat(item.price),
    });
  };

  const handleOrderCreated = (order: Order) => {
    // Reset selections and refresh orders list
    clearCart();
    loadBaseData();
    router.push(`/pos?orderId=${order.id}`);
  };

  const handleOrderUpdated = (order: Order) => {
    setActiveOrder(order);
    loadBaseData();
  };

  const handleOrderPaid = (order: Order) => {
    // Settle resets cart
    clearCart();
    setActiveOrder(null);
    loadBaseData();
    router.push("/pos/tables");
  };

  const handleOrderVoided = () => {
    clearCart();
    setActiveOrder(null);
    loadBaseData();
    router.push("/pos/tables");
  };

  const handleSelectActiveOrder = (order: Order) => {
    clearCart();
    router.push(`/pos?orderId=${order.id}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* POS Top Bar */}
      <div className="px-6 py-3 border-b border-slate-900 bg-slate-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/20">
              <ShoppingCart className="h-4.5 w-4.5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100">POS Ordering Terminal</h1>
              <p className="text-[10px] text-slate-500">Cart checkout and order management</p>
            </div>
          </div>

          {/* Active Orders Quick-Selector */}
          {activeOrders.length > 0 && (
            <div className="flex items-center gap-1.5 ml-4">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Active:</span>
              <div className="flex gap-1 overflow-x-auto max-w-[240px] scrollbar-none py-0.5">
                {activeOrders.map((o) => (
                  <Button
                    key={o.id}
                    variant="outline"
                    size="xs"
                    onClick={() => handleSelectActiveOrder(o)}
                    className={`text-[9px] h-6 px-2 border-slate-800 ${
                      activeOrder?.id === o.id
                        ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                        : "bg-slate-900/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    #{o.id} {o.table_number ? `T-${o.table_number}` : "Takeaway"}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Route Swaps */}
        <div className="flex items-center gap-2">
          <Link href="/pos/tables">
            <Button variant="outline" size="sm" className="border-slate-800 text-slate-300 hover:bg-slate-900 text-xs">
              <LayoutGrid className="h-4 w-4 mr-1.5" /> Tables Map
            </Button>
          </Link>
          <Link href="/pos/kds">
            <Button variant="outline" size="sm" className="border-slate-800 text-slate-300 hover:bg-slate-900 text-xs">
              <ChefHat className="h-4 w-4 mr-1.5" /> Kitchen Display (KDS)
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadBaseData}
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-900 h-8 w-8"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Panel Content Split */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
          <span className="text-sm text-slate-400 font-medium">Loading menu catalog...</span>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Menu Items catalog panel */}
          <div className="flex-1 overflow-y-auto p-6">
            <MenuPanel categories={categories} onAddItem={handleAddItem} />
          </div>

          {/* Right Order details cart panel */}
          {loadingOrder ? (
            <div className="w-[380px] border-l border-slate-900 bg-slate-950 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
              <span className="text-xs text-slate-400">Loading order ticket...</span>
            </div>
          ) : (
            <OrderPanel
              activeOrder={activeOrder}
              selectedTable={selectedTable}
              onOrderCreated={handleOrderCreated}
              onOrderUpdated={handleOrderUpdated}
              onOrderPaid={handleOrderPaid}
              onOrderVoided={handleOrderVoided}
              onCancelActiveView={() => {
                clearCart();
                router.push("/pos");
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function POSPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
          <span className="text-sm text-slate-400">Loading ordering screen...</span>
        </div>
      </div>
    }>
      <POSContent />
    </Suspense>
  );
}
