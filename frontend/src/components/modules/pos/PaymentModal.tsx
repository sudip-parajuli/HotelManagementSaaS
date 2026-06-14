import React, { useState, useEffect } from "react";
import { CreditCard, Banknote, Home, QrCode, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { frontdeskApi } from "@/lib/api/frontdesk";
import type { Reservation } from "@/lib/types";

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
        alert("Please select an active check-in guest room for posting charge.");
        return;
      }
      onConfirm("room", selectedReservationId);
    } else {
      onConfirm(selectedMethod);
    }
  };

  const paymentMethods = [
    { id: "cash", label: "Cash", icon: Banknote, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/50" },
    { id: "card", label: "Card", icon: CreditCard, color: "text-blue-400 bg-blue-500/10 border-blue-500/20 hover:border-blue-500/50" },
    { id: "room", label: "Room Charge", icon: Home, color: "text-amber-400 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/50" },
    { id: "fonepay", label: "Fonepay QR", icon: QrCode, color: "text-red-400 bg-red-500/10 border-red-500/20 hover:border-red-500/50" },
    { id: "esewa", label: "eSewa Wallet", icon: QrCode, color: "text-green-400 bg-green-500/10 border-green-500/20 hover:border-green-500/50" },
    { id: "khalti", label: "Khalti Wallet", icon: QrCode, color: "text-purple-400 bg-purple-500/10 border-purple-500/20 hover:border-purple-500/50" },
  ] as const;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Backdrop override to ensure premium look */}
      <DialogContent className="sm:max-w-[500px] bg-slate-950/95 border-slate-900 text-slate-100 backdrop-blur-xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent flex justify-between items-center">
            <span>Settle POS Payment</span>
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            Select settlement type for order totaling <span className="font-bold text-cyan-400">Rs. {totalAmount.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Method Selection Grid */}
          <div className="grid grid-cols-3 gap-3">
            {paymentMethods.map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMethod === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id)}
                  className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-medium transition-all duration-200 ${m.color} ${
                    isSelected 
                      ? "ring-2 ring-cyan-500/70 border-cyan-500 bg-cyan-500/5 shadow-md shadow-cyan-500/5" 
                      : "opacity-75 hover:opacity-100"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Conditional UI: Room Charge search */}
          {selectedMethod === "room" && (
            <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="room-search" className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Select Active In-House Guest Room
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="room-search"
                  placeholder="Search room number or guest name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-950 border-slate-800 text-sm text-slate-200"
                />
              </div>

              <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 mt-2 scrollbar-thin scrollbar-thumb-slate-800">
                {loadingReservations ? (
                  <div className="text-center py-6 text-xs text-slate-500 animate-pulse">
                    Loading occupied rooms...
                  </div>
                ) : filteredReservations.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No active check-in guest found.
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
                            : "bg-slate-950 border-slate-900 hover:border-slate-800 text-slate-300"
                        }`}
                      >
                        <div>
                          <span className="font-semibold text-slate-100">
                            Room {res.room?.room_number || "N/A"}
                          </span>
                          <span className="text-slate-400 block mt-0.5">
                            {res.guest.first_name} {res.guest.last_name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Res ID: #{res.id}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end border-t border-slate-900 pt-4 mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-100"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (selectedMethod === "room" && !selectedReservationId)}
            className="bg-cyan-600 text-white hover:bg-cyan-500 font-semibold transition-all px-6"
          >
            {isSubmitting ? "Processing..." : "Complete Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
