"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Loader2, ChefHat, RefreshCw, LayoutGrid, Utensils, Wifi, WifiOff, AlertCircle, BarChart as BarChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { KDSOrderCard } from "@/components/modules/pos/KDSOrderCard";
import { posApi } from "@/lib/api/pos";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import type { KOT, KOTStation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

const STATIONS = [
  { value: "hot_kitchen", label: "Hot Kitchen" },
  { value: "cold_prep", label: "Cold Prep" },
  { value: "bar", label: "Bar" },
  { value: "pastry", label: "Pastry" },
] as const;

const STATIONS_NEPALESE: Record<string, string> = {
  hot_kitchen: "तातो भान्सा",
  cold_prep: "चिसो तयारी",
  bar: "बार",
  pastry: "पेस्ट्री",
};

export default function KDSPage() {
  const [selectedStation, setSelectedStation] = useState<KOTStation>("hot_kitchen");
  const [kots, setKots] = useState<KOT[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const t = useTranslations("POS");
  const tData = useTransData();
  const locale = useLocale();

  // Load KOTs initially
  const loadKOTs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await posApi.getKOTs(selectedStation);
      setKots(res.data);
    } catch (err) {
      console.error("Failed to load KOT tickets", err);
    } finally {
      setLoading(false);
    }
  }, [selectedStation]);

  useEffect(() => {
    loadKOTs();
  }, [loadKOTs]);

  // Handle live WebSocket event updates
  const handleWebSocketMessage = useCallback((message: any) => {
    const { event, kot, kot_id, item_id, status } = message.data || {};

    if (event === "kot_created" && kot) {
      // Append if it matches current station and isn't already added
      if (kot.station === selectedStation) {
        setKots((prev) => {
          if (prev.some((p) => p.id === kot.kot_id)) return prev;
          // Parse keys to match TypeScript structure
          const formattedKOT: KOT = {
            id: kot.kot_id,
            order_id: kot.order_id,
            table_number: kot.table_number,
            order_type: kot.order_type,
            station: kot.station,
            station_display: kot.station,
            status: kot.status,
            created_at: kot.created_at,
            items: kot.items.map((i: any) => ({
              item_id: i.item_id,
              name: i.name,
              quantity: i.quantity,
              notes: i.notes,
              modifiers: i.modifiers || {},
              status: i.status,
            })),
          };
          return [...prev, formattedKOT];
        });
      }
    } else if (event === "item_status_updated" && kot_id && item_id && status) {
      setKots((prev) =>
        prev.map((k) => {
          if (k.id !== kot_id) return k;
          return {
            ...k,
            items: k.items.map((i) =>
              i.item_id === item_id ? { ...i, status } : i
            ),
          };
        })
      );
    } else if (event === "kot_completed" && kot_id) {
      // Remove from display
      setKots((prev) => prev.filter((k) => k.id !== kot_id));
    }
  }, [selectedStation]);

  // Setup WebSocket connection to selected station group
  const wsChannel = `kds/${selectedStation}`;
  useWebSocket(wsChannel, {
    onMessage: handleWebSocketMessage,
    onOpen: () => setIsConnected(true),
    onClose: () => setIsConnected(false),
    onError: (err) => console.error("WebSocket Error in KDS:", err),
  });

  const handleKOTComplete = async (kotId: number) => {
    try {
      await posApi.completeKOT(kotId);
      // Remove local copy immediately
      setKots((prev) => prev.filter((k) => k.id !== kotId));
    } catch (err) {
      alert(locale === "ne" ? "KOT टिकट सम्पन्न गर्न असफल भयो।" : "Failed to complete KOT ticket.");
    }
  };

  const handleItemStatusChange = async (
    kotId: number,
    itemId: number,
    status: "preparing" | "ready" | "served"
  ) => {
    const targetKOT = kots.find((k) => k.id === kotId);
    if (!targetKOT) return;

    try {
      await posApi.updateOrderItemStatus(targetKOT.order_id, itemId, status);
      // Update local state immediately
      setKots((prev) =>
        prev.map((k) => {
          if (k.id !== kotId) return k;
          return {
            ...k,
            items: k.items.map((i) =>
              i.item_id === itemId ? { ...i, status } : i
            ),
          };
        })
      );
    } catch (err) {
      alert(locale === "ne" ? "सामग्री स्थिति अपडेट गर्न असफल भयो।" : "Failed to update item status.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top Header Controls */}
      <div className="px-6 py-3 border-b border-workspace-900 bg-workspace-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-brand-500/10 rounded-lg flex items-center justify-center border border-brand-500/20">
            <ChefHat className="h-4.5 w-4.5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-workspace-100 flex items-center gap-2">
              <span>{locale === "ne" ? "भान्सा प्रदर्शन बोर्ड (KDS)" : "Kitchen Display Board (KDS)"}</span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <Wifi className="h-3 w-3" /> {locale === "ne" ? "सक्रिय" : "Live"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-workspace-500 font-semibold bg-workspace-900 border border-workspace-800 px-2 py-0.5 rounded-full">
                  <WifiOff className="h-3 w-3" /> {locale === "ne" ? "पुनः जडान..." : "Reconnecting"}
                </span>
              )}
            </h1>
            <p className="text-[10px] text-workspace-500">{locale === "ne" ? "अर्डर टिकट तयारी अनुगमन" : "Live order ticket prep routing"}</p>
          </div>
        </div>

        {/* Station filter dropdown */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <span className="text-xs text-workspace-400 font-semibold uppercase tracking-wider whitespace-nowrap">
              {locale === "ne" ? "तयारी स्टेशन:" : "Prep Station:"}
            </span>
            <Select
              value={selectedStation}
              onValueChange={(val) => setSelectedStation(val as KOTStation)}
            >
              <SelectTrigger className="w-[160px] bg-workspace-900 border-workspace-800 text-workspace-200 text-xs">
                <SelectValue placeholder={locale === "ne" ? "स्टेशन छान्नुहोस्" : "Select station"}>
                  {(value) => {
                    const s = STATIONS.find((item) => item.value === value);
                    if (s) return locale === "ne" ? STATIONS_NEPALESE[s.value] : s.label;
                    return value || "";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-workspace-900 border-workspace-800 text-workspace-200">
                {STATIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">
                    {locale === "ne" ? STATIONS_NEPALESE[s.value] : s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

<div className="flex gap-2">
             <Link href="/pos">
               <Button variant="outline" size="sm" className="border-workspace-800 text-workspace-300 hover:bg-workspace-900 text-xs">
                 <Utensils className="h-4 w-4 mr-1.5" /> {locale === "ne" ? "POS टर्मिनल" : "POS Terminal"}
               </Button>
             </Link>
             <Link href="/pos/tables">
               <Button variant="outline" size="sm" className="border-workspace-800 text-workspace-300 hover:bg-workspace-900 text-xs">
                 <LayoutGrid className="h-4 w-4 mr-1.5" /> {locale === "ne" ? "टेबलहरूको नक्सा" : "Tables Map"}
               </Button>
             </Link>
             <Link href="/pos/insights">
               <Button variant="outline" size="sm" className="border-workspace-800 text-workspace-300 hover:bg-workspace-900 text-xs">
                 <BarChartIcon className="h-4 w-4 mr-1.5" /> {locale === "ne" ? "बिक्रम विश्लेषण" : "Sales Analytics"}
               </Button>
             </Link>
             <Button
               variant="ghost"
               size="icon"
               onClick={loadKOTs}
               className="text-workspace-400 hover:text-workspace-100 hover:bg-workspace-900 h-8 w-8"
             >
               <RefreshCw className="h-4 w-4" />
             </Button>
           </div>
        </div>
      </div>

      {/* Tickets Board area */}
      <div className="flex-1 overflow-x-auto p-6 bg-workspace-950/20">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
            <span className="text-sm text-workspace-400 font-medium">{locale === "ne" ? "टिकट लाम लोड हुँदैछ..." : "Loading ticket queue..."}</span>
          </div>
        ) : kots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center border border-dashed border-workspace-900 rounded-2xl bg-workspace-950/20 p-8">
            <ChefHat className="h-12 w-12 text-workspace-700 mb-3 animate-bounce" />
            <h3 className="text-sm font-bold text-workspace-300 uppercase tracking-wide">{locale === "ne" ? "भान्सामा कुनै अर्डर छैन" : "All Clear in Kitchen"}</h3>
            <p className="text-xs text-workspace-500 mt-1.5 leading-relaxed">
              {locale === "ne" ? (
                <>यस <span className="font-semibold text-brand-400">{STATIONS_NEPALESE[selectedStation] || selectedStation}</span> मा कुनै पेन्डिङ कुकिङ अर्डरहरू छैनन्।</>
              ) : (
                <>No pending cooking orders routed to the <span className="font-semibold text-brand-400">{STATIONS.find(s=>s.value===selectedStation)?.label}</span>.</>
              )}
            </p>
          </div>
        ) : (
          <div className="flex gap-6 pb-4 h-full items-start">
            {kots.map((kot) => (
              <div key={kot.id} className="w-[300px] flex-shrink-0">
                <KDSOrderCard
                  kot={kot}
                  onComplete={handleKOTComplete}
                  onItemStatusChange={handleItemStatusChange}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
