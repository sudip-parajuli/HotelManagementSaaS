import React, { useState, useEffect } from "react";
import { Clock, Check, ChefHat } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { KOT } from "@/lib/types";

interface KDSOrderCardProps {
  kot: KOT;
  onComplete: (kotId: number) => void;
  onItemStatusChange?: (kotId: number, itemId: number, status: "preparing" | "ready" | "served") => void;
}

export function KDSOrderCard({ kot, onComplete, onItemStatusChange }: KDSOrderCardProps) {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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
    if (type.includes("room")) return "bg-purple-500/15 text-purple-400 border-purple-500/25";
    if (type.includes("takeaway")) return "bg-blue-500/15 text-blue-400 border-blue-500/25";
    if (type.includes("bar")) return "bg-amber-500/15 text-amber-400 border-amber-500/25";
    return "bg-cyan-500/15 text-cyan-400 border-cyan-500/25";
  };

  return (
    <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md flex flex-col h-[380px] hover:border-slate-700 hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Header */}
      <CardHeader className="p-3.5 border-b border-slate-900 bg-slate-950/40 flex flex-row items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-100 text-sm">
              Table {kot.table_number || "N/A"}
            </span>
            <Badge className={`text-[9px] px-1.5 py-0 capitalize ${getOrderTypeBadgeColor()}`} variant="outline">
              {kot.order_type}
            </Badge>
          </div>
          <span className="text-[10px] text-slate-500 block">KOT #{kot.id} / Order #{kot.order_id}</span>
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
            className="flex flex-col gap-1 p-2 rounded-lg bg-slate-950/30 border border-slate-900"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <span className="font-bold text-sm text-cyan-400 mt-0.5">
                  {item.quantity}x
                </span>
                <div>
                  <span className={`text-xs font-semibold text-slate-200 ${item.status === "ready" || item.status === "served" ? "line-through text-slate-500" : ""}`}>
                    {item.name}
                  </span>
                  {item.notes && (
                    <span className="text-[10px] text-amber-400 block font-medium mt-0.5">
                      Note: {item.notes}
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
                      className="h-5 px-1.5 text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      Prep
                    </Button>
                  )}
                  {item.status === "preparing" && (
                    <Button
                      size="xs"
                      onClick={() => onItemStatusChange(kot.id, item.item_id, "ready")}
                      className="h-5 px-1.5 text-[9px] bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-600/30"
                    >
                      Ready
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
      <CardFooter className="p-3 border-t border-slate-900 bg-slate-950/30">
        <Button
          onClick={() => onComplete(kot.id)}
          className="w-full bg-cyan-600 text-white hover:bg-cyan-500 font-semibold text-xs py-2 shadow-md shadow-cyan-600/20 flex items-center justify-center gap-1.5"
        >
          <ChefHat className="h-4 w-4" />
          Mark Ticket Done
        </Button>
      </CardFooter>
    </Card>
  );
}
