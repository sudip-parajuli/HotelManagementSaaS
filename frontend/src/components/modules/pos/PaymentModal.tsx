import React, { useState, useEffect } from "react";
import { CreditCard, Banknote, Home, QrCode, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { frontdeskApi } from "@/lib/api/frontdesk";
import type { Reservation } from "@/lib/types";
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (method: "cash" | "card" | "room" | "esewa" | "khalti" | "fonepay", reservationId?: number) => void;
  totalAmount: number;
  isSubmitting: boolean;
}

export function PaymentModal({ isOpen, onClose, onConfirm, totalAmount, isSubmitting }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<"cash" | "card" | "room" | "esewa" | "khalti" | "fonepay">("cash");
  const [inHouseList, setInHouseList] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null);

  const t = useTranslations("POS");
  const tData = useTransData();
  const locale = useLocale();

  // Fetch in-house guests when room charge is selected or modal opens
  useEffect(() => {
    if (isOpen && selectedMethod === "room") {
      setLoadingReservations(true);
      frontdeskApi.getTodayStats()
        .then((res) => {
          setInHouseList(res.data.in_house || []);
        })
        .catch((err) => {
          console.error("Failed to load in-house reservations", err);
        })
        .finally(() => {
          setLoadingReservations(false);
        });
    }
  }, [isOpen, selectedMethod]);

  const filteredReservations = inHouseList.filter((res) => {
    const term = searchQuery.toLowerCase();
    const guestName = `${res.guest.first_name} ${res.guest.last_name}`.toLowerCase();
    const roomNo = res.room?.room_number?.toLowerCase() || "";
    return guestName.includes(term) || roomNo.includes(term);
  });

  const handleSubmit = () => {
    if (selectedMethod === "room") {
      if (!selectedReservationId) {
        alert(
          locale === "ne"
            ? "कृपया शुल्क प्रविष्ट गर्न होटल भित्र बस्ने सक्रिय पाहुना कोठा छान्नुहोस्।"
            : "Please select an active check-in guest room for posting charge."
        );
        return;
      }
      onConfirm("room", selectedReservationId);
    } else {
      onConfirm(selectedMethod);
    }
  };

  const paymentMethods = [
    { id: "cash", label: tData("cash"), icon: Banknote, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/50", disabled: false },
    { id: "card", label: tData("card"), icon: CreditCard, color: "text-brand-400 bg-brand-500/10 border-brand-500/20 hover:border-brand-500/50", disabled: false },
    { id: "room", label: tData("room_charge"), icon: Home, color: "text-amber-400 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/50", disabled: false },
    { id: "fonepay", label: locale === "ne" ? "फोनपे क्यूआर" : "Fonepay QR", icon: QrCode, color: "text-red-400 bg-red-500/10 border-red-500/20 hover:border-red-500/50", disabled: true, tag: locale === "ne" ? "चाँडै आउँदैछ" : "Coming Soon" },
    { id: "esewa", label: tData("esewa"), icon: QrCode, color: "text-green-400 bg-green-500/10 border-green-500/20 hover:border-green-500/50", disabled: false },
    { id: "khalti", label: tData("khalti"), icon: QrCode, color: "text-brand-400 bg-brand-500/10 border-brand-500/20 hover:border-brand-500/50", disabled: false },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Backdrop override to ensure premium look */}
      <DialogContent className="sm:max-w-[500px] bg-workspace-950/95 border-workspace-900 text-workspace-100 backdrop-blur-xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r text-foreground flex justify-between items-center">
            <span>{locale === "ne" ? "POS भुक्तानी फर्छ्यौट" : "Settle POS Payment"}</span>
          </DialogTitle>
          <DialogDescription className="text-workspace-400 text-sm">
            {locale === "ne" ? (
              <>जम्मा <span className="font-bold text-brand-400">Rs. {totalAmount.toFixed(2)}</span> को अर्डरको लागि भुक्तानी विधि छान्नुहोस्</>
            ) : (
              <>Select settlement type for order totaling <span className="font-bold text-brand-400">Rs. {totalAmount.toFixed(2)}</span></>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Method Selection Grid */}
          <div className="grid grid-cols-3 gap-3">
            {paymentMethods.map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMethod === m.id;
              const isDisabled = m.disabled;
              return (
                <button
                  key={m.id}
                  disabled={isDisabled}
                  onClick={() => {
                    if (isDisabled) return;
                    setSelectedMethod(m.id as any);
                  }}
                  className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-medium transition-all duration-200 relative ${
                    isDisabled
                      ? "opacity-40 cursor-not-allowed bg-workspace-950 border-workspace-950 text-workspace-600"
                      : isSelected
                      ? "ring-2 ring-brand-500/70 border-brand-500 bg-brand-500/5 shadow-md shadow-brand-500/5"
                      : "opacity-75 hover:opacity-100 " + m.color
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{m.label}</span>
                  {m.tag && (
                    <span className="text-[8px] text-red-500 font-bold block mt-0.5">{m.tag}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Conditional UI: Room Charge search */}
          {selectedMethod === "room" && (
            <div className="space-y-3 p-4 bg-workspace-900/40 border border-workspace-800/80 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="room-search" className="text-xs text-workspace-400 font-semibold uppercase tracking-wider">
                {locale === "ne" ? "होटल भित्र बस्ने सक्रिय पाहुना कोठा छान्नुहोस्" : "Select Active In-House Guest Room"}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-workspace-500" />
                <Input
                  id="room-search"
                  placeholder={locale === "ne" ? "कोठा नम्बर वा पाहुनाको नाम खोज्नुहोस्..." : "Search room number or guest name..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-workspace-950 border-workspace-800 text-sm text-workspace-200"
                />
              </div>

              <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 mt-2 scrollbar-thin scrollbar-thumb-slate-800">
                {loadingReservations ? (
                  <div className="text-center py-6 text-xs text-workspace-500 animate-pulse">
                    {locale === "ne" ? "भरिएका कोठाहरू लोड हुँदैछ..." : "Loading occupied rooms..."}
                  </div>
                ) : filteredReservations.length === 0 ? (
                  <div className="text-center py-6 text-xs text-workspace-500">
                    {locale === "ne" ? "कुनै सक्रिय चेक-इन पाहुना फेला परेन।" : "No active check-in guest found."}
                  </div>
                ) : (
                  filteredReservations.map((res) => {
                    const isSelected = selectedReservationId === res.id;
                    return (
                      <button
                        key={res.id}
                        onClick={() => setSelectedReservationId(res.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-all ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                            : "bg-workspace-950 border-workspace-900 hover:border-workspace-800 text-workspace-300"
                        }`}
                      >
                        <div>
                          <span className="font-semibold text-workspace-100">
                            {locale === "ne" ? `कोठा ${res.room?.room_number || "N/A"}` : `Room ${res.room?.room_number || "N/A"}`}
                          </span>
                          <span className="text-workspace-400 block mt-0.5">
                            {res.guest.first_name} {res.guest.last_name}
                          </span>
                        </div>
                        <span className="text-[10px] text-workspace-500">
                          {locale === "ne" ? `बुकिङ आईडी: #${res.id}` : `Res ID: #${res.id}`}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end border-t border-workspace-900 pt-4 mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="border-workspace-800 text-workspace-400 hover:bg-workspace-900 hover:text-workspace-100 text-xs"
          >
            {locale === "ne" ? "रद्द" : "Cancel"}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (selectedMethod === "room" && !selectedReservationId)}
            className="bg-brand-600 text-white hover:bg-brand-500 font-semibold transition-all px-6 text-xs"
          >
            {isSubmitting ? (locale === "ne" ? "प्रशोधन हुँदैछ..." : "Processing...") : (locale === "ne" ? "भुक्तानी सम्पन्न" : "Complete Payment")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
