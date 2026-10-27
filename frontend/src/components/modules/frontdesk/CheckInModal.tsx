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
import { useTranslations } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

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
  const t = useTranslations("FrontDesk");
  const tCommon = useTranslations("Common");
  const tData = useTransData();

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
      <DialogContent className="bg-workspace-950 border-workspace-900 text-workspace-100 max-w-md rounded-2xl shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-400" />
              {t("check_in_guest")}
            </DialogTitle>
            <DialogDescription className="text-workspace-500 text-xs">
              {t("subtitle")}
            </DialogDescription>
          </DialogHeader>

          {/* Guest Stay Review */}
          <div className="rounded-xl border border-workspace-900/60 bg-workspace-900/10 p-3.5 space-y-2 text-xs">
            <h4 className="font-bold text-workspace-400 uppercase tracking-wider text-[10px]">{t("stay_summary")}</h4>
            <div className="grid grid-cols-2 gap-2 text-workspace-300">
              <div>
                <span className="text-workspace-500 block text-[10px]">{t("guest_name")}</span>
                <span className="font-semibold">{reservation.guest.first_name} {reservation.guest.last_name}</span>
              </div>
              <div>
                <span className="text-workspace-500 block text-[10px]">{t("assigned_room")}</span>
                <span className="font-semibold text-brand-400">{t("room")} {reservation.room.room_number} ({tData(reservation.room.room_type.name)})</span>
              </div>
              <div>
                <span className="text-workspace-500 block text-[10px]">{t("phone_number")}</span>
                <span className="font-semibold">{reservation.guest.phone}</span>
              </div>
              <div>
                <span className="text-workspace-500 block text-[10px]">{t("nights_count").split(" ")[0]}</span>
                <span className="font-semibold">{t("nights_count", { count: reservation.total_nights })}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Key Card Field */}
            <div className="space-y-1.5">
              <Label htmlFor="key-card" className="text-workspace-400 font-bold uppercase text-[10px] flex items-center gap-1">
                <Key className="h-3.5 w-3.5 text-brand-400" />
                {t("assigned_key")}
              </Label>
              <Input
                id="key-card"
                value={keyIssued}
                onChange={(e) => setKeyIssued(e.target.value)}
                placeholder="e.g. CARD-KEY-101B"
                required
                className="bg-workspace-900 border-workspace-800 text-workspace-100 rounded-lg h-10"
              />
            </div>

            {/* Locker field */}
            <div className="space-y-1.5">
              <Label htmlFor="locker" className="text-workspace-400 font-bold uppercase text-[10px]">
                {t("locker")}
              </Label>
              <Input
                id="locker"
                value={lockerNumber}
                onChange={(e) => setLockerNumber(e.target.value)}
                placeholder="e.g. LOCKER-A"
                className="bg-workspace-900 border-workspace-800 text-workspace-100 rounded-lg h-10"
              />
            </div>

            {/* ID document image stub */}
            <div className="space-y-1.5">
              <Label htmlFor="id-upload" className="text-workspace-400 font-bold uppercase text-[10px] flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-brand-400" />
                {t("id_upload")}
              </Label>
              <Input
                id="id-upload"
                value={docImage}
                onChange={(e) => setDocImage(e.target.value)}
                placeholder="uploads/id_docs/passport.jpg"
                className="bg-workspace-900 border-workspace-800 text-workspace-100 rounded-lg h-10"
              />
            </div>

            {/* Check-in notes */}
            <div className="space-y-1.5">
              <Label htmlFor="checkin-notes" className="text-workspace-400 font-bold uppercase text-[10px]">
                {t("notes")}
              </Label>
              <Textarea
                id="checkin-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Extra pillows requested, keys handed over directly..."
                className="bg-workspace-900 border-workspace-800 text-workspace-100 rounded-lg p-2.5 h-16 min-h-[64px]"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-workspace-900/60">
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              className="border border-workspace-800 text-workspace-400 hover:text-white rounded-lg h-10"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={submitting || !keyIssued.trim()}
              className="bg-gradient-to-tr from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold rounded-lg h-10 px-5 gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  {t("checking_in")}
                </>
              ) : (
                t("confirm_check_in")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
