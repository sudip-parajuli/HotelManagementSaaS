"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, User, Bed, DollarSign, Clock, CheckCircle2, XCircle, Trash2, CreditCard, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { bookingsApi } from "@/lib/api/bookings";
import type { Reservation } from "@/lib/types";
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

export default function BookingDetailPage() {
  const t = useTranslations("Bookings");
  const tCommon = useTranslations("Common");
  const tFrontDesk = useTranslations("FrontDesk");
  const tData = useTransData();
  const locale = useLocale();

  const router = useRouter();
  const params = useParams();
  const idStr = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const id = Number(idStr);

  const [booking, setBooking] = useState<Reservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBooking = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await bookingsApi.getReservation(id);
      setBooking(res.data);
    } catch (err) {
      console.error(err);
      toast.error(locale === "ne" ? "बुकिङ विवरण लोड गर्न असफल भयो।" : "Failed to load reservation details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const handleConfirm = async () => {
    if (!booking) return;
    setIsSubmitting(true);
    try {
      await bookingsApi.confirmReservation(booking.id);
      toast.success(locale === "ne" ? "बसाई बुकिङ सफलतापूर्वक पुष्टि भयो!" : "Stay reservation confirmed successfully!");
      fetchBooking();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || (locale === "ne" ? "बुकिङ पुष्टि गर्न असफल भयो।" : "Failed to confirm reservation."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    const promptText = locale === "ne" ? "रद्द गर्नुको कारण लेख्नुहोस्:" : "Write reason for cancellation:";
    const reason = prompt(promptText);
    if (reason === null) return;
    
    setIsSubmitting(true);
    try {
      await bookingsApi.cancelReservation(booking.id, reason);
      toast.success(locale === "ne" ? "बसाई बुकिङ रद्द गरियो।" : "Stay reservation cancelled.");
      fetchBooking();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || (locale === "ne" ? "बुकिङ रद्द गर्न असफल भयो।" : "Failed to cancel reservation."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
        <p className="text-slate-400 text-xs font-medium">{locale === "ne" ? "बसाई प्रोफाइल लोड हुँदैछ..." : "Loading stay profile..."}</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-6 text-center space-y-4 text-slate-400">
        <XCircle className="h-12 w-12 mx-auto text-rose-500" />
        <h3 className="font-bold text-white">{t("no_bookings")}</h3>
        <Link href="/bookings/calendar">
          <Button variant="outline" className="border-slate-800 text-slate-300">
            {locale === "ne" ? "पात्रोमा फर्कनुहोस्" : "Back to calendar"}
          </Button>
        </Link>
      </div>
    );
  }

  const badgeClassMap = {
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    confirmed: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    checked_in: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    checked_out: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    cancelled: "bg-rose-500/15 text-rose-400 border-rose-500/20",
    no_show: "bg-slate-500/15 text-slate-400 border-slate-500/20",
  };
  const badgeClass = badgeClassMap[booking.status] || badgeClassMap.pending;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Navigation */}
      <div className="flex items-center gap-3 text-slate-400">
        <Link href="/bookings/calendar">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-slate-400 hover:text-white px-2">
            <ArrowLeft className="h-4 w-4" />
            {locale === "ne" ? "पात्रोमा फर्कनुहोस्" : "Back to calendar"}
          </Button>
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white tracking-tight">
              {locale === "ne" ? `बुकिङ सन्दर्भ #${booking.id}` : `Booking Ref #${booking.id}`}
            </h1>
            <Badge variant="outline" className={`py-0.5 px-2.5 text-xs font-semibold rounded-lg ${badgeClass}`}>
              {tData(booking.status)}
            </Badge>
          </div>
          <p className="text-slate-500 text-xs">
            {locale === "ne" ? "सिर्जना गरिएको मिति: " : "Created on "}
            {new Date(booking.created_at || "").toLocaleString(locale === "ne" ? "ne-NP" : "en-US")}
          </p>
        </div>

        <div className="flex gap-2">
          {booking.status === "pending" && (
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold gap-2 shadow-lg shadow-cyan-500/20"
            >
              <CheckCircle2 className="h-4 w-4" />
              {locale === "ne" ? "बसाई पुष्टि गर्नुहोस्" : "Confirm Stay"}
            </Button>
          )}

          {["pending", "confirmed"].includes(booking.status) && (
            <Button
              onClick={handleCancel}
              disabled={isSubmitting}
              variant="outline"
              className="border-slate-800 text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 font-semibold gap-2"
            >
              <XCircle className="h-4 w-4" />
              {t("cancel_booking")}
            </Button>
          )}
        </div>
      </div>

      {/* Detail Grid panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Guest Profiles Column */}
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-slate-900/40 border-slate-800 shadow-md">
            <CardHeader className="pb-3 border-b border-slate-900">
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4 text-cyan-400" />
                {t("guest_details")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5 text-xs text-slate-300">
              <div>
                <span className="text-slate-500 block">{t("guest")}</span>
                <span className="font-semibold text-slate-200">{booking.guest?.first_name} {booking.guest?.last_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">{t("phone")}</span>
                <span className="font-semibold text-slate-200">{booking.guest?.phone}</span>
              </div>
              {booking.guest?.email && (
                <div>
                  <span className="text-slate-500 block">{t("email")}</span>
                  <span className="font-semibold text-slate-200">{booking.guest.email}</span>
                </div>
              )}
              <div>
                <span className="text-slate-500 block">{t("nationality")}</span>
                <span className="font-semibold text-slate-200">{tData(booking.guest?.nationality || "Nepalese")}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right specification summaries Column */}
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-slate-900/40 border-slate-800 shadow-md">
            <CardHeader className="pb-3 border-b border-slate-900">
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="h-4 w-4 text-cyan-400" />
                {t("booking_details")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">{t("check_in_date")}</span>
                <span className="font-semibold text-slate-200">{booking.check_in_date}</span>
              </div>
              <div>
                <span className="text-slate-500 block">{t("check_out_date")}</span>
                <span className="font-semibold text-slate-200">{booking.check_out_date}</span>
              </div>
              <div>
                <span className="text-slate-500 block">{t("assigned_room")}</span>
                <span className="font-semibold text-slate-200">{tFrontDesk("room")} {booking.room?.room_number}</span>
              </div>
              <div>
                <span className="text-slate-500 block">{t("nights_count").split(" ")[0]}</span>
                <span className="font-semibold text-slate-200">{t("nights_count", { count: booking.total_nights })}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-slate-800 shadow-md">
            <CardHeader className="pb-3 border-b border-slate-900">
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-cyan-400" />
                {t("financial_ledger")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>{locale === "ne" ? `कोठा शुल्क (${booking.total_nights} रात)` : `Room Charges (${booking.total_nights} Nights)`}</span>
                <span>Rs. {Number(booking.base_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{locale === "ne" ? "भ्याट (१३%)" : "VAT (13%)"}</span>
                <span>Rs. {Number(booking.tax_amount).toLocaleString()}</span>
              </div>
              {Number(booking.discount_amount) > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>{tData("discount")}</span>
                  <span>- Rs. {Number(booking.discount_amount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-slate-900">
                <span>{t("grand_total")}</span>
                <span>Rs. {Number(booking.total_amount).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
