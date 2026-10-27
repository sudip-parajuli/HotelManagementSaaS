"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, LayoutGrid, ChefHat, RefreshCw, ShoppingCart, Utensils, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MenuPanel } from "@/components/modules/pos/MenuPanel";
import { OrderPanel } from "@/components/modules/pos/OrderPanel";
import { restaurantApi } from "@/lib/api/restaurant";
import { posApi } from "@/lib/api/pos";
import { usePOSStore } from "@/lib/store/posStore";
import type { MenuCategory, MenuItem, Order, DiningTable } from "@/lib/types";
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

function POSContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("orderId");

  const t = useTranslations("POS");
  const tData = useTransData();
  const locale = useLocale();

  const { tableId, setTable, clearCart } = usePOSStore();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);

  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const ensureArray = <T,>(data: any): T[] => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  };

  const loadBaseData = async () => {
    try {
      const [categoriesRes, tablesRes, activeOrdersRes] = await Promise.all([
        restaurantApi.getCategories(),
        restaurantApi.getTables(),
        posApi.getActiveOrders(),
      ]);
      setCategories(ensureArray<MenuCategory>(categoriesRes.data));
      setTables(ensureArray<DiningTable>(tablesRes.data));
      setActiveOrders(ensureArray<Order>(activeOrdersRes.data));
    } catch (err) {
      console.error("Failed to load POS catalog", err);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadBaseData().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tableId && tables.length > 0) {
      const found = tables.find((t) => t.id === tableId);
      setSelectedTable(found || null);
    } else {
      setSelectedTable(null);
    }
  }, [tableId, tables]);

  useEffect(() => {
    if (orderIdParam) {
      setLoadingOrder(true);
      posApi.getOrder(parseInt(orderIdParam))
        .then((res) => {
          setActiveOrder(res.data);
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
    usePOSStore.getState().addItem({
      id: item.id,
      name: item.name,
      price: parseFloat(item.price),
    });
  };

  const handleOrderCreated = (order: Order) => {
    clearCart();
    loadBaseData();
    router.push(`/pos?orderId=${order.id}`);
  };

  const handleOrderUpdated = (order: Order) => {
    setActiveOrder(order);
    loadBaseData();
  };

  const handleOrderPaid = (order: Order) => {
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
      <div className="px-6 py-3 border-b border-workspace-900 bg-workspace-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-brand-500/10 rounded-lg flex items-center justify-center border border-brand-500/20">
              <ShoppingCart className="h-4.5 w-4.5 text-brand-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-workspace-100">{t("title")}</h1>
              <p className="text-[10px] text-workspace-500">{t("subtitle")}</p>
            </div>
          </div>

          {activeOrders.length > 0 && (
            <div className="flex items-center gap-1.5 ml-4">
              <span className="text-[10px] text-workspace-500 font-semibold uppercase tracking-wider">
                {locale === "ne" ? "सक्रिय:" : "Active:"}
              </span>
              <div className="flex gap-1 overflow-x-auto max-w-[240px] scrollbar-none py-0.5">
                {activeOrders.map((o) => (
                  <Button
                    key={o.id}
                    variant="outline"
                    size="xs"
                    onClick={() => handleSelectActiveOrder(o)}
                    className={`text-[9px] h-6 px-2 border-workspace-800 ${
                      activeOrder?.id === o.id
                        ? "bg-brand-500/10 border-brand-500 text-brand-400"
                        : "bg-workspace-900/60 text-workspace-400 hover:text-workspace-200"
                    }`}
                  >
                    #{o.id} {o.table_number ? `T-${o.table_number}` : tData("takeaway")}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/pos/tables">
            <Button variant="outline" size="sm" className="border-workspace-800 text-workspace-300 hover:bg-workspace-900 text-xs">
              <LayoutGrid className="h-4 w-4 mr-1.5" /> {t("tables_view")}
            </Button>
          </Link>
          <Link href="/pos/kds">
            <Button variant="outline" size="sm" className="border-workspace-800 text-workspace-300 hover:bg-workspace-900 text-xs">
              <ChefHat className="h-4 w-4 mr-1.5" /> {t("kds_view")}
            </Button>
          </Link>
          <Link href="/pos/insights">
            <Button variant="outline" size="sm" className="border-workspace-800 text-workspace-300 hover:bg-workspace-900 text-xs">
              <BarChart className="h-4 w-4 mr-1.5" /> {t("insights_view")}
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadBaseData}
            className="text-workspace-400 hover:text-workspace-100 hover:bg-workspace-900 h-8 w-8"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
          <span className="text-sm text-workspace-400 font-medium">
            {locale === "ne" ? "मेनु क्याटलग लोड हुँदैछ..." : "Loading menu catalog..."}
          </span>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <MenuPanel categories={categories} onAddItem={handleAddItem} />
          </div>

          {loadingOrder ? (
            <div className="w-[380px] border-l border-workspace-900 bg-workspace-950 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 text-brand-500 animate-spin" />
              <span className="text-xs text-workspace-400">
                {locale === "ne" ? "अर्डर टिकट लोड हुँदैछ..." : "Loading order ticket..."}
              </span>
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
  const locale = useLocale();

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-workspace-950 text-foreground">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
          <span className="text-sm text-workspace-400">
            {locale === "ne" ? "अर्डर स्क्रिन लोड हुँदैछ..." : "Loading ordering screen..."}
          </span>
        </div>
      </div>
    }>
      <POSContent />
    </Suspense>
  );
}

