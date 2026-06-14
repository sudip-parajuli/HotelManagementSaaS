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

// Standard selects might not be directly styleable in shadcn v4 depending on implementation.
// We will build a clean, custom HTML select element styled with Tailwind to work perfectly.
interface RoomDetailSheetProps {
  room: Room | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const statusOptions: { value: RoomStatus; label: string; icon: any; color: string }[] = [
  { value: "available", label: "Available", icon: Sparkles, color: "text-emerald-400" },
  { value: "occupied", label: "Occupied", icon: Bed, color: "text-rose-400" },
  { value: "dirty", label: "Dirty", icon: Sparkles, color: "text-amber-400" },
  { value: "maintenance", label: "Maintenance", icon: Hammer, color: "text-slate-400" },
  { value: "out_of_order", label: "Out of Order", icon: AlertTriangle, color: "text-red-400" },
];

export const RoomDetailSheet: React.FC<RoomDetailSheetProps> = ({
  room,
  open,
  onOpenChange,
  onSuccess,
}) => {
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
      toast.success(`Room ${room.room_number} updated successfully!`);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to update room details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md bg-slate-950 border-l border-slate-900 text-slate-100 p-6 flex flex-col gap-6 overflow-y-auto">
        <SheetHeader className="p-0 border-b border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
              Floor {room.floor}
            </span>
            <Link href={`/rooms/${room.id}`}>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-slate-400 hover:text-white">
                <Eye className="h-3.5 w-3.5" />
                Full Page
              </Button>
            </Link>
          </div>
          <SheetTitle className="text-2xl font-black text-white mt-2">
            Room {room.room_number}
          </SheetTitle>
          <SheetDescription className="text-slate-400 text-xs">
            {room.room_type?.name || "Standard Room Type"}
          </SheetDescription>
        </SheetHeader>

        {/* Room type brief information */}
        <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Room Type Details
          </h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Base Price</span>
              <span className="font-semibold text-slate-200">
                Rs. {Number(room.room_type?.base_price_per_night || 0).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Max Occupancy</span>
              <span className="font-semibold text-slate-200">
                {room.room_type?.max_occupancy || 2} guests
              </span>
            </div>
            {room.room_type?.weekend_price && (
              <div>
                <span className="text-slate-500 block">Weekend Price</span>
                <span className="font-semibold text-slate-200">
                  Rs. {Number(room.room_type.weekend_price).toLocaleString()}
                </span>
              </div>
            )}
            <div>
              <span className="text-slate-500 block">Extra Person Charge</span>
              <span className="font-semibold text-slate-200">
                Rs. {Number(room.room_type?.extra_person_charge || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5">
          <div className="space-y-2">
            <Label htmlFor="room-status" className="text-xs font-bold text-slate-400 uppercase">
              Current Status
            </Label>
            <div className="relative">
              <select
                id="room-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as RoomStatus)}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-100 p-2.5 outline-none focus:border-cyan-500 transition-colors appearance-none cursor-pointer"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-950 text-slate-100">
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room-notes" className="text-xs font-bold text-slate-400 uppercase">
              Operational Notes / Issues
            </Label>
            <Input
              id="room-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Needs bulb replacement, guest requests extra pillows"
              className="bg-slate-900 border-slate-800 focus:border-cyan-500 text-slate-100 p-3 h-20 placeholder:text-slate-600 rounded-lg resize-none"
            />
          </div>

          <SheetFooter className="mt-auto border-t border-slate-900 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? "Saving Updates..." : "Save Room Details"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};
