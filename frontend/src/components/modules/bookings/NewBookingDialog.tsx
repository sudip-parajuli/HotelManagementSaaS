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
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

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

  const t = useTranslations("Bookings");
  const tFront = useTranslations("FrontDesk");
  const tRooms = useTranslations("Rooms");
  const tData = useTransData();
  const locale = useLocale();

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
      <DialogContent className="sm:max-w-md bg-workspace-950 border border-workspace-900 text-workspace-100 p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <Plus className="h-5 w-5 text-brand-400" />
            {locale === "ne" ? "द्रुत बुकिङ" : "Quick Reservation"}
          </DialogTitle>
          <DialogDescription className="text-workspace-400 text-xs">
            {locale === "ne" ? `कोठा नं ${room.room_number} को लागि नयाँ बसाई बुकिङ सुरु गर्नुहोस्।` : `Start a new stay reservation for Room ${room.room_number}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 text-xs">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-workspace-900 bg-workspace-900/20 p-4">
            <div>
              <span className="text-workspace-500 block">{locale === "ne" ? "मिति" : "Date"}</span>
              <span className="font-semibold text-workspace-200">{checkInDate}</span>
            </div>
            <div>
              <span className="text-workspace-500 block">{tFront("room_no")}</span>
              <span className="font-semibold text-workspace-200">{tFront("room")} {room.room_number}</span>
            </div>
            <div>
              <span className="text-workspace-500 block">{tRooms("floor_level")}</span>
              <span className="font-semibold text-workspace-200">{tRooms("floor_n", { n: room.floor })}</span>
            </div>
            <div>
              <span className="text-workspace-500 block">{locale === "ne" ? "कोठा वर्ग" : "Room Class"}</span>
              <span className="font-semibold text-workspace-200">{tData(room.room_type?.name)}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-4 gap-2 text-workspace-500">
              <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
              {locale === "ne" ? "अनुमानित दर गणना गरिँदैछ..." : "Calculating rate estimate..."}
            </div>
          ) : estimate ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-brand-500/5 border border-brand-500/10 text-brand-400">
              <span>{locale === "ne" ? "अनुमानित दैनिक दर:" : "Estimated Daily Rate:"}</span>
              <span className="font-extrabold text-sm">
                Rs. {Number(estimate.total_price).toLocaleString()} {locale === "ne" ? "(भ्याट सहित)" : "(incl. VAT)"}
              </span>
            </div>
          ) : null}
        </div>

        <DialogFooter className="mt-4 pt-4 border-t border-workspace-900">
          <Button
            onClick={handleStartBooking}
            className="w-full bg-gradient-to-tr from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold gap-2 shadow-lg shadow-brand-500/20"
          >
            {t("create_booking")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
