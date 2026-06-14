"use client";

import React from "react";
import { Bed, CheckCircle2, ShieldAlert, Sparkles, AlertTriangle, Hammer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Room } from "@/lib/types";

interface RoomCardProps {
  room: Room;
  onClick?: () => void;
}

const statusConfigs = {
  available: {
    label: "Available",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
    icon: CheckCircle2,
    color: "text-emerald-400",
    cardBorder: "hover:border-emerald-500/40",
    bgGlow: "from-emerald-500/5 to-transparent",
  },
  occupied: {
    label: "Occupied",
    badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/20 hover:bg-rose-500/20",
    icon: Bed,
    color: "text-rose-400",
    cardBorder: "hover:border-rose-500/40",
    bgGlow: "from-rose-500/5 to-transparent",
  },
  dirty: {
    label: "Dirty",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
    icon: Sparkles,
    color: "text-amber-400",
    cardBorder: "hover:border-amber-500/40",
    bgGlow: "from-amber-500/5 to-transparent",
  },
  maintenance: {
    label: "Maintenance",
    badgeClass: "bg-slate-500/15 text-slate-400 border-slate-500/20 hover:bg-slate-500/20",
    icon: Hammer,
    color: "text-slate-400",
    cardBorder: "hover:border-slate-500/40",
    bgGlow: "from-slate-500/5 to-transparent",
  },
  out_of_order: {
    label: "Out of Order",
    badgeClass: "bg-red-500/15 text-red-500 border-red-500/20 hover:bg-red-500/20",
    icon: AlertTriangle,
    color: "text-red-400",
    cardBorder: "hover:border-red-500/40",
    bgGlow: "from-red-500/5 to-transparent",
  },
};

export const RoomCard: React.FC<RoomCardProps> = ({ room, onClick }) => {
  const config = statusConfigs[room.status] || statusConfigs.available;
  const StatusIcon = config.icon;

  return (
    <Card
      onClick={onClick}
      className={`relative overflow-hidden bg-slate-900/40 border-slate-800/80 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-950/40 ${config.cardBorder} group`}
    >
      {/* Dynamic background glow based on room status */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.bgGlow} opacity-30 group-hover:opacity-50 transition-opacity`} />
      
      <CardContent className="relative p-5 space-y-4">
        {/* Room Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Floor {room.floor}
            </span>
            <h3 className="text-2xl font-extrabold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
              Room {room.room_number}
            </h3>
          </div>
          <Badge variant="outline" className={`py-1 px-2.5 font-semibold text-xs rounded-lg transition-all ${config.badgeClass}`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>

        {/* Room Details */}
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium truncate max-w-[150px]">
            {room.room_type?.name || "Standard Room"}
          </span>
          <span className="text-slate-500">
            {room.room_type?.max_occupancy ? `Max: ${room.room_type.max_occupancy} guests` : ""}
          </span>
        </div>

        {/* Notes Preview if available */}
        {room.notes && (
          <p className="text-[11px] text-slate-500 line-clamp-1 italic">
            "{room.notes}"
          </p>
        )}
      </CardContent>
    </Card>
  );
};
