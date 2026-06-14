"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bed, Calendar, Users, ArrowRight, Loader2, Sparkles, CheckCircle2, Phone, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { bookingsApi } from "@/lib/api/bookings";
import { roomsApi } from "@/lib/api/rooms";
import type { RoomType } from "@/lib/types";

export default function PublicBookingWidgetPage() {
  const [step, setStep] = useState(1);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

  // Search Availability
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [availableTypes, setAvailableTypes] = useState<any[]>([]);

  // Selected Room Type for Booking
  const [selectedTypeItem, setSelectedTypeItem] = useState<any | null>(null);

  // Guest Details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nationality, setNationality] = useState("Nepalese");
  const [specialRequests, setSpecialRequests] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation Success
  const [createdBooking, setCreatedBooking] = useState<any | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      setIsLoadingMetadata(true);
      try {
        const res = await roomsApi.listRoomTypes();
        setRoomTypes(res.data.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingMetadata(false);
      }
    };
    fetchMetadata();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut || !adults) {
      toast.error("Please fill in dates and occupant details.");
      return;
    }
    if (new Date(checkIn) >= new Date(checkOut)) {
      toast.error("Check-out date must be after check-in date.");
      return;
    }

    setIsSearching(true);
    try {
      const res = await bookingsApi.publicAvailability({
        check_in: checkIn,
        check_out: checkOut,
        adults,
      });
      setAvailableTypes(res.data || []);
      if (res.data.length === 0) {
        toast.info("No room classes are available for these stay dates.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to query availability database.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectRoomType = (item: any) => {
    setSelectedTypeItem(item);
    setStep(2);
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone) {
      toast.error("Please write first name, last name, and contact phone number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await bookingsApi.publicBookingCreate({
        guest: {
          first_name: firstName,
          last_name: lastName,
          phone,
          email: email || undefined,
          nationality,
        },
        booking: {
          check_in_date: checkIn,
          check_out_date: checkOut,
          room_type_id: selectedTypeItem.room_type.id,
          adults,
          special_requests: specialRequests || undefined,
        },
      });

      setCreatedBooking(res.data);
      toast.success("Stay reservation sent successfully!");
      setStep(3);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Error confirming reservation request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMetadata) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
        <p className="text-slate-400 text-xs font-medium">Synchronizing widget parameters...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col justify-start max-w-2xl mx-auto space-y-6">
      {/* Visual Widget Header */}
      <div className="text-center space-y-2 py-4">
        <h1 className="text-2xl font-black bg-gradient-to-r from-white via-slate-300 to-slate-500 bg-clip-text text-transparent">
          Stay Reservation Portal
        </h1>
        <p className="text-slate-400 text-xs">Direct reservation widget — Book directly for premium rates.</p>
      </div>

      {/* STEP 1: Search Availability & List */}
      {step === 1 && (
        <div className="space-y-6">
          <Card className="bg-slate-900/40 border-slate-800 shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Search Room Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-2">
                  <Label htmlFor="check-in" className="text-slate-400 uppercase font-bold">Check In</Label>
                  <Input
                    type="date"
                    id="check-in"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="check-out" className="text-slate-400 uppercase font-bold">Check Out</Label>
                  <Input
                    type="date"
                    id="check-out"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adults" className="text-slate-400 uppercase font-bold">Adults</Label>
                  <Input
                    type="number"
                    id="adults"
                    min={1}
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSearching}
                  className="col-span-1 sm:col-span-3 w-full bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold gap-2 shadow-lg shadow-cyan-500/20"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching Catalog...
                    </>
                  ) : (
                    <>
                      Search Room Classes
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results Class List */}
          <div className="space-y-4">
            {availableTypes.map((item) => (
              <Card
                key={item.room_type.id}
                className="bg-slate-900/40 border-slate-800 hover:border-slate-700 transition-all overflow-hidden flex flex-col sm:flex-row"
              >
                <div className="flex-1 p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">{item.room_type.name}</h3>
                      <p className="text-[11px] text-slate-500">{item.room_type.slug}</p>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      Max: {item.room_type.max_occupancy} Guests
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{item.room_type.description}</p>
                </div>

                <div className="border-t sm:border-t-0 sm:border-l border-slate-900 p-5 bg-slate-900/10 flex flex-col justify-center items-center text-center gap-3 w-full sm:w-48 flex-shrink-0">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Stay</span>
                    <span className="text-lg font-black text-cyan-400">
                      Rs. {Number(item.pricing.total_price).toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-500 block">({item.pricing.nights} Nights, incl. VAT)</span>
                  </div>
                  <Button
                    onClick={() => handleSelectRoomType(item)}
                    size="sm"
                    className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold gap-1"
                  >
                    Book Stay
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Guest Details Form */}
      {step === 2 && selectedTypeItem && (
        <Card className="bg-slate-900/40 border-slate-800 shadow-md">
          <CardHeader className="border-b border-slate-900 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Guest & Contact Information</CardTitle>
              <CardDescription className="text-slate-500 text-xs">Fill details to confirm pending reservation.</CardDescription>
            </div>
            <Button
              onClick={() => setStep(1)}
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-slate-400 hover:text-white"
            >
              Change Room
            </Button>
          </CardHeader>

          <CardContent className="pt-5">
            <form onSubmit={handleConfirmBooking} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="first-name" className="text-slate-400 font-bold uppercase">First Name</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ramesh"
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="last-name" className="text-slate-400 font-bold uppercase">Last Name</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Sharma"
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="phone" className="text-slate-400 font-bold uppercase">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98XXXXXXXX"
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="email" className="text-slate-400 font-bold uppercase">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ramesh@gmail.com"
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="special-requests" className="text-slate-400 font-bold uppercase">Special Stay Requirements</Label>
                <Input
                  id="special-requests"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g. Requests extra pillows, late check-in..."
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              {/* Stay Summary details */}
              <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-4 space-y-2">
                <h4 className="font-bold text-slate-400 uppercase tracking-wider">Summary of Reservation Charges</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Stay Class</span>
                    <span>{selectedTypeItem.room_type.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Nights Charge</span>
                    <span>Rs. {Number(selectedTypeItem.pricing.base_price).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>VAT (13%)</span>
                    <span>Rs. {Number(selectedTypeItem.pricing.tax_price).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-cyan-400 pt-1.5 border-t border-slate-900">
                    <span>Total Amount</span>
                    <span>Rs. {Number(selectedTypeItem.pricing.total_price).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold gap-2 shadow-lg shadow-cyan-500/20 h-10"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    Confirming Reservation...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm Reservation Request
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Checkout Success */}
      {step === 3 && createdBooking && (
        <Card className="bg-slate-900/40 border-slate-800 shadow-md text-center py-10 px-6 space-y-6">
          <div className="h-16 w-16 bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/10">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Booking Request Confirmed!</h2>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              Your reservation request has been processed. Stay details are listed below:
            </p>
          </div>

          {/* Details summary */}
          <div className="rounded-xl border border-slate-900 bg-slate-950 p-4 max-w-md mx-auto text-left text-xs space-y-3">
            <div className="flex justify-between pb-2 border-b border-slate-900">
              <span className="text-slate-500">Booking Ref</span>
              <span className="font-extrabold text-slate-200">#{createdBooking.id}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-900">
              <span className="text-slate-500">Guest Name</span>
              <span className="font-semibold text-slate-200">
                {firstName} {lastName}
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-900">
              <span className="text-slate-500">Check In</span>
              <span className="font-semibold text-slate-200">{checkIn}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-900">
              <span className="text-slate-500">Check Out</span>
              <span className="font-semibold text-slate-200">{checkOut}</span>
            </div>
            <div className="flex justify-between pt-1 font-extrabold text-cyan-400">
              <span>Total Stay Value</span>
              <span>Rs. {Number(createdBooking.total_amount).toLocaleString()}</span>
            </div>
          </div>

          <div className="pt-4 max-w-md mx-auto">
            <Button
              onClick={() => {
                setStep(1);
                setAvailableTypes([]);
                setSelectedTypeItem(null);
                setCreatedBooking(null);
              }}
              className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold h-10"
            >
              Start New Search
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
