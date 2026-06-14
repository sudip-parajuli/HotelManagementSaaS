"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, User, Calendar, DollarSign, ArrowRight, Check, Search, Sparkles, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { roomsApi } from "@/lib/api/rooms";
import { bookingsApi } from "@/lib/api/bookings";
import { GuestSearchInput } from "@/components/modules/bookings/GuestSearchInput";
import type { Room, RoomType, GuestProfile } from "@/lib/types";

export default function NewBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preRoomId = searchParams?.get("room_id");
  const preCheckIn = searchParams?.get("check_in");
  const preCheckOut = searchParams?.get("check_out");

  const [step, setStep] = useState(1);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

  // Step 1: Stay & Date Selection
  const [checkIn, setCheckIn] = useState(preCheckIn || "");
  const [checkOut, setCheckOut] = useState(preCheckOut || "");
  const [adults, setAdults] = useState(1);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<number>(0);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number>(preRoomId ? Number(preRoomId) : 0);
  const [pricingEstimate, setPricingEstimate] = useState<any>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Step 2: Guest Details
  const [guestId, setGuestId] = useState<number | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationality, setNationality] = useState("Nepalese");
  const [idType, setIdType] = useState("citizenship");
  const [idNumber, setIdNumber] = useState("");
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);

  // Step 3: Specials & Confirm
  const [specialRequests, setSpecialRequests] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadMetadata = async () => {
      setIsLoadingMetadata(true);
      try {
        const res = await roomsApi.listRoomTypes();
        const types = res.data.results || [];
        setRoomTypes(types);

        // Pre-fill type details if pre-assigned room is passed
        if (preRoomId) {
          const roomRes = await roomsApi.getRoom(Number(preRoomId));
          const typeId = roomRes.data.room_type?.id || 0;
          setSelectedRoomTypeId(typeId);
          // Set selection
          setSelectedRoomId(Number(preRoomId));
        } else if (types.length > 0) {
          setSelectedRoomTypeId(types[0].id);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load room classes.");
      } finally {
        setIsLoadingMetadata(false);
      }
    };
    loadMetadata();
  }, [preRoomId]);

  // Run availability check
  const handleCheckAvailability = async () => {
    if (!checkIn || !checkOut || !selectedRoomTypeId) {
      toast.error("Please fill in check-in, check-out, and room class.");
      return;
    }
    if (new Date(checkIn) >= new Date(checkOut)) {
      toast.error("Check-out date must be after check-in date.");
      return;
    }

    setCheckingAvailability(true);
    try {
      const res = await bookingsApi.checkAvailability({
        check_in: checkIn,
        check_out: checkOut,
        adults,
        room_type: selectedRoomTypeId,
      });

      const rooms: Room[] = res.data.available_rooms || [];
      setAvailableRooms(rooms);
      
      const estimates = res.data.pricing_estimates || {};
      setPricingEstimate(estimates[selectedRoomTypeId] || null);

      if (rooms.length > 0) {
        // Automatically select the first available room if none is pre-selected
        if (!selectedRoomId || !rooms.some((r) => r.id === selectedRoomId)) {
          setSelectedRoomId(rooms[0].id);
        }
        toast.success(`${rooms.length} rooms available!`);
      } else {
        toast.error("No rooms of this class are available for these dates.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Error querying availability ledger.");
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Run checks on mount if parameters exist
  useEffect(() => {
    if (preCheckIn && preCheckOut && selectedRoomTypeId) {
      handleCheckAvailability();
    }
  }, [preCheckIn, preCheckOut, selectedRoomTypeId]);

  const handleSelectExistingGuest = (guest: GuestProfile) => {
    setGuestId(guest.id);
    setFirstName(guest.first_name);
    setLastName(guest.last_name);
    setEmail(guest.email || "");
    setPhone(guest.phone);
    setNationality(guest.nationality || "Nepalese");
    toast.success(`Selected guest: ${guest.first_name} ${guest.last_name}`);
  };

  const handleAddNewGuest = (query: string) => {
    setGuestId(null);
    const names = query.split(" ");
    setFirstName(names[0] || "");
    setLastName(names.slice(1).join(" ") || "");
    setPhone("");
    setEmail("");
    setNationality("Nepalese");
    toast.info("Write details to create a new profile.");
  };

  const handleNextStep = async () => {
    if (step === 1) {
      if (!selectedRoomId) {
        toast.error("Please select a room to proceed.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!firstName || !lastName || !phone) {
        toast.error("Please fill in first name, last name, and phone number.");
        return;
      }

      // If guest profile is new (no guestId), we can create it right now to get the ID
      if (!guestId) {
        setIsCreatingGuest(true);
        try {
          const res = await bookingsApi.createGuest({
            first_name: firstName,
            last_name: lastName,
            email,
            phone,
            nationality,
            id_type: idType as any,
            id_number: idNumber,
          });
          setGuestId(res.data.id);
          toast.success("Guest profile created successfully!");
          setStep(3);
        } catch (err: any) {
          console.error(err);
          toast.error(err.response?.data?.error || "Failed to create guest profile.");
          return;
        } finally {
          setIsCreatingGuest(false);
        }
      } else {
        setStep(3);
      }
    }
  };

  const handleConfirmBooking = async () => {
    if (!guestId || !selectedRoomId) return;
    setIsSubmitting(true);
    try {
      await bookingsApi.createReservation({
        guest_id: guestId,
        room_id: selectedRoomId,
        check_in_date: checkIn,
        check_out_date: checkOut,
        adults,
        special_requests: specialRequests,
        status: "confirmed", // staff reservations are auto-confirmed by default
      });
      toast.success("Stay reservation confirmed successfully!");
      router.push("/bookings/calendar");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to confirm reservation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMetadata) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
        <p className="text-slate-400 text-xs font-medium">Loading stay configuration...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 text-slate-400">
        <Link href="/bookings/calendar">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-slate-400 hover:text-white px-2">
            <ArrowLeft className="h-4 w-4" />
            Back to calendar
          </Button>
        </Link>
      </div>

      <div className="border-b border-slate-900 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Stay Reservation Builder</h1>
        <p className="text-slate-400 text-sm">Create a new booking reservation for a guest.</p>
      </div>

      {/* Progress Wizard Steps */}
      <div className="flex items-center justify-between max-w-lg mx-auto py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold ${
            step >= 1 ? "bg-cyan-500 text-white" : "bg-slate-900 text-slate-600"
          }`}>
            1
          </span>
          <span className={step >= 1 ? "text-slate-200 font-semibold" : "text-slate-600"}>Dates & Room</span>
        </div>
        <div className="w-12 h-px bg-slate-900" />
        <div className="flex items-center gap-2">
          <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold ${
            step >= 2 ? "bg-cyan-500 text-white" : "bg-slate-900 text-slate-600"
          }`}>
            2
          </span>
          <span className={step >= 2 ? "text-slate-200 font-semibold" : "text-slate-600"}>Guest Profiles</span>
        </div>
        <div className="w-12 h-px bg-slate-900" />
        <div className="flex items-center gap-2">
          <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold ${
            step >= 3 ? "bg-cyan-500 text-white" : "bg-slate-900 text-slate-600"
          }`}>
            3
          </span>
          <span className={step >= 3 ? "text-slate-200 font-semibold" : "text-slate-600"}>Confirmation</span>
        </div>
      </div>

      {/* STEP 1: Dates & Room */}
      {step === 1 && (
        <Card className="bg-slate-900/40 border-slate-800 shadow-md">
          <CardHeader>
            <CardTitle className="text-base text-white">Step 1 — Room & Stay Details</CardTitle>
            <CardDescription className="text-slate-500 text-xs">Configure stay intervals and query availability.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-2">
                <Label htmlFor="check-in" className="text-slate-400 font-bold uppercase">Check In Date</Label>
                <Input
                  type="date"
                  id="check-in"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 h-10 rounded-lg w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="check-out" className="text-slate-400 font-bold uppercase">Check Out Date</Label>
                <Input
                  type="date"
                  id="check-out"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 h-10 rounded-lg w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="room-type" className="text-slate-400 font-bold uppercase">Room Class</Label>
                <select
                  id="room-type"
                  value={selectedRoomTypeId}
                  onChange={(e) => setSelectedRoomTypeId(Number(e.target.value))}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-sm p-2.5 h-10 outline-none cursor-pointer focus:border-cyan-500"
                >
                  {roomTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adults" className="text-slate-400 font-bold uppercase">Adults count</Label>
                <Input
                  type="number"
                  id="adults"
                  min={1}
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="bg-slate-950 border-slate-800 text-slate-100 h-10 rounded-lg w-full"
                />
              </div>
            </div>

            <Button
              onClick={handleCheckAvailability}
              disabled={checkingAvailability}
              className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 gap-2 font-semibold"
            >
              {checkingAvailability ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                  Checking ledger availability...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  Check Room Availability
                </>
              )}
            </Button>

            {availableRooms.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-900">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase">Select Available Room</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {availableRooms.map((room) => (
                      <div
                        key={room.id}
                        onClick={() => setSelectedRoomId(room.id)}
                        className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${
                          selectedRoomId === room.id
                            ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 font-bold"
                            : "bg-slate-950/40 border-slate-900 text-slate-400 hover:border-slate-800"
                        }`}
                      >
                        Room {room.room_number}
                      </div>
                    ))}
                  </div>
                </div>

                {pricingEstimate && (
                  <div className="rounded-xl border border-slate-900 bg-slate-900/10 p-4 space-y-2 text-xs">
                    <h4 className="font-bold text-slate-400 uppercase tracking-wider">Estimated Rates Breakdown</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Stay Nights Room Charge</span>
                        <span>Rs. {Number(pricingEstimate.base_price).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>VAT (13%)</span>
                        <span>Rs. {Number(pricingEstimate.tax_price).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-extrabold text-cyan-400 pt-1 border-t border-slate-900">
                        <span>Total Stay Amount</span>
                        <span>Rs. {Number(pricingEstimate.total_price).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleNextStep}
                    className="bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold gap-2 shadow-lg shadow-cyan-500/20"
                  >
                    Next Step: Guest Details
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Guest Details */}
      {step === 2 && (
        <Card className="bg-slate-900/40 border-slate-800 shadow-md">
          <CardHeader>
            <CardTitle className="text-base text-white">Step 2 — Guest Ledger Registration</CardTitle>
            <CardDescription className="text-slate-500 text-xs">Associate stay with guest records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search Combobox */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Search Guest Profile</Label>
              <GuestSearchInput onSelect={handleSelectExistingGuest} onAddNew={handleAddNewGuest} />
            </div>

            {/* Profile fields */}
            <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-900">
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
                  placeholder="9841XXXXXX"
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="email" className="text-slate-400 font-bold uppercase">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@gmail.com"
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="nationality" className="text-slate-400 font-bold uppercase">Nationality</Label>
                <Input
                  id="nationality"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="id-type" className="text-slate-400 font-bold uppercase">ID Document Type</Label>
                <select
                  id="id-type"
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-sm p-2.5 h-10 outline-none cursor-pointer focus:border-cyan-500"
                >
                  <option value="citizenship">Citizenship Card</option>
                  <option value="passport">Passport</option>
                  <option value="driving_license">Driving License</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="id-number" className="text-slate-400 font-bold uppercase">ID Document Number</Label>
                <Input
                  id="id-number"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="ID Card Number"
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-900">
              <Button onClick={() => setStep(1)} variant="ghost" className="border border-slate-800 text-slate-400 hover:text-white h-10 px-4 gap-1">
                <ArrowLeft className="h-4 w-4" />
                Previous Step
              </Button>

              <Button
                onClick={handleNextStep}
                disabled={isCreatingGuest}
                className="bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold gap-2 shadow-lg shadow-cyan-500/20"
              >
                {isCreatingGuest ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    Creating Profile...
                  </>
                ) : (
                  <>
                    Next Step: Confirm
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Specials & Confirm */}
      {step === 3 && (
        <Card className="bg-slate-900/40 border-slate-800 shadow-md">
          <CardHeader>
            <CardTitle className="text-base text-white">Step 3 — Specials & Complete Booking</CardTitle>
            <CardDescription className="text-slate-500 text-xs">Verify billing values and write special requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-xs">
            {/* Stay Summary review */}
            <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-4 grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500 block">Stay Guest</span>
                <span className="font-semibold text-slate-200">{firstName} {lastName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Guest Phone</span>
                <span className="font-semibold text-slate-200">{phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Check In Date</span>
                <span className="font-semibold text-slate-200">{checkIn}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Check Out Date</span>
                <span className="font-semibold text-slate-200">{checkOut}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Assigned Room</span>
                <span className="font-semibold text-slate-200">Room {availableRooms.find((r) => r.id === selectedRoomId)?.room_number}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Nights Count</span>
                <span className="font-semibold text-slate-200">{pricingEstimate?.nights} Nights</span>
              </div>
            </div>

            {/* Special Request Inputs */}
            <div className="space-y-2">
              <Label htmlFor="special-requests" className="text-slate-400 font-bold uppercase">Special Requests / Requirements</Label>
              <Input
                id="special-requests"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="e.g. Vegetarian breakfast, double bed configuration, early check-in requested..."
                className="bg-slate-950 border-slate-800 text-slate-100 p-3 h-14"
              />
            </div>

            {/* Pricing Estimates */}
            {pricingEstimate && (
              <div className="rounded-xl border border-slate-900 bg-cyan-950/10 p-4 space-y-2">
                <h4 className="font-bold text-cyan-400 uppercase tracking-wider">Final Charges Review</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Base stay charges</span>
                    <span>Rs. {Number(pricingEstimate.base_price).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>VAT (13%)</span>
                    <span>Rs. {Number(pricingEstimate.tax_price).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-white pt-1.5 border-t border-slate-900">
                    <span>Total Stay Amount</span>
                    <span>Rs. {Number(pricingEstimate.total_price).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-900">
              <Button onClick={() => setStep(2)} variant="ghost" className="border border-slate-800 text-slate-400 hover:text-white h-10 px-4 gap-1">
                <ArrowLeft className="h-4 w-4" />
                Previous Step
              </Button>

              <Button
                onClick={handleConfirmBooking}
                disabled={isSubmitting}
                className="bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold gap-2 shadow-lg shadow-cyan-500/20 h-10 px-6"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    Confirming Reservation...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Confirm Reservation
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
