"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Bed, User, ShieldAlert, Sparkles, AlertTriangle, Hammer, Save, Eye } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { roomsApi } from "@/lib/api/rooms";
import type { Room, RoomStatus } from "@/lib/types";
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

interface RoomDetailSheetProps {
  room: Room | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const statusOptions: { value: RoomStatus; icon: any; color: string }[] = [
  { value: "available", icon: Sparkles, color: "text-emerald-400" },
  { value: "occupied", icon: Bed, color: "text-rose-400" },
  { value: "dirty", icon: Sparkles, color: "text-amber-400" },
  { value: "maintenance", icon: Hammer, color: "text-workspace-400" },
  { value: "out_of_order", icon: AlertTriangle, color: "text-red-400" },
];

export const RoomDetailSheet: React.FC<RoomDetailSheetProps> = ({
  room,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const t = useTranslations("Rooms");
  const tCommon = useTranslations("Common");
  const tFrontDesk = useTranslations("FrontDesk");
  const tData = useTransData();
  const locale = useLocale();

  const [status, setStatus] = useState<RoomStatus>("available");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (room) {
      setStatus(room.status);
      setNotes(room.notes || "");
    }
  }, [room, open]);

  if (!room) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await roomsApi.updateRoom(room.id, {
        status,
        notes,
      });
      toast.success(locale === "ne" ? `कोठा ${room.room_number} सफलतापूर्वक अद्यावधिक भयो!` : `Room ${room.room_number} updated successfully!`);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || (locale === "ne" ? "कोठा अद्यावधिक गर्न असफल भयो।" : "Failed to update room details."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md bg-workspace-950 border-l border-workspace-900 text-workspace-100 p-6 flex flex-col gap-6 overflow-y-auto">
        <SheetHeader className="p-0 border-b border-workspace-900 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded">
              {t("spec_floor", { n: room.floor })}
            </span>
            <Link href={`/rooms/${room.id}`}>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-workspace-400 hover:text-white">
                <Eye className="h-3.5 w-3.5" />
                {locale === "ne" ? "पूर्ण पृष्ठ" : "Full Page"}
              </Button>
            </Link>
          </div>
          <SheetTitle className="text-2xl font-black text-foreground mt-2">
            {tFrontDesk("room")} {room.room_number}
          </SheetTitle>
          <SheetDescription className="text-workspace-400 text-xs">
            {tData(room.room_type?.name || "Standard Room Type")}
          </SheetDescription>
        </SheetHeader>

        {/* Room type brief information */}
        <div className="rounded-xl border border-workspace-900 bg-workspace-900/20 p-4 space-y-3">
          <h4 className="text-xs font-bold text-workspace-400 uppercase tracking-wider">
            {locale === "ne" ? "कोठा प्रकार विवरण" : "Room Type Details"}
          </h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-workspace-500 block">{t("base_price")}</span>
              <span className="font-semibold text-workspace-200">
                Rs. {Number(room.room_type?.base_price_per_night || 0).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-workspace-500 block">{t("max_occupancy")}</span>
              <span className="font-semibold text-workspace-200">
                {t("max_guests", { count: room.room_type?.max_occupancy || 2 })}
              </span>
            </div>
            {room.room_type?.weekend_price && (
              <div>
                <span className="text-workspace-500 block">{t("weekend_rate")}</span>
                <span className="font-semibold text-workspace-200">
                  Rs. {Number(room.room_type.weekend_price).toLocaleString()}
                </span>
              </div>
            )}
            <div>
              <span className="text-workspace-500 block">{t("extra_person_charge")}</span>
              <span className="font-semibold text-workspace-200">
                Rs. {Number(room.room_type?.extra_person_charge || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5">
          <div className="space-y-2">
            <Label htmlFor="room-status" className="text-xs font-bold text-workspace-400 uppercase">
              {t("current_status") || (locale === "ne" ? "हालको स्थिति" : "Current Status")}
            </Label>
            <div className="relative">
              <select
                id="room-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as RoomStatus)}
                className="w-full rounded-lg bg-workspace-900 border border-workspace-800 text-sm text-workspace-100 p-2.5 outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-workspace-950 text-workspace-100">
                    {tData(opt.value)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-workspace-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room-notes" className="text-xs font-bold text-workspace-400 uppercase">
              {locale === "ne" ? "सञ्चालन टिपोटहरू / समस्याहरू" : "Operational Notes / Issues"}
            </Label>
            <Input
              id="room-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notes_placeholder")}
              className="bg-workspace-900 border-workspace-800 focus:border-brand-500 text-workspace-100 p-3 h-20 placeholder:text-workspace-600 rounded-lg resize-none"
            />
          </div>

          <SheetFooter className="mt-auto border-t border-workspace-900 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-tr from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold gap-2 shadow-lg shadow-brand-500/20"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? tCommon("saving") : t("save_room_type")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};
