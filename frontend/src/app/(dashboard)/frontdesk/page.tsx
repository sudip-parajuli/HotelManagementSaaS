"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Search, UserPlus, RefreshCw, LogIn, LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import { frontdeskApi } from "@/lib/api/frontdesk";
import { OccupancyBar } from "@/components/modules/frontdesk/OccupancyBar";
import { GuestCard } from "@/components/modules/frontdesk/GuestCard";
import { CheckInModal } from "@/components/modules/frontdesk/CheckInModal";
import { CheckOutModal } from "@/components/modules/frontdesk/CheckOutModal";
import { WalkInForm } from "@/components/modules/frontdesk/WalkInForm";
import type { Reservation } from "@/lib/types";

export default function FrontDeskPage() {
  const [data, setData] = useState<{
    arrivals: Reservation[];
    departures: Reservation[];
    in_house: Reservation[];
    occupancy_rate: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals status
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await frontdeskApi.getTodayStats();
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load operations statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckInConfirm = async (payload: {
    reservation_id: number;
    key_issued: string;
    locker_number?: string;
    notes?: string;
    id_document_image?: string;
  }) => {
    try {
      await frontdeskApi.checkIn(payload);
      toast.success("Guest checked in successfully!");
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to execute check-in.");
      throw err;
    }
  };

  const handleCheckOutConfirm = async (payload: {
    reservation_id: number;
    additional_charges: Array<{ description: string; amount: number }>;
    payment_method: string;
    feedback_rating?: number;
    feedback_comment?: string;
  }) => {
    try {
      const res = await frontdeskApi.checkOut(payload);
      toast.success(`Check-out completed! Invoice settled for Rs. ${res.data.total_amount}`);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to execute check-out.");
      throw err;
    }
  };

  const handleWalkInConfirm = async (payload: any) => {
    try {
      await frontdeskApi.walkIn(payload);
      toast.success("Walk-in checked in successfully!");
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to register walk-in.");
      throw err;
    }
  };

  // Filter reservations based on search text (guest name, phone, room number)
  const filterList = (list: Reservation[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (r) =>
        r.guest.first_name.toLowerCase().includes(q) ||
        r.guest.last_name.toLowerCase().includes(q) ||
        r.guest.phone.includes(q) ||
        r.room.room_number.includes(q)
    );
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Loading operations dashboard...</p>
      </div>
    );
  }

  const arrivalsFiltered = filterList(data?.arrivals || []);
  const departuresFiltered = filterList(data?.departures || []);
  const inHouseFiltered = filterList(data?.in_house || []);

  const totalRoomsCount = 20; // Stub, can be loaded from properties but works as visualization baseline
  const occupiedRoomsCount = data?.in_house.length || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Today Front Desk operations</h1>
          <p className="text-slate-400 text-sm">Monitor arrivals, active stays, and departures ledger.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={loadData}
            variant="ghost"
            className="border border-slate-800 text-slate-400 hover:text-white rounded-lg h-10 w-10 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setWalkInOpen(true)}
            className="bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-lg h-10 px-4 gap-2 shadow-lg shadow-cyan-500/20"
          >
            <UserPlus className="h-4 w-4" />
            Quick Walk-In Check In
          </Button>
        </div>
      </div>

      {/* Top dashboard widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-medium">
        <OccupancyBar
          rate={data?.occupancy_rate || 0}
          totalRooms={totalRoomsCount}
          occupiedRooms={occupiedRoomsCount}
        />
        
        {/* Arrivals stat widget */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Expected Arrivals</span>
            <span className="text-2xl font-black text-white">{data?.arrivals.length}</span>
            <span className="text-slate-400 block text-[10px]">Due check-ins today</span>
          </div>
          <LogIn className="h-9 w-9 text-cyan-500 bg-cyan-500/5 p-2 rounded-xl border border-cyan-500/10" />
        </div>

        {/* In house guests widget */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Currently In-House</span>
            <span className="text-2xl font-black text-white">{data?.in_house.length}</span>
            <span className="text-slate-400 block text-[10px]">Active occupied rooms</span>
          </div>
          <ShieldAlert className="h-9 w-9 text-indigo-500 bg-indigo-500/5 p-2 rounded-xl border border-indigo-500/10" />
        </div>

        {/* Departures widget */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Due Departures</span>
            <span className="text-2xl font-black text-white">{data?.departures.length}</span>
            <span className="text-slate-400 block text-[10px]">Pending checkouts today</span>
          </div>
          <LogOut className="h-9 w-9 text-emerald-500 bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10" />
        </div>
      </div>

      {/* Filter bar search */}
      <div className="relative max-w-md">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter today's roster by guest name, phone, or room..."
          className="bg-slate-900 border-slate-800 text-slate-100 rounded-lg pl-10 h-10 w-full"
        />
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
      </div>

      {/* Three Column operations roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columns 1: Arrivals */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <h3 className="font-bold text-sm text-cyan-400 uppercase tracking-wider">Arrivals roster ({arrivalsFiltered.length})</h3>
          </div>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {arrivalsFiltered.length > 0 ? (
              arrivalsFiltered.map((res) => (
                <GuestCard
                  key={res.id}
                  reservation={res}
                  onCheckIn={(r) => {
                    setSelectedRes(r);
                    setCheckInOpen(true);
                  }}
                />
              ))
            ) : (
              <p className="text-slate-600 text-xs py-4 font-medium text-center border border-dashed border-slate-900/60 rounded-xl">No arrivals scheduled.</p>
            )}
          </div>
        </div>

        {/* Columns 2: In House */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <h3 className="font-bold text-sm text-indigo-400 uppercase tracking-wider">Active In-House ({inHouseFiltered.length})</h3>
          </div>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {inHouseFiltered.length > 0 ? (
              inHouseFiltered.map((res) => (
                <GuestCard
                  key={res.id}
                  reservation={res}
                  onCheckOut={(r) => {
                    setSelectedRes(r);
                    setCheckOutOpen(true);
                  }}
                />
              ))
            ) : (
              <p className="text-slate-600 text-xs py-4 font-medium text-center border border-dashed border-slate-900/60 rounded-xl">No active guest rooms.</p>
            )}
          </div>
        </div>

        {/* Columns 3: Departures */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <h3 className="font-bold text-sm text-emerald-400 uppercase tracking-wider">Departures roster ({departuresFiltered.length})</h3>
          </div>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {departuresFiltered.length > 0 ? (
              departuresFiltered.map((res) => (
                <GuestCard
                  key={res.id}
                  reservation={res}
                  onCheckOut={(r) => {
                    setSelectedRes(r);
                    setCheckOutOpen(true);
                  }}
                />
              ))
            ) : (
              <p className="text-slate-600 text-xs py-4 font-medium text-center border border-dashed border-slate-900/60 rounded-xl">No departures scheduled.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modals & Forms */}
      <CheckInModal
        isOpen={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        reservation={selectedRes}
        onConfirm={handleCheckInConfirm}
      />

      <CheckOutModal
        isOpen={checkOutOpen}
        onClose={() => setCheckOutOpen(false)}
        reservation={selectedRes}
        onConfirm={handleCheckOutConfirm}
      />

      <WalkInForm
        isOpen={walkInOpen}
        onClose={() => setWalkInOpen(false)}
        onConfirm={handleWalkInConfirm}
      />
    </div>
  );
}
