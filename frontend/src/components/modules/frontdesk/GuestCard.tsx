import React from "react";
import { User, Calendar, Home, ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Reservation } from "@/lib/types";

interface GuestCardProps {
  reservation: Reservation;
  onCheckIn?: (reservation: Reservation) => void;
  onCheckOut?: (reservation: Reservation) => void;
}

export const GuestCard: React.FC<GuestCardProps> = ({ reservation, onCheckIn, onCheckOut }) => {
  const { guest, room, check_in_date, check_out_date, status, total_amount, booking_source } = reservation;

  const getSourceColor = (src: string) => {
    if (src.startsWith("ota")) return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    if (src === "online") return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  };

  return (
    <Card className="bg-slate-900/35 border-slate-800/80 hover:border-slate-800 hover:bg-slate-900/50 transition-all rounded-xl shadow-md overflow-hidden group">
      <CardContent className="p-4 space-y-4">
        {/* Guest Details */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-slate-100 group-hover:text-white transition-colors">
              {guest.first_name} {guest.last_name}
            </h4>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <Phone className="h-3 w-3" />
              <span>{guest.phone}</span>
            </div>
          </div>
          <Badge className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 border ${getSourceColor(booking_source)}`} variant="outline">
            {booking_source.replace("ota_", "").toUpperCase()}
          </Badge>
        </div>

        {/* Room & Pricing details */}
        <div className="grid grid-cols-2 gap-2.5 text-[11px] bg-slate-950/40 p-2.5 rounded-lg border border-slate-900/60">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Home className="h-3.5 w-3.5 text-cyan-500" />
            <span className="font-bold text-slate-200">Room {room.room_number}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Total: </span>
            <span className="font-bold text-emerald-400">Rs. {Number(total_amount).toLocaleString()}</span>
          </div>
          <div className="col-span-2 text-slate-500 text-[10px] font-medium">
            Class: {room.room_type.name}
          </div>
        </div>

        {/* Date breakdown */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900/60 pt-3">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-slate-600" />
            <span>{check_in_date}</span>
          </div>
          <ArrowRight className="h-3 w-3 text-slate-700" />
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-slate-600" />
            <span>{check_out_date}</span>
          </div>
        </div>

        {/* Operations actions */}
        <div className="pt-1">
          {status === "confirmed" && onCheckIn && (
            <Button
              onClick={() => onCheckIn(reservation)}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs h-9 gap-1.5 rounded-lg shadow-lg shadow-cyan-600/10"
            >
              Check In Guest
            </Button>
          )}

          {status === "checked_in" && onCheckOut && (
            <Button
              onClick={() => onCheckOut(reservation)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 gap-1.5 rounded-lg shadow-lg shadow-emerald-600/10"
            >
              Check Out Guest
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
