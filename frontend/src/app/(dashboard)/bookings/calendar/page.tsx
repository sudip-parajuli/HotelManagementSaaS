"use client";

import React, { useEffect, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Users, UserCheck, CalendarDays, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { roomsApi } from "@/lib/api/rooms";
import { bookingsApi } from "@/lib/api/bookings";
import { BookingCalendar } from "@/components/modules/bookings/BookingCalendar";
import { BookingDetailSheet } from "@/components/modules/bookings/BookingDetailSheet";
import { NewBookingDialog } from "@/components/modules/bookings/NewBookingDialog";
import type { Room, RoomType, Reservation } from "@/lib/types";

export default function BookingCalendarPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  
  // Today Stats Summaries
  const [stats, setStats] = useState({
    arrivals: 0,
    departures: 0,
    inHouse: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date>(new Date());

  // Filters
  const [floor, setFloor] = useState("all");
  const [roomType, setRoomType] = useState("all");

  // Interaction Sheets/Modals
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedCellDate, setSelectedCellDate] = useState("");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);

  const loadCalendarData = async () => {
    setIsLoading(true);
    try {
      const [roomsRes, typesRes, resRes, statsRes] = await Promise.all([
        roomsApi.listRooms(),
        roomsApi.listRoomTypes(),
        bookingsApi.listReservations(),
        bookingsApi.todayStats(),
      ]);

      setRooms(roomsRes.data.results || []);
      setRoomTypes(typesRes.data.results || []);
      setReservations(resRes.data.results || []);
      
      setStats({
        arrivals: statsRes.data.arrivals_count || 0,
        departures: statsRes.data.departures_count || 0,
        inHouse: statsRes.data.in_house_count || 0,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load booking timeline database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, []);

  const handleCellClick = (room: Room, dateStr: string) => {
    setSelectedRoom(room);
    setSelectedCellDate(dateStr);
    setIsNewDialogOpen(true);
  };

  const handleBookingClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsDetailSheetOpen(true);
  };

  const handlePrevRange = () => setStartDate((prev) => subDays(prev, 14));
  const handleNextRange = () => setStartDate((prev) => addDays(prev, 14));
  const handleToday = () => setStartDate(new Date());

  // Filter Rooms
  const filteredRooms = rooms.filter((room) => {
    const matchesFloor = floor === "all" || String(room.floor) === floor;
    const matchesType = roomType === "all" || String(room.room_type?.id) === roomType;
    return matchesFloor && matchesType;
  });

  const uniqueFloors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);

  return (
    <div className="p-6 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">Stay Timeline</h1>
          <p className="text-slate-400 text-sm">
            Overview of room occupancy calendar, check-in intervals, and visual reservations mapping.
          </p>
        </div>

        <Link href="/bookings/new">
          <Button className="bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold gap-2 shadow-lg shadow-cyan-500/20">
            <Plus className="h-4 w-4" />
            Book Stay
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900/40 border-slate-800 shadow-md">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              Arrivals Today
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-white">{stats.arrivals} Guests</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/40 border-slate-800 shadow-md">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Departures Today
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-white">{stats.departures} Rooms</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/40 border-slate-800 shadow-md">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="h-4 w-4" />
              Active In-House
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-white">{stats.inHouse} Guests</div>
          </CardContent>
        </Card>
      </div>

      {/* Date Switcher & Filter Controls Row */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between rounded-xl border border-slate-900 bg-slate-900/30 p-4">
        {/* Date navigators */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrevRange}
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-900"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Button
            onClick={handleToday}
            variant="ghost"
            className="h-10 text-slate-300 hover:text-white font-medium border border-slate-800 hover:bg-slate-900 px-4"
          >
            Today
          </Button>

          <Button
            onClick={handleNextRange}
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-900"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          <span className="text-xs text-slate-400 font-bold ml-2">
            {format(startDate, "MMMM d, yyyy")} — {format(addDays(startDate, 13), "MMMM d, yyyy")}
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Floor selection */}
          <select
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-sm p-2 h-10 outline-none cursor-pointer focus:border-cyan-500 flex-1 lg:flex-none"
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
            className="rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-sm p-2 h-10 outline-none cursor-pointer focus:border-cyan-500 flex-1 lg:flex-none"
          >
            <option value="all">All Room Types</option>
            {roomTypes.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar Grid Canvas */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="text-sm text-slate-400 font-medium">Synchronizing stay calendar...</p>
        </div>
      ) : (
        <BookingCalendar
          rooms={filteredRooms}
          reservations={reservations}
          startDate={startDate}
          onCellClick={handleCellClick}
          onBookingClick={handleBookingClick}
        />
      )}

      {/* Dialog Modals */}
      <NewBookingDialog
        room={selectedRoom}
        checkInDate={selectedCellDate}
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
      />

      <BookingDetailSheet
        reservation={selectedReservation}
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        onSuccess={loadCalendarData}
      />
    </div>
  );
}
