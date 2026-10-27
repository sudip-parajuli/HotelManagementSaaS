"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Clock, Bed, Settings, Sparkles, ShieldAlert, AlertTriangle, Hammer, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { roomsApi } from "@/lib/api/rooms";
import type { Room, RoomStatus } from "@/lib/types";
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

const statusConfigs = {
  available: {
    label: "Available",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    icon: Sparkles,
  },
  occupied: {
    label: "Occupied",
    badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/20",
    icon: Bed,
  },
  dirty: {
    label: "Dirty",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    icon: Sparkles,
  },
  maintenance: {
    label: "Maintenance",
    badgeClass: "bg-workspace-500/15 text-workspace-400 border-workspace-500/20",
    icon: Hammer,
  },
  out_of_order: {
    label: "Out of Order",
    badgeClass: "bg-red-500/15 text-red-500 border-red-500/20",
    icon: AlertTriangle,
  },
};

export default function RoomDetailPage() {
  const t = useTranslations("Rooms");
  const tCommon = useTranslations("Common");
  const tFrontDesk = useTranslations("FrontDesk");
  const tData = useTransData();
  const locale = useLocale();

  const router = useRouter();
  const params = useParams();
  const idStr = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const id = Number(idStr);

  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<RoomStatus>("available");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchRoom = async () => {
      setIsLoading(true);
      try {
        const res = await roomsApi.getRoom(id);
        setRoom(res.data);
        setStatus(res.data.status);
        setNotes(res.data.notes || "");
      } catch (err) {
        console.error(err);
        toast.error(locale === "ne" ? "कोठा विवरण लोड गर्न असफल भयो।" : "Failed to fetch room details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoom();
  }, [id, locale]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-workspace-950 text-foreground flex flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 border-4 border-t-cyan-500 border-r-cyan-500 border-workspace-900 rounded-full animate-spin" />
        <p className="text-workspace-400 text-xs font-medium">{locale === "ne" ? "कार्यक्षेत्र लोड हुँदैछ..." : "Loading room workspace..."}</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-6 text-center space-y-4 text-workspace-400">
        <AlertTriangle className="h-12 w-12 mx-auto text-red-500" />
        <h3 className="font-bold text-foreground">{t("room_not_found") || "Room not found"}</h3>
        <Link href="/rooms">
          <Button variant="outline" className="border-workspace-800 text-workspace-300">
            {t("back_to_grid") || "Back to grid"}
          </Button>
        </Link>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await roomsApi.updateRoom(room.id, { status, notes });
      toast.success(locale === "ne" ? "विवरण सफलतापूर्वक बचत गरियो!" : "Room saved successfully!");
      setRoom((prev) => prev ? { ...prev, status, notes } : null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || (locale === "ne" ? "बचत गर्न असफल भयो।" : "Failed to save room details."));
    } finally {
      setIsSaving(false);
    }
  };

  const statusConfig = statusConfigs[room.status] || statusConfigs.available;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Link href="/rooms">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-workspace-400 hover:text-white px-2">
            <ArrowLeft className="h-4 w-4" />
            {t("back_to_grid") || "Back to grid"}
          </Button>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-workspace-900 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-foreground tracking-tight">
                {tFrontDesk("room")} {room.room_number}
              </h1>
              <Badge variant="outline" className={`py-0.5 px-2.5 text-xs font-semibold rounded-lg ${statusConfig.badgeClass}`}>
                <StatusIcon className="h-3.5 w-3.5 mr-1" />
                {tData(room.status)}
              </Badge>
            </div>
            <p className="text-workspace-400 text-xs">
              {tData(room.room_type?.name || "Standard Class")}
            </p>
          </div>

          <div className="text-xs text-workspace-500 bg-workspace-900/60 border border-workspace-900 px-3 py-2 rounded-lg flex items-center gap-2">
            <Clock className="h-4 w-4 text-workspace-400" />
            {t("last_cleaned", {
              date: room.last_cleaned_at
                ? new Date(room.last_cleaned_at).toLocaleDateString(locale === "ne" ? "ne-NP" : "en-US")
                : t("never_cleaned")
            })}
          </div>
        </div>
      </div>

      {/* Main Grid Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Specification Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-workspace-900/40 border-workspace-800 shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">{t("specifications")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex justify-between py-2 border-b border-workspace-900">
                <span className="text-workspace-500">{t("floor_level")}</span>
                <span className="font-semibold text-workspace-300">{t("spec_floor", { n: room.floor })}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-workspace-900">
                <span className="text-workspace-500">{tFrontDesk("class")}</span>
                <span className="font-semibold text-workspace-300">{tData(room.room_type?.name)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-workspace-900">
                <span className="text-workspace-500">{t("base_price")}</span>
                <span className="font-semibold text-workspace-300">
                  Rs. {Number(room.room_type?.base_price_per_night || 0).toLocaleString()} / {locale === "ne" ? "रात" : "night"}
                </span>
              </div>
              {room.room_type?.weekend_price && (
                <div className="flex justify-between py-2 border-b border-workspace-900">
                  <span className="text-workspace-500">{t("weekend_rate")}</span>
                  <span className="font-semibold text-workspace-300">
                    Rs. {Number(room.room_type.weekend_price).toLocaleString()} / {locale === "ne" ? "रात" : "night"}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-workspace-500">{locale === "ne" ? "अधिकतम क्षमता" : "Max Guests"}</span>
                <span className="font-semibold text-workspace-300">{t("max_guests", { count: room.room_type?.max_occupancy || 2 })}</span>
              </div>
            </CardContent>
          </Card>

          {/* Active Bookings Summary Teaser */}
          <Card className="bg-workspace-900/40 border-workspace-800 shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">{t("active_guest")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {room.status === "occupied" ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 p-2 bg-workspace-950/40 border border-workspace-900 rounded-lg text-workspace-300">
                    <Bed className="h-4 w-4 text-brand-400" />
                    <span>{locale === "ne" ? "होटल भित्र सक्रिय बुकिङ #२०९३" : "In-house Booking #2093"}</span>
                  </div>
                  <p className="text-workspace-400">{locale === "ne" ? "पाहुना: रमेश शर्मा (३ जनाको समूह)" : "Guest: Ramesh Sharma (Group of 3)"}</p>
                  <p className="text-[11px] text-workspace-500">{locale === "ne" ? "मिति: जुन १२ — जुन १६ (४ रात)" : "Dates: June 12 — June 16 (4 nights)"}</p>
                </div>
              ) : (
                <p className="text-xs text-workspace-500 italic">{t("no_active_guest")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Operational Settings Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-workspace-900/40 border-workspace-800 shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">{t("operational_status")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="room-status" className="text-xs font-bold text-workspace-500 uppercase">{tFrontDesk("status")}</Label>
                  <select
                    id="room-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RoomStatus)}
                    className="w-full rounded-lg bg-workspace-950 border border-workspace-800 text-sm text-workspace-100 p-2.5 outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="available">{tData("available")}</option>
                    <option value="occupied">{tData("occupied")}</option>
                    <option value="dirty">{tData("dirty")}</option>
                    <option value="maintenance">{tData("maintenance")}</option>
                    <option value="out_of_order">{tData("out_of_order")}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="room-notes" className="text-xs font-bold text-workspace-500 uppercase">{locale === "ne" ? "सञ्चालन टिपोटहरू / समस्या दर्ता" : "Operational Notes / Issue logs"}</Label>
                  <Input
                    id="room-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("notes_placeholder")}
                    className="bg-workspace-950 border-workspace-800 text-workspace-100 p-3 h-20 placeholder:text-workspace-700"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-gradient-to-tr from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold gap-2 shadow-lg shadow-brand-500/20"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? tCommon("saving") : t("save_room_type")}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Dummy Logs */}
          <Card className="bg-workspace-900/40 border-workspace-800 shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">{t("operational_logs")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between items-start border-b border-workspace-900 pb-2">
                <div>
                  <p className="font-semibold text-workspace-300">{locale === "ne" ? "कोठाको स्थिति फोहोर (Dirty) मा परिवर्तन गरियो" : "Room Status changed to Dirty"}</p>
                  <p className="text-[10px] text-workspace-500">{locale === "ne" ? "पाहुना चेक-आउट" : "Guest Checkout"}</p>
                </div>
                <span className="text-[10px] text-workspace-500">{locale === "ne" ? "आज, १०:१२ बजे" : "Today, 10:12 AM"}</span>
              </div>
              <div className="flex justify-between items-start border-b border-workspace-900 pb-2">
                <div>
                  <p className="font-semibold text-workspace-300">{locale === "ne" ? "कोठाको स्थिति भरिएको (Occupied) मा परिवर्तन गरियो" : "Room Status changed to Occupied"}</p>
                  <p className="text-[10px] text-workspace-500">{locale === "ne" ? "पाहुना चेक-इन — रमेश शर्मा" : "Guest Checkin — Ramesh Sharma"}</p>
                </div>
                <span className="text-[10px] text-workspace-500">{locale === "ne" ? "जुन १२, १४:३५ बजे" : "June 12, 14:35 PM"}</span>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-workspace-300">{locale === "ne" ? "कोठा सफा र कीटाणुरहित गरियो" : "Room Cleaned & Disinfected"}</p>
                  <p className="text-[10px] text-workspace-500">{locale === "ne" ? "हाउसकिपर: हरि बहादुर" : "Housekeeper: Hari Bahadur"}</p>
                </div>
                <span className="text-[10px] text-workspace-500">{locale === "ne" ? "जुन १२, ११:२० बजे" : "June 12, 11:20 AM"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
