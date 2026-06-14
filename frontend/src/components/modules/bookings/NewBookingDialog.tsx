"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plus, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { roomsApi } from "@/lib/api/rooms";
import { bookingsApi } from "@/lib/api/bookings";
import type { Room } from "@/lib/types";

interface NewBookingDialogProps {
  room: Room | null;
  checkInDate: string; // YYYY-MM-DD
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewBookingDialog: React.FC<NewBookingDialogProps> = ({
  room,
  checkInDate,
  open,
  onOpenChange,
}) => {
  const router = useRouter();
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !room || !checkInDate) return;

    const fetchEstimate = async () => {
      setLoading(true);
      try {
        const checkOut = new Date(checkInDate);
        checkOut.setDate(checkOut.getDate() + 1);
        const checkOutStr = checkOut.toISOString().split("T")[0];

        const res = await bookingsApi.checkAvailability({
          check_in: checkInDate,
          check_out: checkOutStr,
          adults: 1,
          room_type: room.room_type?.id,
        });
        const estimates = res.data.pricing_estimates || {};
        setEstimate(estimates[room.room_type?.id] || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEstimate();
  }, [open, room, checkInDate]);

  if (!room) return null;

  const handleStartBooking = () => {
    const checkOut = new Date(checkInDate);
    checkOut.setDate(checkOut.getDate() + 1);
    const checkOutStr = checkOut.toISOString().split("T")[0];

    onOpenChange(false);
    router.push(
      `/bookings/new?room_id=${room.id}&check_in=${checkInDate}&check_out=${checkOutStr}`
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-950 border border-slate-900 text-slate-100 p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Plus className="h-5 w-5 text-cyan-400" />
            Quick Reservation
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Start a new stay reservation for Room {room.room_number}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 text-xs">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-900 bg-slate-900/20 p-4">
            <div>
              <span className="text-slate-500 block">Date</span>
              <span className="font-semibold text-slate-200">{checkInDate}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Room Number</span>
              <span className="font-semibold text-slate-200">Room {room.room_number}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Floor level</span>
              <span className="font-semibold text-slate-200">Floor {room.floor}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Room Class</span>
              <span className="font-semibold text-slate-200">{room.room_type?.name}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-4 gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
              Calculating rate estimate...
            </div>
          ) : estimate ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10 text-cyan-400">
              <span>Estimated Daily Rate:</span>
              <span className="font-extrabold text-sm">
                Rs. {Number(estimate.total_price).toLocaleString()} (incl. VAT)
              </span>
            </div>
          ) : null}
        </div>

        <DialogFooter className="mt-4 pt-4 border-t border-slate-900">
          <Button
            onClick={handleStartBooking}
            className="w-full bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold gap-2 shadow-lg shadow-cyan-500/20"
          >
            Create Reservation
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
