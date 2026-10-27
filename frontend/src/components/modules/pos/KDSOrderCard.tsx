import React, { useState, useEffect } from "react";
import { Clock, Check, ChefHat } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { KOT } from "@/lib/types";
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

interface KDSOrderCardProps {
  kot: KOT;
  onComplete: (kotId: number) => void;
  onItemStatusChange?: (kotId: number, itemId: number, status: "preparing" | "ready" | "served") => void;
}

export function KDSOrderCard({ kot, onComplete, onItemStatusChange }: KDSOrderCardProps) {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const t = useTranslations("POS");
  const tData = useTransData();
  const locale = useLocale();

  useEffect(() => {
    const calculateElapsed = () => {
      const createdTime = new Date(kot.created_at).getTime();
      const now = new Date().getTime();
      const diffMs = now - createdTime;
      const totalSeconds = Math.max(Math.floor(diffMs / 1000), 0);
      setElapsedMinutes(Math.floor(totalSeconds / 60));
      setElapsedSeconds(totalSeconds % 60);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [kot.created_at]);

  // Color coding based on elapsed time: <10m green, 10-20m yellow, >20m red
  const getTimerColor = () => {
    if (elapsedMinutes >= 20) {
      return "text-red-400 bg-red-500/10 border-red-500/20 shadow-md shadow-red-500/5 animate-pulse";
    }
    if (elapsedMinutes >= 10) {
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    }
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  };

  const getOrderTypeBadgeColor = () => {
    const type = kot.order_type.toLowerCase();
    if (type.includes("room")) return "bg-brand-500/15 text-brand-400 border-brand-500/25";
    if (type.includes("takeaway")) return "bg-brand-500/15 text-brand-400 border-brand-500/25";
    if (type.includes("bar")) return "bg-amber-500/15 text-amber-400 border-amber-500/25";
    return "bg-brand-500/15 text-brand-400 border-brand-500/25";
  };

  return (
    <Card className="bg-workspace-900/60 border-workspace-800 backdrop-blur-md flex flex-col h-[380px] hover:border-workspace-700 hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Header */}
      <CardHeader className="p-3.5 border-b border-workspace-900 bg-workspace-950/40 flex flex-row items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-workspace-100 text-sm">
              {locale === "ne" ? `टेबल ${kot.table_number || "N/A"}` : `Table ${kot.table_number || "N/A"}`}
            </span>
            <Badge className={`text-[9px] px-1.5 py-0 capitalize ${getOrderTypeBadgeColor()}`} variant="outline">
              {tData(kot.order_type)}
            </Badge>
          </div>
          <span className="text-[10px] text-workspace-500 block">
            {locale === "ne"
              ? `KOT #${kot.id} / अर्डर #${kot.order_id}`
              : `KOT #${kot.id} / Order #${kot.order_id}`}
          </span>
        </div>

        {/* Elapsed Timer */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold ${getTimerColor()}`}>
          <Clock className="h-3 w-3" />
          <span>
            {elapsedMinutes.toString().padStart(2, "0")}:{elapsedSeconds.toString().padStart(2, "0")}
          </span>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="p-3.5 flex-1 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-slate-900">
        {kot.items.map((item) => (
          <div
            key={item.item_id}
            className="flex flex-col gap-1 p-2 rounded-lg bg-workspace-950/30 border border-workspace-900"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <span className="font-bold text-sm text-brand-400 mt-0.5">
                  {item.quantity}x
                </span>
                <div>
                  <span className={`text-xs font-semibold text-workspace-200 ${item.status === "ready" || item.status === "served" ? "line-through text-workspace-500" : ""}`}>
                    {tData(item.name)}
                  </span>
                  {item.notes && (
                    <span className="text-[10px] text-amber-400 block font-medium mt-0.5">
                      {locale === "ne" ? `टिपोट: ${item.notes}` : `Note: ${item.notes}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Prep Control inside KDS card */}
              {onItemStatusChange && (
                <div className="flex gap-1">
                  {item.status === "pending" && (
                    <Button
                      size="xs"
                      onClick={() => onItemStatusChange(kot.id, item.item_id, "preparing")}
                      className="h-5 px-1.5 text-[9px] bg-workspace-800 hover:bg-workspace-700 text-workspace-300"
                    >
                      {locale === "ne" ? "तयारी" : "Prep"}
                    </Button>
                  )}
                  {item.status === "preparing" && (
                    <Button
                      size="xs"
                      onClick={() => onItemStatusChange(kot.id, item.item_id, "ready")}
                      className="h-5 px-1.5 text-[9px] bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-600/30"
                    >
                      {locale === "ne" ? "तयार" : "Ready"}
                    </Button>
                  )}
                  {(item.status === "ready" || item.status === "served") && (
                    <div className="h-5 w-5 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>

      {/* Done Button */}
      <CardFooter className="p-3 border-t border-workspace-900 bg-workspace-950/30">
        <Button
          onClick={() => onComplete(kot.id)}
          className="w-full bg-brand-600 text-white hover:bg-brand-500 font-semibold text-xs py-2 shadow-md shadow-brand-600/20 flex items-center justify-center gap-1.5"
        >
          <ChefHat className="h-4 w-4" />
          {locale === "ne" ? "टिकट सम्पन्न भयो" : "Mark Ticket Done"}
        </Button>
      </CardFooter>
    </Card>
  );
}
