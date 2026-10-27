"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { billingApi } from "@/lib/api/billing";
import { paymentsApi } from "@/lib/api/payments";
import type { Invoice } from "@/lib/types";
import { DollarSign, Landmark, Wallet, QrCode, ArrowRight, Loader2 } from "lucide-react";
import { useLocale } from "next-intl";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onPaymentSuccess: () => void;
}

type PaymentMethodType = "cash" | "card" | "esewa" | "khalti" | "fonepay" | "bank_transfer" | "credit";

const DIGITAL_METHODS: PaymentMethodType[] = ["esewa", "khalti", "fonepay", "card"];

const TRANSLATIONS = {
  en: {
    title: "Settle Invoice -",
    desc: "Select standard cash or digital payment options to reconcile balances due.",
    cash: "Cash / Direct",
    card: "Credit / Debit Card",
    esewa: "eSewa epay",
    khalti: "Khalti Wallet",
    fonepay: "Fonepay QR",
    bank_wire: "Bank Wire",
    on_credit: "On Credit",
    digital_rebate_banner: "10% VAT Rebate applies",
    net_payable: "Net Payable",
    gross_total: "Gross Total",
    vat_rebate: "VAT Rebate (10%)",
    settlement_amount: "Settlement Amount (NPR)",
    ref_num: "Reference Number",
    notes: "Notes / Remarks",
    notes_placeholder: "Record additional transaction context...",
    save_payment: "Save Payment",
    esewa_redirect: "eSewa ePay Redirect",
    esewa_desc: "You will be redirected to eSewa's secure payment sandbox. Upon successful login and verification, you will automatically be returned to reconcile the bill.",
    redirect_esewa: "Redirect to eSewa",
    khalti_redirect: "Khalti Wallet Redirect",
    khalti_desc: "Initiates a wallet transaction via Khalti's secure widget. You can make the payment using credit card, mobile banking, or connect your Khalti account directly.",
    redirect_khalti: "Redirect to Khalti",
    fonepay_checkout: "Fonepay QR Merchant Checkout",
    fonepay_desc: "Generate a static checkout QR block. Click verify to simulate scanning completion in sandbox mode.",
    verify_scanning: "Verify Scanning Success",
    generate_qr: "Generate Checkout QR",
    error_manual: "Error saving manual payment.",
    error_esewa: "Could not initiate eSewa checkout.",
    error_khalti: "Could not initiate Khalti checkout.",
    fonepay_pending: "Transaction status is still pending scanning.",
    verify_failed: "Verification request failed."
  },
  ne: {
    title: "बीजक भुक्तानी फर्छ्यौट -",
    desc: "बाँकी बक्यौता रकम मिलान गर्न नगद वा डिजिटल भुक्तानी विकल्पहरू छान्नुहोस्।",
    cash: "नगद / प्रत्यक्ष",
    card: "क्रेडिट / डेबिट कार्ड",
    esewa: "ईसेवा (eSewa)",
    khalti: "खल्ती (Khalti)",
    fonepay: "फोनपे (Fonepay)",
    bank_wire: "बैंक ट्रान्सफर",
    on_credit: "उधारोमा (Credit)",
    digital_rebate_banner: "१०% VAT फिर्ता लागू हुन्छ",
    net_payable: "खुद देय रकम",
    gross_total: "कुल जम्मा",
    vat_rebate: "VAT फिर्ता (१०%)",
    settlement_amount: "फर्छ्यौट रकम (रु.)",
    ref_num: "सन्दर्भ नम्बर",
    notes: "थप टिपोट / कैफियत",
    notes_placeholder: "थप कारोबार विवरणहरू रेकर्ड गर्नुहोस्...",
    save_payment: "भुक्तानी बचत गर्नुहोस्",
    esewa_redirect: "ईसेवा (eSewa) रिडाइरेक्ट",
    esewa_desc: "तपाईंलाई ईसेवाको सुरक्षित भुक्तानी पोर्टलमा लगिनेछ। सफल लगइन र प्रमाणीकरण पछि, तपाईं स्वतः बिल फर्छ्यौट गर्न फिर्ता आउनुहुनेछ।",
    redirect_esewa: "ईसेवा (eSewa) मा जानुहोस्",
    khalti_redirect: "खल्ती (Khalti) रिडाइरेक्ट",
    khalti_desc: "खल्तीको सुरक्षित भुक्तानी विजेट मार्फत मोबाइल बैंकिङ, कार्ड वा खल्ती खाता जडान गरी भुक्तानी गर्नुहोस्।",
    redirect_khalti: "खल्ती (Khalti) मा जानुहोस्",
    fonepay_checkout: "फोनपे (Fonepay) QR मर्चेन्ट भुक्तानी",
    fonepay_desc: "भुक्तानीका लागि क्युआर (QR) कोड सिर्जना गर्नुहोस्। प्रमाणीकरण गर्न 'प्रमाणित गर्नुहोस्' थिचनुहोस्।",
    verify_scanning: "स्क्यान प्रमाणीकरण गर्नुहोस्",
    generate_qr: "QR कोड सिर्जना गर्नुहोस्",
    error_manual: "नगद भुक्तानी दर्ता गर्दा त्रुटि भयो।",
    error_esewa: "ईसेवा भुक्तानी प्रक्रिया सुरु गर्न सकिएन।",
    error_khalti: "खल्ती भुक्तानी प्रक्रिया सुरु गर्न सकिएन।",
    fonepay_pending: "कारोबारको स्थिति अझै स्क्यान हुन बाँकी छ।",
    verify_failed: "प्रमाणीकरण अनुरोध असफल भयो।"
  }
};

