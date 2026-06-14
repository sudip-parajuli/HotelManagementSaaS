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
    badgeClass: "bg-slate-500/15 text-slate-400 border-slate-500/20",
    icon: Hammer,
  },
  out_of_order: {
    label: "Out of Order",
    badgeClass: "bg-red-500/15 text-red-500 border-red-500/20",
    icon: AlertTriangle,
  },
};

export default function RoomDetailPage() {
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
        toast.error("Failed to fetch room details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoom();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 border-4 border-t-cyan-500 border-r-cyan-500 border-slate-900 rounded-full animate-spin" />
        <p className="text-slate-400 text-xs font-medium">Loading room workspace...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-6 text-center space-y-4 text-slate-400">
        <AlertTriangle className="h-12 w-12 mx-auto text-red-500" />
        <h3 className="font-bold text-white">Room not found</h3>
        <Link href="/rooms">
          <Button variant="outline" className="border-slate-800 text-slate-300">Back to grid</Button>
        </Link>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await roomsApi.updateRoom(room.id, { status, notes });
      toast.success("Room saved successfully!");
      setRoom((prev) => prev ? { ...prev, status, notes } : null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to save room details.");
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
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-slate-400 hover:text-white px-2">
            <ArrowLeft className="h-4 w-4" />
            Back to grid
          </Button>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-white tracking-tight">Room {room.room_number}</h1>
              <Badge variant="outline" className={`py-0.5 px-2.5 text-xs font-semibold rounded-lg ${statusConfig.badgeClass}`}>
                <StatusIcon className="h-3.5 w-3.5 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-slate-400 text-xs">
              {room.room_type?.name || "Standard Class"}
            </p>
          </div>

          <div className="text-xs text-slate-500 bg-slate-900/60 border border-slate-900 px-3 py-2 rounded-lg flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            Last cleaned: {room.last_cleaned_at ? new Date(room.last_cleaned_at).toLocaleDateString() : "Never"}
          </div>
        </div>
      </div>

      {/* Main Grid Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Specification Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-slate-900/40 border-slate-800 shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-900">
                <span className="text-slate-500">Floor Level</span>
                <span className="font-semibold text-slate-300">Floor {room.floor}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-900">
                <span className="text-slate-500">Class</span>
                <span className="font-semibold text-slate-300">{room.room_type?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-900">
                <span className="text-slate-500">Base Price</span>
                <span className="font-semibold text-slate-300">
                  Rs. {Number(room.room_type?.base_price_per_night || 0).toLocaleString()} / night
                </span>
              </div>
              {room.room_type?.weekend_price && (
                <div className="flex justify-between py-2 border-b border-slate-900">
                  <span className="text-slate-500">Weekend Price</span>
                  <span className="font-semibold text-slate-300">
                    Rs. {Number(room.room_type.weekend_price).toLocaleString()} / night
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Max Guests</span>
                <span className="font-semibold text-slate-300">{room.room_type?.max_occupancy || 2} guests</span>
              </div>
            </CardContent>
          </Card>

          {/* Active Bookings Summary Teaser */}
          <Card className="bg-slate-900/40 border-slate-800 shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Active Guest</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {room.status === "occupied" ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 p-2 bg-slate-950/40 border border-slate-900 rounded-lg text-slate-300">
                    <Bed className="h-4 w-4 text-cyan-400" />
                    <span>In-house Booking #2093</span>
                  </div>
                  <p className="text-slate-400">Guest: Ramesh Sharma (Group of 3)</p>
                  <p className="text-[11px] text-slate-500">Dates: June 12 — June 16 (4 nights)</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No guest currently residing in this room.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Operational Settings Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900/40 border-slate-800 shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Operational Status</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="room-status" className="text-xs font-bold text-slate-500 uppercase">Status</Label>
                  <select
                    id="room-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RoomStatus)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 p-2.5 outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="dirty">Dirty</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="out_of_order">Out of Order</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="room-notes" className="text-xs font-bold text-slate-500 uppercase">Operational Notes / Issue logs</Label>
                  <Input
                    id="room-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Broken kettle, cleaning schedule update"
                    className="bg-slate-950 border-slate-800 text-slate-100 p-3 h-20 placeholder:text-slate-700"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Status"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Dummy Logs */}
          <Card className="bg-slate-900/40 border-slate-800 shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Operational Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between items-start border-b border-slate-900 pb-2">
                <div>
                  <p className="font-semibold text-slate-300">Room Status changed to Dirty</p>
                  <p className="text-[10px] text-slate-500">Guest Checkout</p>
                </div>
                <span className="text-[10px] text-slate-500">Today, 10:12 AM</span>
              </div>
              <div className="flex justify-between items-start border-b border-slate-900 pb-2">
                <div>
                  <p className="font-semibold text-slate-300">Room Status changed to Occupied</p>
                  <p className="text-[10px] text-slate-500">Guest Checkin — Ramesh Sharma</p>
                </div>
                <span className="text-[10px] text-slate-500">June 12, 14:35 PM</span>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-slate-300">Room Cleaned & Disinfected</p>
                  <p className="text-[10px] text-slate-500">Housekeeper: Hari Bahadur</p>
                </div>
                <span className="text-[10px] text-slate-500">June 12, 11:20 AM</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
