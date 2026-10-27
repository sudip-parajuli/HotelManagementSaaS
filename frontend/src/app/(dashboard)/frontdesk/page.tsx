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
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

export default function FrontDeskPage() {
  const [data, setData] = useState<{
    arrivals: Reservation[];
    departures: Reservation[];
    in_house: Reservation[];
    occupancy_rate: number;
  } | null>(null);

  const t = useTranslations("FrontDesk");
  const tData = useTransData();
  const locale = useLocale();

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
      <div className="min-h-screen bg-workspace-950 text-foreground flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-brand-400" />
        <p className="text-workspace-400 text-xs font-semibold uppercase tracking-wider">
          {locale === "ne" ? "सञ्चालन ड्यासबोर्ड लोड हुँदैछ..." : "Loading operations dashboard..."}
        </p>
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
      <div className="flex items-center justify-between border-b border-workspace-900 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("title")}</h1>
          <p className="text-workspace-400 text-sm">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={loadData}
            variant="ghost"
            className="border border-workspace-800 text-workspace-400 hover:text-white rounded-lg h-10 w-10 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setWalkInOpen(true)}
            className="bg-gradient-to-tr from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold rounded-lg h-10 px-4 gap-2 shadow-lg shadow-brand-500/20 animate-pulse-subtle"
          >
            <UserPlus className="h-4 w-4" />
            {locale === "ne" ? "द्रुत वाक-इन चेक-इन" : "Quick Walk-In Check In"}
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
        <div className="bg-workspace-900/40 border border-workspace-800 p-5 rounded-xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-workspace-500 uppercase tracking-wider text-[10px] block">
              {locale === "ne" ? "अपेक्षित आगमनहरू" : "Expected Arrivals"}
            </span>
            <span className="text-2xl font-black text-foreground">{data?.arrivals.length}</span>
            <span className="text-workspace-400 block text-[10px]">
              {locale === "ne" ? "आज चेक-इन गर्नुपर्ने" : "Due check-ins today"}
            </span>
          </div>
          <LogIn className="h-9 w-9 text-brand-500 bg-brand-500/5 p-2 rounded-xl border border-brand-500/10" />
        </div>

        {/* In house guests widget */}
        <div className="bg-workspace-900/40 border border-workspace-800 p-5 rounded-xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-workspace-500 uppercase tracking-wider text-[10px] block">
              {locale === "ne" ? "हाल होटल भित्र" : "Currently In-House"}
            </span>
            <span className="text-2xl font-black text-foreground">{data?.in_house.length}</span>
            <span className="text-workspace-400 block text-[10px]">
              {locale === "ne" ? "सक्रिय भरिएका कोठाहरू" : "Active occupied rooms"}
            </span>
          </div>
          <ShieldAlert className="h-9 w-9 text-indigo-500 bg-indigo-500/5 p-2 rounded-xl border border-indigo-500/10" />
        </div>

        {/* Departures widget */}
        <div className="bg-workspace-900/40 border border-workspace-800 p-5 rounded-xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-workspace-500 uppercase tracking-wider text-[10px] block">
              {locale === "ne" ? "चेक-आउट गर्नुपर्ने" : "Due Departures"}
            </span>
            <span className="text-2xl font-black text-foreground">{data?.departures.length}</span>
            <span className="text-workspace-400 block text-[10px]">
              {locale === "ne" ? "आज बाँकी रहेका चेक-आउट" : "Pending checkouts today"}
            </span>
          </div>
          <LogOut className="h-9 w-9 text-emerald-500 bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10" />
        </div>
      </div>

      {/* Filter bar search */}
      <div className="relative max-w-md">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={locale === "ne" ? "नाम, फोन वा कोठा नम्बरद्वारा आजको सूची फिल्टर गर्नुहोस्..." : "Filter today's roster by guest name, phone, or room..."}
          className="bg-workspace-900 border-workspace-800 text-workspace-100 rounded-lg pl-10 h-10 w-full"
        />
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-workspace-500" />
      </div>

      {/* Three Column operations roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columns 1: Arrivals */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-workspace-900 pb-2">
            <h3 className="font-bold text-sm text-brand-400 uppercase tracking-wider">
              {locale === "ne" ? "आगमन सूची" : "Arrivals roster"} ({arrivalsFiltered.length})
            </h3>
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
              <p className="text-workspace-600 text-xs py-4 font-medium text-center border border-dashed border-workspace-900/60 rounded-xl">
                {locale === "ne" ? "कुनै आगमन निर्धारित छैन।" : "No arrivals scheduled."}
              </p>
            )}
          </div>
        </div>

        {/* Columns 2: In House */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-workspace-900 pb-2">
            <h3 className="font-bold text-sm text-indigo-400 uppercase tracking-wider">
              {locale === "ne" ? "सक्रिय पाहुना सूची" : "Active In-House"} ({inHouseFiltered.length})
            </h3>
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
              <p className="text-workspace-600 text-xs py-4 font-medium text-center border border-dashed border-workspace-900/60 rounded-xl">
                {locale === "ne" ? "कुनै सक्रिय पाहुना कोठा छैन।" : "No active guest rooms."}
              </p>
            )}
          </div>
        </div>

        {/* Columns 3: Departures */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-workspace-900 pb-2">
            <h3 className="font-bold text-sm text-emerald-400 uppercase tracking-wider">
              {locale === "ne" ? "प्रस्थान सूची" : "Departures roster"} ({departuresFiltered.length})
            </h3>
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
              <p className="text-workspace-600 text-xs py-4 font-medium text-center border border-dashed border-workspace-900/60 rounded-xl">
                {locale === "ne" ? "कुनै प्रस्थान निर्धारित छैन।" : "No departures scheduled."}
              </p>
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

