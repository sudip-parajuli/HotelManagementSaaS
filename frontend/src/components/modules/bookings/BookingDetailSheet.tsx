"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Bed, Calendar, Phone, Mail, User, ShieldAlert, CheckCircle2, XCircle, FileText, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { bookingsApi } from "@/lib/api/bookings";
import type { Reservation } from "@/lib/types";

interface BookingDetailSheetProps {
  reservation: Reservation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const statusConfigs = {
  pending: { label: "Pending", badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  confirmed: { label: "Confirmed", badgeClass: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20" },
  checked_in: { label: "Checked In", badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  checked_out: { label: "Checked Out", badgeClass: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20" },
  cancelled: { label: "Cancelled", badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/20" },
  no_show: { label: "No Show", badgeClass: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
};

export const BookingDetailSheet: React.FC<BookingDetailSheetProps> = ({
  reservation,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!reservation) return null;

  const config = statusConfigs[reservation.status] || statusConfigs.pending;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await bookingsApi.confirmReservation(reservation.id);
      toast.success("Reservation confirmed successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to confirm reservation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    const reason = prompt("Enter reason for cancellation:");
    if (reason === null) return; // cancelled prompt
    
    setIsSubmitting(true);
    try {
      await bookingsApi.cancelReservation(reservation.id, reason);
      toast.success("Reservation cancelled successfully.");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to cancel reservation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md bg-slate-950 border-l border-slate-900 text-slate-100 p-6 flex flex-col gap-6 overflow-y-auto">
        <SheetHeader className="p-0 border-b border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Booking Ref #{reservation.id}
            </span>
            <Badge variant="outline" className={`py-0.5 px-2.5 text-xs font-semibold rounded-lg ${config.badgeClass}`}>
              {config.label}
            </Badge>
          </div>
          <SheetTitle className="text-xl font-black text-white mt-2">
            {reservation.guest?.first_name} {reservation.guest?.last_name}
          </SheetTitle>
          <SheetDescription className="text-slate-500 text-xs">
            Booked via {reservation.booking_source} source
          </SheetDescription>
        </SheetHeader>

        {/* Contact info list */}
        <div className="space-y-2.5 text-xs border-b border-slate-900 pb-4">
          <div className="flex items-center gap-3 text-slate-300">
            <Phone className="h-4 w-4 text-slate-500" />
            <span>{reservation.guest?.phone}</span>
          </div>
          {reservation.guest?.email && (
            <div className="flex items-center gap-3 text-slate-300">
              <Mail className="h-4 w-4 text-slate-500" />
              <span>{reservation.guest.email}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-slate-300">
            <User className="h-4 w-4 text-slate-500" />
            <span>Nationality: {reservation.guest?.nationality || "Nepalese"}</span>
          </div>
        </div>

        {/* Stay specification details */}
        <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-4 w-4 text-cyan-400" />
            Stay Overview
          </h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Check In Date</span>
              <span className="font-semibold text-slate-200">{reservation.check_in_date}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Check Out Date</span>
              <span className="font-semibold text-slate-200">{reservation.check_out_date}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Assigned Room</span>
              <span className="font-semibold text-slate-200">Room {reservation.room?.room_number}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Room Class</span>
              <span className="font-semibold text-slate-200">{reservation.room?.room_type?.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Stay Duration</span>
              <span className="font-semibold text-slate-200">{reservation.total_nights} Nights</span>
            </div>
            <div>
              <span className="text-slate-500 block">Occupants</span>
              <span className="font-semibold text-slate-200">
                {reservation.adults} Adults {reservation.children ? `, ${reservation.children} Children` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing details */}
        <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-4 space-y-3.5">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            Total Charge Breakdown
          </h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Nights Room Charge</span>
              <span>Rs. {Number(reservation.base_amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>VAT (13%)</span>
              <span>Rs. {Number(reservation.tax_amount).toLocaleString()}</span>
            </div>
            {Number(reservation.discount_amount) > 0 && (
              <div className="flex justify-between text-rose-400">
                <span>Discount applied</span>
                <span>- Rs. {Number(reservation.discount_amount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-slate-900">
              <span>Total Amount</span>
              <span>Rs. {Number(reservation.total_amount).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Action button rows */}
        <div className="mt-auto space-y-2.5">
          {reservation.status === "pending" && (
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold gap-2 shadow-lg shadow-cyan-500/20"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? "Processing..." : "Confirm Booking"}
            </Button>
          )}

          {["pending", "confirmed"].includes(reservation.status) && (
            <Button
              onClick={handleCancel}
              disabled={isSubmitting}
              variant="ghost"
              className="w-full border border-slate-900 hover:bg-rose-500/5 text-rose-400 hover:text-rose-300 font-semibold gap-2"
            >
              <XCircle className="h-4 w-4" />
              Cancel Reservation
            </Button>
          )}

          <Link href={`/bookings/${reservation.id}`} className="block w-full">
            <Button
              variant="outline"
              className="w-full border-slate-800 text-slate-300 hover:text-white bg-slate-900/40 hover:bg-slate-900 font-semibold gap-2"
            >
              <FileText className="h-4 w-4 text-cyan-400" />
              Go to Booking Details
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
};
