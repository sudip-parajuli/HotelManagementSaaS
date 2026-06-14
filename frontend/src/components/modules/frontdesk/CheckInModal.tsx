import React, { useState } from "react";
import { Loader2, Key, ShieldCheck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Reservation } from "@/lib/types";

interface CheckInModalProps {
  reservation: Reservation | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    reservation_id: number;
    key_issued: string;
    locker_number?: string;
    notes?: string;
    id_document_image?: string;
  }) => Promise<void>;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  reservation,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [keyIssued, setKeyIssued] = useState("");
  const [lockerNumber, setLockerNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [docImage, setDocImage] = useState("uploads/id_docs/placeholder.jpg");
  const [submitting, setSubmitting] = useState(false);

  if (!reservation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyIssued.trim()) return;

    setSubmitting(true);
    try {
      await onConfirm({
        reservation_id: reservation.id,
        key_issued: keyIssued,
        locker_number: lockerNumber,
        notes: notes,
        id_document_image: docImage,
      });
      setKeyIssued("");
      setLockerNumber("");
      setNotes("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-950 border-slate-900 text-slate-100 max-w-md rounded-2xl shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
              Check In Guest
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Confirm guest credentials and assign room keys.
            </DialogDescription>
          </DialogHeader>

          {/* Guest Stay Review */}
          <div className="rounded-xl border border-slate-900/60 bg-slate-900/10 p-3.5 space-y-2 text-xs">
            <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Stay Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px]">Guest Name</span>
                <span className="font-semibold">{reservation.guest.first_name} {reservation.guest.last_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Assigned Room</span>
                <span className="font-semibold text-cyan-400">Room {reservation.room.room_number} ({reservation.room.room_type.name})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Phone Number</span>
                <span className="font-semibold">{reservation.guest.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Nights Count</span>
                <span className="font-semibold">{reservation.total_nights} Nights</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Key Card Field */}
            <div className="space-y-1.5">
              <Label htmlFor="key-card" className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                <Key className="h-3.5 w-3.5 text-cyan-400" />
                Assigned Key Card ID *
              </Label>
              <Input
                id="key-card"
                value={keyIssued}
                onChange={(e) => setKeyIssued(e.target.value)}
                placeholder="e.g. CARD-KEY-101B"
                required
                className="bg-slate-900 border-slate-800 text-slate-100 rounded-lg h-10"
              />
            </div>

            {/* Locker field */}
            <div className="space-y-1.5">
              <Label htmlFor="locker" className="text-slate-400 font-bold uppercase text-[10px]">
                Locker Identifier (Optional)
              </Label>
              <Input
                id="locker"
                value={lockerNumber}
                onChange={(e) => setLockerNumber(e.target.value)}
                placeholder="e.g. LOCKER-A"
                className="bg-slate-900 border-slate-800 text-slate-100 rounded-lg h-10"
              />
            </div>

            {/* ID document image stub */}
            <div className="space-y-1.5">
              <Label htmlFor="id-upload" className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-cyan-400" />
                ID document photo path (MinIO)
              </Label>
              <Input
                id="id-upload"
                value={docImage}
                onChange={(e) => setDocImage(e.target.value)}
                placeholder="uploads/id_docs/passport.jpg"
                className="bg-slate-900 border-slate-800 text-slate-100 rounded-lg h-10"
              />
            </div>

            {/* Check-in notes */}
            <div className="space-y-1.5">
              <Label htmlFor="checkin-notes" className="text-slate-400 font-bold uppercase text-[10px]">
                Check-in Notes
              </Label>
              <Textarea
                id="checkin-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Extra pillows requested, keys handed over directly..."
                className="bg-slate-900 border-slate-800 text-slate-100 rounded-lg p-2.5 h-16 min-h-[64px]"
              />
            </div>
          </div>

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
              disabled={submitting || !keyIssued.trim()}
              className="bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-lg h-10 px-5 gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Checking In...
                </>
              ) : (
                "Confirm Check In"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
