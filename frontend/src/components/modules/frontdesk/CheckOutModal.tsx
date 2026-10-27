import React, { useState, useEffect } from "react";
import { Loader2, DollarSign, Plus, Trash2, ShieldAlert } from "lucide-react";
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
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

interface AdditionalCharge {
  description: string;
  amount: number;
}

interface CheckOutModalProps {
  reservation: Reservation | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    reservation_id: number;
    additional_charges: AdditionalCharge[];
    payment_method: string;
    feedback_rating?: number;
    feedback_comment?: string;
  }) => Promise<void>;
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  reservation,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const t = useTranslations("FrontDesk");
  const tCommon = useTranslations("Common");
  const tData = useTransData();
  const locale = useLocale();

  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAdditionalCharges([]);
      setDesc("");
      setAmount("");
      setPaymentMethod("cash");
      setRating(5);
      setComment("");
    }
  }, [isOpen]);

  if (!reservation) return null;

  const handleAddCharge = () => {
    if (!desc.trim() || !amount) return;
    setAdditionalCharges([
      ...additionalCharges,
      { description: desc, amount: parseFloat(amount) },
    ]);
    setDesc("");
    setAmount("");
  };

  const handleRemoveCharge = (index: number) => {
    setAdditionalCharges(additionalCharges.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const roomTotal = parseFloat(reservation.total_amount) || 0;
    const additionalTotal = additionalCharges.reduce((sum, item) => sum + item.amount, 0);
    return {
      roomTotal,
      additionalTotal,
      grandTotal: roomTotal + additionalTotal,
    };
  };

  const { roomTotal, additionalTotal, grandTotal } = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirm({
        reservation_id: reservation.id,
        additional_charges: additionalCharges,
        payment_method: paymentMethod,
        feedback_rating: rating,
        feedback_comment: comment,
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
      <DialogContent className="bg-workspace-950 border-workspace-900 text-workspace-100 max-w-lg rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-emerald-400" />
              {t("confirm_check_out")}
            </DialogTitle>
            <DialogDescription className="text-workspace-500 text-xs">
              {t("subtitle")}
            </DialogDescription>
          </DialogHeader>

          {/* Stay review details */}
          <div className="rounded-xl border border-workspace-900 bg-workspace-900/10 p-3.5 space-y-2 text-xs">
            <h4 className="font-bold text-workspace-400 uppercase tracking-wider text-[10px]">{t("stay_summary")}</h4>
            <div className="grid grid-cols-2 gap-2 text-workspace-300">
              <div>
                <span className="text-workspace-500 block text-[10px]">{t("guest_name")}</span>
                <span className="font-semibold">{reservation.guest.first_name} {reservation.guest.last_name}</span>
              </div>
              <div>
                <span className="text-workspace-500 block text-[10px]">{t("assigned_room")}</span>
                <span className="font-semibold text-workspace-200">{t("room")} {reservation.room.room_number}</span>
              </div>
              <div>
                <span className="text-workspace-500 block text-[10px]">{t("dates")}</span>
                <span className="font-semibold">{reservation.check_in_date} - {reservation.check_out_date}</span>
              </div>
              <div>
                <span className="text-workspace-500 block text-[10px]">{t("nights_count").split(" ")[0]}</span>
                <span className="font-semibold">{t("nights_count", { count: reservation.total_nights })}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Custom additional charges builder */}
            <div className="space-y-2.5">
              <Label className="text-workspace-400 font-bold uppercase text-[10px]">{t("additional_charges")}</Label>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-7">
                  <Input
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder={locale === "ne" ? "विवरण (उदा. लाउन्ड्री शुल्क)" : "Description (e.g. Laundry charges)"}
                    className="bg-workspace-900 border-workspace-800 text-workspace-100 rounded-lg h-9 text-xs"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={t("amount").split(" ")[0]}
                    className="bg-workspace-900 border-workspace-800 text-workspace-100 rounded-lg h-9 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <Button
                    type="button"
                    onClick={handleAddCharge}
                    className="w-full bg-workspace-900 hover:bg-workspace-800 border border-workspace-800 h-9 rounded-lg px-2"
                  >
                    <Plus className="h-4 w-4 text-brand-400" />
                  </Button>
                </div>
              </div>

              {/* Added charges list */}
              {additionalCharges.length > 0 && (
                <div className="rounded-lg border border-workspace-900 bg-workspace-950 p-2 space-y-1.5 max-h-[120px] overflow-y-auto">
                  {additionalCharges.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-workspace-300 text-xs py-1 border-b border-workspace-900/60 last:border-b-0">
                      <span>{item.description}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">Rs. {item.amount.toLocaleString()}</span>
                        <Trash2
                          onClick={() => handleRemoveCharge(idx)}
                          className="h-3.5 w-3.5 text-red-500 hover:text-red-400 cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Method selector */}
            <div className="space-y-1.5">
              <Label htmlFor="payment" className="text-workspace-400 font-bold uppercase text-[10px] flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                {t("payment_method")}
              </Label>
              <select
                id="payment"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg bg-workspace-900 border border-workspace-800 text-workspace-300 text-xs p-2.5 h-10 outline-none cursor-pointer focus:border-emerald-500"
              >
                <option value="cash">{tData("cash")} (NPR)</option>
                <option value="card">{tData("card")}</option>
                <option value="esewa">{tData("esewa")}</option>
                <option value="khalti">{tData("khalti")}</option>
                <option value="fonepay">{tData("fonepay")}</option>
                <option value="bank_transfer">{tData("bank_transfer")}</option>
              </select>
            </div>

            {/* Feedback Rating & Comments */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rating" className="text-workspace-400 font-bold uppercase text-[10px]">
                  {t("feedback_rating")}
                </Label>
                <select
                  id="rating"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full rounded-lg bg-workspace-900 border border-workspace-800 text-workspace-300 text-xs p-2.5 h-10 outline-none cursor-pointer"
                >
                  <option value={5}>{locale === "ne" ? "५ ★ - उत्कृष्ट" : "5 ★ - Excellent"}</option>
                  <option value={4}>{locale === "ne" ? "४ ★ - धेरै राम्रो" : "4 ★ - Very Good"}</option>
                  <option value={3}>{locale === "ne" ? "३ ★ - सामान्य" : "3 ★ - Average"}</option>
                  <option value={2}>{locale === "ne" ? "२ ★ - खराब" : "2 ★ - Poor"}</option>
                  <option value={1}>{locale === "ne" ? "१ ★ - अति खराब" : "1 ★ - Bad"}</option>
                </select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="comment" className="text-workspace-400 font-bold uppercase text-[10px]">
                  {t("feedback_comment")}
                </Label>
                <Input
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={locale === "ne" ? "उदा. पाहुनाले कोठाको दृश्य मन पराउनुभयो..." : "e.g. Guest loved the balcony view, smooth service."}
                  className="bg-workspace-900 border-workspace-800 text-workspace-100 rounded-lg h-10"
                />
              </div>
            </div>

            {/* Billing Estimations */}
            <div className="rounded-xl border border-workspace-900 bg-workspace-950 p-4 space-y-2 text-xs">
              <h4 className="font-extrabold text-brand-400 uppercase tracking-wider text-[10px]">{t("invoice_settlement")}</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between text-workspace-400">
                  <span>{t("room_charges")}</span>
                  <span>Rs. {roomTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-workspace-400">
                  <span>{t("additional_charges_sum")}</span>
                  <span>Rs. {additionalTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-white pt-1.5 border-t border-workspace-900">
                  <span>{t("grand_total")}</span>
                  <span className="text-emerald-400">Rs. {grandTotal.toLocaleString()}</span>
                </div>
              </div>
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
              disabled={submitting}
              className="bg-gradient-to-tr from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-lg h-10 px-5 gap-1.5 shadow-lg shadow-emerald-500/10"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  {t("checking_out")}
                </>
              ) : (
                t("confirm_check_out")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
