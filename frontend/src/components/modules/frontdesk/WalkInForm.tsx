import React, { useState, useEffect } from "react";
import { Loader2, UserPlus, Key, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { roomsApi } from "@/lib/api/rooms";
import { bookingsApi } from "@/lib/api/bookings";
import type { Room, RoomType } from "@/lib/types";

interface WalkInFormProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: any) => Promise<void>;
}

export const WalkInForm: React.FC<WalkInFormProps> = ({ isOpen, onClose, onConfirm }) => {
  // Metadata states
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // Guest details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nationality, setNationality] = useState("Nepalese");
  const [idType, setIdType] = useState("citizenship");
  const [idNumber, setIdNumber] = useState("");

  // Stay parameters
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<number>(0);
  const [checkOutDate, setCheckOutDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number>(0);
  const [checkingRooms, setCheckingRooms] = useState(false);

  // Check-in details
  const [keyIssued, setKeyIssued] = useState("");
  const [lockerNumber, setLockerNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load classes on open
  useEffect(() => {
    if (isOpen) {
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setNationality("Nepalese");
      setIdType("citizenship");
      setIdNumber("");
      setSelectedRoomTypeId(0);
      setCheckOutDate("");
      setAdults(1);
      setAvailableRooms([]);
      setSelectedRoomId(0);
      setKeyIssued("");
      setLockerNumber("");
      setNotes("");

      const fetchMetadata = async () => {
        setLoadingMetadata(true);
        try {
          const res = await roomsApi.listRoomTypes();
          const types = res.data.results || [];
          setRoomTypes(types);
          if (types.length > 0) {
            setSelectedRoomTypeId(types[0].id);
          }
        } catch (err) {
          console.error(err);
          toast.error("Failed to load room classes.");
        } finally {
          setLoadingMetadata(false);
        }
      };
      fetchMetadata();
    }
  }, [isOpen]);

  // Query rooms whenever dates or type change
  useEffect(() => {
    if (!checkOutDate || !selectedRoomTypeId) return;

    const queryAvailableRooms = async () => {
      setCheckingRooms(true);
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const res = await bookingsApi.checkAvailability({
          check_in: todayStr,
          check_out: checkOutDate,
          adults,
          room_type: selectedRoomTypeId,
        });
        const rooms: Room[] = res.data.available_rooms || [];
        setAvailableRooms(rooms);
        if (rooms.length > 0) {
          setSelectedRoomId(rooms[0].id);
        } else {
          setSelectedRoomId(0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingRooms(false);
      }
    };
    queryAvailableRooms();
  }, [checkOutDate, selectedRoomTypeId, adults]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone || !selectedRoomId || !checkOutDate || !keyIssued.trim()) {
      toast.error("Please fill in all required fields (marked *).");
      return;
    }

    setSubmitting(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      await onConfirm({
        first_name: firstName,
        last_name: lastName,
        phone,
        email: email || undefined,
        nationality,
        id_type: idType,
        id_number: idNumber || undefined,
        room_id: selectedRoomId,
        check_in_date: todayStr,
        check_out_date: checkOutDate,
        adults,
        key_issued: keyIssued,
        locker_number: lockerNumber || undefined,
        notes: notes || undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-950 border-slate-900 text-slate-100 max-w-2xl rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-cyan-400" />
              Quick Walk-In Registration
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Check in a walk-in guest instantly. Generates guest profile, reservation, and check-in details.
            </DialogDescription>
          </DialogHeader>

          {loadingMetadata ? (
            <div className="flex items-center justify-center py-12 gap-2 text-xs text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
              Loading classes configuration...
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* SECTION 1: Guest Profile */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-cyan-400 uppercase tracking-wider text-[10px] border-b border-slate-900/60 pb-1">Guest Profile Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="w-first" className="text-slate-400 font-bold uppercase text-[9px]">First Name *</Label>
                    <Input id="w-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ramesh" required className="bg-slate-900 border-slate-800 text-slate-100 rounded-lg h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="w-last" className="text-slate-400 font-bold uppercase text-[9px]">Last Name *</Label>
                    <Input id="w-last" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Sharma" required className="bg-slate-900 border-slate-800 text-slate-100 rounded-lg h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="w-phone" className="text-slate-400 font-bold uppercase text-[9px]">Phone Number *</Label>
                    <Input id="w-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9841XXXXXX" required className="bg-slate-900 border-slate-800 text-slate-100 rounded-lg h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="w-email" className="text-slate-400 font-bold uppercase text-[9px]">Email Address</Label>
                    <Input id="w-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ramesh@gmail.com" className="bg-slate-900 border-slate-800 text-slate-100 rounded-lg h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="w-nat" className="text-slate-400 font-bold uppercase text-[9px]">Nationality</Label>
                    <Input id="w-nat" value={nationality} onChange={(e) => setNationality(e.target.value)} className="bg-slate-900 border-slate-800 text-slate-100 rounded-lg h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="w-idtype" className="text-slate-400 font-bold uppercase text-[9px]">ID Card Type</Label>
                    <select id="w-idtype" value={idType} onChange={(e) => setIdType(e.target.value)} className="w-full rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs p-2 h-9 outline-none cursor-pointer">
                      <option value="citizenship">Citizenship Card</option>
                      <option value="passport">Passport</option>
                      <option value="driving_license">Driving License</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label htmlFor="w-idnum" className="text-slate-400 font-bold uppercase text-[9px]">ID Card Number</Label>
                    <Input id="w-idnum" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="ID Document Reference" className="bg-slate-900 border-slate-800 text-slate-100 rounded-lg h-9" />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Room & Stay */}
              <div className="space-y-3 pt-2">
                <h4 className="font-extrabold text-cyan-400 uppercase tracking-wider text-[10px] border-b border-slate-900/60 pb-1">Room Class & Stay Duration</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="w-checkout" className="text-slate-400 font-bold uppercase text-[9px]">Check Out Date *</Label>
                    <Input id="w-checkout" type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} required className="bg-slate-900 border-slate-800 text-slate-100 rounded-lg h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="w-class" className="text-slate-400 font-bold uppercase text-[9px]">Room Class *</Label>
                    <select id="w-class" value={selectedRoomTypeId} onChange={(e) => setSelectedRoomTypeId(Number(e.target.value))} className="w-full rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs p-2 h-9 outline-none cursor-pointer">
                      {roomTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="w-adults" className="text-slate-400 font-bold uppercase text-[9px]">Adults Count</Label>
                    <Input id="w-adults" type="number" min={1} value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="bg-slate-900 border-slate-800 text-slate-100 rounded-lg h-9" />
                  </div>
                </div>

                {/* Available Rooms Select */}
                {checkOutDate && (
                  <div className="space-y-2 pt-1.5">
                    <Label className="text-slate-400 font-bold uppercase text-[9px] flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                      Select Available Room *
                    </Label>
                    {checkingRooms ? (
                      <div className="flex items-center gap-1.5 text-slate-500 py-2 text-[11px] font-medium">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                        Checking room ledger...
                      </div>
                    ) : availableRooms.length > 0 ? (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {availableRooms.map((room) => (
                          <div
                            key={room.id}
                            onClick={() => setSelectedRoomId(room.id)}
                            className={`p-2 rounded-lg border text-center cursor-pointer font-bold transition-all text-xs ${
                              selectedRoomId === room.id
                                ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                                : "bg-slate-950/40 border-slate-900 text-slate-500 hover:border-slate-800"
                            }`}
                          >
                            {room.room_number}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-red-400 text-[10px] font-semibold py-1">No rooms of this class are available for these dates.</p>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 3: Check-in Params */}
              <div className="space-y-3 pt-2">
                <h4 className="font-extrabold text-cyan-400 uppercase tracking-wider text-[10px] border-b border-slate-900/60 pb-1">Check-In parameters</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="w-key" className="text-slate-400 font-bold uppercase text-[9px] flex items-center gap-1">
                      <Key className="h-3 w-3 text-cyan-400" />
                      Assigned Key Card *
                    </Label>
                    <Input id="w-key" value={keyIssued} onChange={(e) => setKeyIssued(e.target.value)} placeholder="e.g. CARD-KEY-305" required className="bg-slate-900 border-slate-800 text-slate-100 rounded-lg h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="w-locker" className="text-slate-400 font-bold uppercase text-[9px]">Locker ID (Optional)</Label>
                    <Input id="w-locker" value={lockerNumber} onChange={(e) => setLockerNumber(e.target.value)} placeholder="e.g. L-15" className="bg-slate-900 border-slate-800 text-slate-100 rounded-lg h-9" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label htmlFor="w-notes" className="text-slate-400 font-bold uppercase text-[9px]">Stay Notes</Label>
                    <Textarea id="w-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Walk-in guest directly assigned. Settled cash payments." className="bg-slate-900 border-slate-800 text-slate-100 rounded-lg p-2 h-14 min-h-[50px]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-slate-900/60">
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              className="border border-slate-800 text-slate-400 hover:text-white rounded-lg h-10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !selectedRoomId || !keyIssued.trim()}
              className="bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-lg h-10 px-5 gap-1.5 shadow-lg shadow-cyan-500/10"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Registering Guest...
                </>
              ) : (
                "Complete Walk In"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
