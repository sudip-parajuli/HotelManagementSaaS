"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { billingApi } from "@/lib/api/billing";
import { paymentsApi } from "@/lib/api/payments";
import type { Invoice } from "@/lib/types";
import { DollarSign, Landmark, Wallet, QrCode, ArrowRight, Loader2 } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onPaymentSuccess: () => void;
}

type PaymentMethodType = "cash" | "esewa" | "khalti" | "fonepay" | "bank_transfer" | "credit";

export default function PaymentModal({ isOpen, onClose, invoice, onPaymentSuccess }: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethodType>("cash");
  const [amount, setAmount] = useState(invoice.balance_due);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fonepayQr, setFonepayQr] = useState<string | null>(null);
  const [txId, setTxId] = useState<number | null>(null);

  // Cash / Manual Payment Submit
  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      await billingApi.recordPayment(invoice.id, {
        amount: amount.toString(),
        payment_method: method,
        reference_number: reference,
        notes,
      });
      onPaymentSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error saving manual payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // eSewa Form submit redirect
  const handleEsewaCheckout = async () => {
    setIsSubmitting(true);
    try {
      const res = await paymentsApi.initiatePayment(invoice.id, "esewa");
      if (res.data.esewa_payload) {
        const payload = res.data.esewa_payload;
        // Create dynamic hidden form to POST parameters to eSewa epay gateway v2
        const form = document.createElement("form");
        form.method = "POST";
        form.action = payload.gateway_url;

        Object.entries(payload).forEach(([key, value]) => {
          if (key !== "gateway_url") {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = value;
            form.appendChild(input);
          }
        });

        document.body.appendChild(form);
        form.submit();
      }
    } catch (err) {
      console.error("eSewa redirection failed", err);
      alert("Could not initiate eSewa checkout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Khalti API redirect
  const handleKhaltiCheckout = async () => {
    setIsSubmitting(true);
    try {
      const res = await paymentsApi.initiatePayment(invoice.id, "khalti");
      if (res.data.payment_url) {
        window.location.href = res.data.payment_url;
      }
    } catch (err) {
      console.error("Khalti redirection failed", err);
      alert("Could not initiate Khalti checkout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fonepay QR initiation
  const handleFonepayInitiation = async () => {
    setIsSubmitting(true);
    try {
      const res = await paymentsApi.initiatePayment(invoice.id, "fonepay");
      if (res.data.qr_code_placeholder) {
        setFonepayQr(res.data.qr_code_placeholder);
        setTxId(res.data.transaction_id);
      }
    } catch (err) {
      console.error("Fonepay QR generation failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Poll / simulate scanner verify click
  const handleVerifyFonepayPolling = async () => {
    if (!txId) return;
    setIsSubmitting(true);
    try {
      const res = await paymentsApi.verifyPolling(txId);
      if (res.data.status === "success") {
        onPaymentSuccess();
        onClose();
      } else {
        alert("Transaction status is still pending scanning.");
      }
    } catch (err) {
      console.error(err);
      alert("Verification request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-950 border-slate-900 text-white max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-cyan-400" />
            Settle Invoice - {invoice.invoice_number}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Select standard cash or digital payment options to reconcile balances due.
          </DialogDescription>
        </DialogHeader>

        {/* Payment Methods Grid */}
        <div className="grid grid-cols-3 gap-2 py-4">
          {[
            { id: "cash", label: "Cash / Direct", icon: DollarSign, color: "hover:border-emerald-500 hover:text-emerald-400" },
            { id: "esewa", label: "eSewa epay", icon: Wallet, color: "hover:border-green-500 hover:text-green-400" },
            { id: "khalti", label: "Khalti Wallet", icon: Wallet, color: "hover:border-purple-500 hover:text-purple-400" },
            { id: "fonepay", label: "Fonepay QR", icon: QrCode, color: "hover:border-rose-500 hover:text-rose-400", disabled: true, tag: "Coming Soon" },
            { id: "bank_transfer", label: "Bank Wire", icon: Landmark, color: "hover:border-cyan-500 hover:text-cyan-400" },
            { id: "credit", label: "On Credit", icon: Landmark, color: "hover:border-amber-500 hover:text-amber-400" }
          ].map((m) => {
            const Icon = m.icon;
            const active = method === m.id;
            const isDisabled = "disabled" in m && m.disabled;
            return (
              <button
                key={m.id}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  if (isDisabled) return;
                  setMethod(m.id as PaymentMethodType);
                  setFonepayQr(null);
                  setTxId(null);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all relative ${
                  isDisabled
                    ? "bg-slate-950/50 border-slate-950 text-slate-600 cursor-not-allowed opacity-50"
                    : active
                    ? "bg-slate-900 border-cyan-500 text-cyan-400 shadow-md shadow-cyan-500/10"
                    : "bg-slate-950 border-slate-900 text-slate-400 " + m.color
                }`}
              >
                <Icon className="h-5 w-5 mb-1.5" />
                <span className="text-[10px] font-medium tracking-wide">
                  {m.label}
                  {m.tag && (
                    <span className="block text-[8px] text-rose-500 font-bold mt-0.5">{m.tag}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Context-Based Settlement Forms */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 min-h-[200px] flex flex-col justify-between">
          {method === "cash" || method === "bank_transfer" || method === "credit" ? (
            <form onSubmit={handleManualPaymentSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Settlement Amount (NPR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white rounded-lg"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Reference Number</Label>
                  <Input
                    type="text"
                    placeholder="TX-XXXX"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Notes / Remarks</Label>
                <Textarea
                  placeholder="Record additional transaction context..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white rounded-lg h-16 resize-none"
                />
              </div>
              <Button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Payment"}
              </Button>
            </form>
          ) : method === "esewa" ? (
            <div className="flex flex-col items-center justify-between h-full gap-4 text-center py-2">
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-white">eSewa ePay Redirect</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  You will be redirected to eSewa's secure payment sandbox. Upon successful login and verification, you will automatically be returned to reconcile the bill.
                </p>
              </div>
              <div className="w-full flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-900 text-xs font-mono text-slate-400">
                <span>Amount: NPR {invoice.balance_due}</span>
                <span>Merchant: EPAYTEST</span>
              </div>
              <Button onClick={handleEsewaCheckout} className="w-full bg-green-500 hover:bg-green-600 text-slate-950 font-semibold" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Redirect to eSewa"}
              </Button>
            </div>
          ) : method === "khalti" ? (
            <div className="flex flex-col items-center justify-between h-full gap-4 text-center py-2">
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-white">Khalti Wallet Redirect</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Initiates a wallet transaction via Khalti's secure widget. You can make the payment using credit card, mobile banking, or connect your Khalti account directly.
                </p>
              </div>
              <div className="w-full flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-900 text-xs font-mono text-slate-400">
                <span>Amount: NPR {invoice.balance_due}</span>
                <span>Invoice: {invoice.invoice_number}</span>
              </div>
              <Button onClick={handleKhaltiCheckout} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Redirect to Khalti"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-between h-full gap-4 text-center py-1">
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-white">Fonepay QR Merchant Checkout</h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  Generate a static checkout QR block. Click verify to simulate scanning completion in sandbox mode.
                </p>
              </div>
              
              {fonepayQr ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                    <img src={fonepayQr} alt="Fonepay QR Code" className="h-32 w-32" />
                  </div>
                  <Button onClick={handleVerifyFonepayPolling} className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs px-6 py-1.5" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : "Verify Scanning Success"}
                  </Button>
                </div>
              ) : (
                <Button onClick={handleFonepayInitiation} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate Checkout QR"}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
