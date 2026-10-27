"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, RefreshCw, Layers, LayoutGrid, CheckSquare, ChefHat, HelpCircle, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { restaurantApi } from "@/lib/api/restaurant";
import { posApi } from "@/lib/api/pos";
import { usePOSStore } from "@/lib/store/posStore";
import type { DiningTable, Order } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

export default function TablesPage() {
  const router = useRouter();
  const setTable = usePOSStore((s) => s.setTable);
  const clearCart = usePOSStore((s) => s.clearCart);

  const t = useTranslations("POS");
  const tData = useTransData();
  const locale = useLocale();

  const [tables, setTables] = useState<DiningTable[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      const [tablesRes, ordersRes] = await Promise.all([
        restaurantApi.getTables(),
        posApi.getActiveOrders(),
      ]);
      setTables(tablesRes.data);
      setActiveOrders(ordersRes.data);
    } catch (err) {
      console.error("Failed to load tables or active orders", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Find associated active order for occupied table
  const getTableOrder = (tableId: number) => {
    return activeOrders.find((o) => o.table === tableId);
  };

  // Group tables by Dining Area
  const tablesByArea = React.useMemo(() => {
    const groups: Record<string, DiningTable[]> = {};
    tables.forEach((t) => {
      const areaName = t.area_name || "General Area";
      if (!groups[areaName]) groups[areaName] = [];
      groups[areaName].push(t);
    });
    return groups;
  }, [tables]);

  const handleTableClick = (table: DiningTable) => {
    const linkedOrder = getTableOrder(table.id);

    if (table.status === "available" || !linkedOrder) {
      // Clear previous cart, select table and push to Ordering screen
      clearCart();
      setTable(table.id);
      router.push("/pos");
    } else {
      // It's occupied, push to Ordering screen and pass orderId in query to view it
      clearCart();
      router.push(`/pos?orderId=${linkedOrder.id}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20";
      case "occupied":
        return "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20";
      case "reserved":
        return "bg-brand-500/10 border-brand-500/30 text-brand-400 hover:bg-brand-500/20";
      case "cleaning":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20";
      default:
        return "bg-workspace-900 border-workspace-800 text-workspace-400";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Tabs Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-workspace-900/40 p-4 border border-workspace-900 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-brand-500/10 rounded-lg flex items-center justify-center border border-brand-500/20">
            <LayoutGrid className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r text-foreground">{t("tables_title")}</h1>
            <p className="text-xs text-workspace-500 mt-0.5">{t("tables_subtitle")}</p>
          </div>
        </div>

        {/* Route Swaps Navigation */}
        <div className="flex items-center gap-2">
          <Link href="/pos">
            <Button variant="outline" size="sm" className="border-workspace-800 text-workspace-300 hover:bg-workspace-950 text-xs">
              <Utensils className="h-4 w-4 mr-1.5" /> {locale === "ne" ? "अर्डर टर्मिनल" : "Ordering Terminal"}
            </Button>
          </Link>
          <Link href="/pos/kds">
            <Button variant="outline" size="sm" className="border-workspace-800 text-workspace-300 hover:bg-workspace-950 text-xs">
              <ChefHat className="h-4 w-4 mr-1.5" /> {t("kds_view")}
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="text-workspace-400 hover:text-workspace-100 hover:bg-workspace-900"
          >
            <RefreshCw className={cn("h-4.5 w-4.5", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
          <span className="text-sm font-medium text-workspace-400">
            {locale === "ne" ? "टेबल विवरण लोड हुँदैछ..." : "Loading tables data..."}
          </span>
        </div>
      ) : Object.keys(tablesByArea).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-workspace-900 rounded-xl bg-workspace-950/20">
          <HelpCircle className="h-12 w-12 text-workspace-700 mb-2" />
          <p className="text-sm text-workspace-400 font-semibold">
            {locale === "ne" ? "कुनै डाइनिङ क्षेत्र कन्फिगर गरिएको छैन" : "No Dining Areas configured"}
          </p>
          <p className="text-xs text-workspace-500 mt-1">
            {locale === "ne"
              ? "एडमिन पोर्टलमा डाइनिङ क्षेत्र र टेबलहरू कन्फिगर गर्नुहोस्।"
              : "Configure Dining Areas and Tables in the admin portal."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(tablesByArea).map(([areaName, areaTables]) => (
            <div key={areaName} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-workspace-900 pb-2">
                <Layers className="h-4 w-4 text-brand-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-workspace-300">
                  {locale === "ne" ? tData(areaName) : areaName}
                </h2>
                <span className="text-xs text-workspace-500 font-mono">
                  {locale === "ne" ? `(${areaTables.length} टेबलहरू)` : `(${areaTables.length} tables)`}
                </span>
              </div>

              {/* Tables grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {areaTables.map((table) => {
                  const linkedOrder = getTableOrder(table.id);
                  return (
                    <button
                      key={table.id}
                      onClick={() => handleTableClick(table)}
                      className={cn(
                        "group h-32 p-4 rounded-xl border flex flex-col justify-between text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg backdrop-blur-md",
                        getStatusColor(table.status)
                      )}
                    >
                      <div className="flex justify-between items-start w-full gap-2">
                        <span className="font-extrabold text-base tracking-tight">
                          {locale === "ne" ? `टेबल ${table.table_number}` : `T-${table.table_number}`}
                        </span>
                        <Badge className="text-[9px] capitalize px-1.5 py-0 border-workspace-800" variant="secondary">
                          {tData(table.status)}
                        </Badge>
                      </div>

                      <div className="space-y-1 mt-2">
                        <span className="text-[10px] text-workspace-500 block font-medium">
                          {locale === "ne"
                            ? `क्षमता: ${table.capacity} व्यक्ति`
                            : `Capacity: ${table.capacity} Pax`}
                        </span>
                        {linkedOrder && (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-semibold text-workspace-300 block truncate">
                              {locale === "ne" ? `अर्डर #${linkedOrder.id}` : `Order #${linkedOrder.id}`}
                            </span>
                            <span className="text-[10px] text-brand-400 font-extrabold block">
                              Rs. {parseFloat(linkedOrder.total_amount).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
