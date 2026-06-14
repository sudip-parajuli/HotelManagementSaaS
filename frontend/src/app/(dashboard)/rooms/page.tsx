"use client";

import React, { useEffect, useState } from "react";
import { Bed, Sparkles, Hammer, ShieldAlert, Plus, SlidersHorizontal, Settings, Eye } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { roomsApi } from "@/lib/api/rooms";
import { RoomStatusGrid } from "@/components/modules/rooms/RoomStatusGrid";
import { RoomDetailSheet } from "@/components/modules/rooms/RoomDetailSheet";
import type { Room, RoomType, RoomStatus } from "@/lib/types";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState("");
  const [floor, setFloor] = useState<string>("all");
  const [roomType, setRoomType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  // Sheet control
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    occupied: 0,
    dirty: 0,
    maintenance: 0,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [roomsRes, typesRes] = await Promise.all([
        roomsApi.listRooms(),
        roomsApi.listRoomTypes(),
      ]);
      const loadedRooms = roomsRes.data.results || [];
      setRooms(loadedRooms);
      setRoomTypes(typesRes.data.results || []);

      // Calculate statistics
      const total = loadedRooms.length;
      const available = loadedRooms.filter((r) => r.status === "available").length;
      const occupied = loadedRooms.filter((r) => r.status === "occupied").length;
      const dirty = loadedRooms.filter((r) => r.status === "dirty").length;
      const maintenance = loadedRooms.filter(
        (r) => r.status === "maintenance" || r.status === "out_of_order"
      ).length;

      setStats({ total, available, occupied, dirty, maintenance });
    } catch (err) {
      console.error("Failed to load rooms details", err);
      toast.error("Failed to fetch rooms metadata.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
    setIsSheetOpen(true);
  };

  // Filter logic
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.room_number.toLowerCase().includes(search.toLowerCase());
    const matchesFloor = floor === "all" || String(room.floor) === floor;
    const matchesType = roomType === "all" || String(room.room_type?.id) === roomType;
    const matchesStatus = status === "all" || room.status === status;

    return matchesSearch && matchesFloor && matchesType && matchesStatus;
  });

  // Extract all unique floors from loaded rooms
  const uniqueFloors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">Room Operations</h1>
          <p className="text-slate-400 text-sm">
            Monitor and manage physical room occupancy, cleaning states, and service status.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/rooms/types">
            <Button variant="outline" className="border-slate-800 text-slate-300 hover:text-white bg-slate-900/40 hover:bg-slate-900 gap-2 font-medium">
              <Settings className="h-4 w-4 text-cyan-400" />
              Room Classes
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-900/40 border-slate-800 shadow-md">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Rooms</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-extrabold text-white">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/40 border-slate-800 shadow-md">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Available</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-extrabold text-emerald-400">{stats.available}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/40 border-slate-800 shadow-md">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Occupied</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-extrabold text-rose-400">{stats.occupied}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/40 border-slate-800 shadow-md">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Dirty</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-extrabold text-amber-400">{stats.dirty}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/40 border-slate-800 shadow-md col-span-2 md:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Maintenance</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-extrabold text-slate-300">{stats.maintenance}</div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive filter control bar */}
      <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Room Number Input */}
          <div className="relative">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room..."
              className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 rounded-lg text-sm pl-3 h-10 w-full"
            />
          </div>

          {/* Floor selection */}
          <select
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-sm p-2 h-10 outline-none cursor-pointer focus:border-cyan-500"
          >
            <option value="all">All Floors</option>
            {uniqueFloors.map((f) => (
              <option key={f} value={String(f)}>
                Floor {f}
              </option>
            ))}
          </select>

          {/* Room Type selection */}
          <select
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-sm p-2 h-10 outline-none cursor-pointer focus:border-cyan-500"
          >
            <option value="all">All Room Types</option>
            {roomTypes.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Status selection */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-sm p-2 h-10 outline-none cursor-pointer focus:border-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="dirty">Dirty</option>
            <option value="maintenance">Maintenance</option>
            <option value="out_of_order">Out of Order</option>
          </select>
        </div>
      </div>

      {/* Room Grid Display */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="h-10 w-10 border-4 border-t-cyan-500 border-r-cyan-500 border-slate-800 rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Synchronizing room states...</p>
        </div>
      ) : (
        <RoomStatusGrid rooms={filteredRooms} onRoomClick={handleRoomClick} />
      )}

      {/* Slide Drawer detail panel */}
      <RoomDetailSheet
        room={selectedRoom}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onSuccess={fetchData}
      />
    </div>
  );
}