export default function PaymentModal({ isOpen, onClose, invoice, onPaymentSuccess }: PaymentModalProps) {
  const locale = useLocale() as "en" | "ne";
  const tr = TRANSLATIONS[locale] || TRANSLATIONS.en;

  const [method, setMethod] = useState<PaymentMethodType>("cash");
  const [amount, setAmount] = useState(
    DIGITAL_METHODS.includes(method) && invoice.net_payable_amount
      ? invoice.net_payable_amount
      : invoice.balance_due
  );

  // Update amount when method changes
  React.useEffect(() => {
    setAmount(
      DIGITAL_METHODS.includes(method) && invoice.net_payable_amount
        ? invoice.net_payable_amount
        : invoice.balance_due
    );
  }, [method, invoice.balance_due, invoice.net_payable_amount]);
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
      alert(tr.error_manual);
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
            input.value = value as string;
            form.appendChild(input);
          }
        });

        document.body.appendChild(form);
        form.submit();
      }
    } catch (err) {
      console.error("eSewa redirection failed", err);
      alert(tr.error_esewa);
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
      alert(tr.error_khalti);
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
        alert(tr.fonepay_pending);
      }
    } catch (err) {
      console.error(err);
      alert(tr.verify_failed);
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
            {tr.title} {invoice.invoice_number}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            {tr.desc}
          </DialogDescription>
        </DialogHeader>

        {/* Payment Methods Grid */}
        <div className="grid grid-cols-3 gap-2 py-3">
          {[
            { id: "cash", label: tr.cash, icon: DollarSign, color: "hover:border-emerald-500 hover:text-emerald-400" },
            { id: "esewa", label: tr.esewa, icon: Wallet, color: "hover:border-green-500 hover:text-green-400" },
            { id: "khalti", label: tr.khalti, icon: Wallet, color: "hover:border-purple-500 hover:text-purple-400" },
            { id: "fonepay", label: tr.fonepay, icon: QrCode, color: "hover:border-rose-500 hover:text-rose-400" },
            { id: "card", label: tr.card, icon: Landmark, color: "hover:border-sky-500 hover:text-sky-400" },
            { id: "bank_transfer", label: tr.bank_wire, icon: Landmark, color: "hover:border-cyan-500 hover:text-cyan-400" },
            { id: "credit", label: tr.on_credit, icon: Landmark, color: "hover:border-amber-500 hover:text-amber-400" }
          ].map((m) => {
            const Icon = m.icon;
            const active = method === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMethod(m.id as PaymentMethodType);
                  setFonepayQr(null);
                  setTxId(null);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all relative ${
                  active
                    ? "bg-slate-900 border-cyan-500 text-cyan-400 shadow-md shadow-cyan-500/10"
                    : "bg-slate-950 border-slate-900 text-slate-400 " + m.color
                }`}
              >
                <Icon className="h-5 w-5 mb-1.5" />
                <span className="text-[10px] font-medium tracking-wide">{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Digital VAT Rebate Banner */}
        {DIGITAL_METHODS.includes(method) && Number(invoice.digital_rebate_amount) > 0 && (
          <div className="bg-teal-950/60 border border-teal-700/40 rounded-xl px-4 py-2.5 mb-2 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-teal-400 font-semibold">
              <span className="text-sm">✦</span> {tr.digital_rebate_banner}
            </div>
            <div className="flex justify-between text-slate-400">
              <span>{tr.gross_total}</span>
              <span className="font-mono text-white">NPR {Number(invoice.total_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-teal-400">
              <span>{tr.vat_rebate}</span>
              <span className="font-mono">-NPR {Number(invoice.digital_rebate_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-teal-700/30 pt-1 font-semibold text-teal-300">
              <span>{tr.net_payable}</span>
              <span className="font-mono">NPR {Number(invoice.net_payable_amount).toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Context-Based Settlement Forms */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 min-h-[200px] flex flex-col justify-between">
          {method === "cash" || method === "bank_transfer" || method === "credit" ? (
            <form onSubmit={handleManualPaymentSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">{tr.settlement_amount}</Label>
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
                  <Label className="text-xs text-slate-400">{tr.ref_num}</Label>
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
                <Label className="text-xs text-slate-400">{tr.notes}</Label>
                <Textarea
                  placeholder={tr.notes_placeholder}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white rounded-lg h-16 resize-none"
                />
              </div>
              <Button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : tr.save_payment}
              </Button>
            </form>
          ) : method === "esewa" ? (
            <div className="flex flex-col items-center justify-between h-full gap-4 text-center py-2">
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-white">{tr.esewa_redirect}</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  {tr.esewa_desc}
                </p>
              </div>
<div className="w-full flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-900 text-xs font-mono text-slate-400">
                <span>{locale === "ne" ? "रकम: रु. " : "Amount: NPR "}{invoice.net_payable_amount ?? invoice.balance_due}</span>
                <span>{locale === "ne" ? "मर्चेन्ट: EPAYTEST" : "Merchant: EPAYTEST"}</span>
              </div>
              <Button onClick={handleEsewaCheckout} className="w-full bg-green-500 hover:bg-green-600 text-slate-950 font-semibold" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : tr.redirect_esewa}
              </Button>
            </div>
          ) : method === "khalti" ? (
            <div className="flex flex-col items-center justify-between h-full gap-4 text-center py-2">
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-white">{tr.khalti_redirect}</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  {tr.khalti_desc}
                </p>
              </div>
<div className="w-full flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-900 text-xs font-mono text-slate-400">
                <span>{locale === "ne" ? "रकम: रु. " : "Amount: NPR "}{invoice.net_payable_amount ?? invoice.balance_due}</span>
                <span>{locale === "ne" ? "बीजक (Invoice): " : "Invoice: "}{invoice.invoice_number}</span>
              </div>
              <Button onClick={handleKhaltiCheckout} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : tr.redirect_khalti}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-between h-full gap-4 text-center py-1">
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-white">{tr.fonepay_checkout}</h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  {tr.fonepay_desc}
                </p>
              </div>
              
              {fonepayQr ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                    <img src={fonepayQr} alt="Fonepay QR Code" className="h-32 w-32" />
                  </div>
                  <Button onClick={handleVerifyFonepayPolling} className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs px-6 py-1.5" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : tr.verify_scanning}
                  </Button>
                </div>
              ) : (
                <Button onClick={handleFonepayInitiation} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : tr.generate_qr}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
