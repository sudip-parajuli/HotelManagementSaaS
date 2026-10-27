"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { billingApi } from "@/lib/api/billing";
import { crmApi } from "@/lib/api/crm";
import type { Invoice, LoyaltyAccount } from "@/lib/types";
import { FileText, Printer, ShieldAlert, BadgeCent, Search, Filter, HelpCircle, DollarSign, Wallet, QrCode } from "lucide-react";
import PaymentModal from "@/components/modules/billing/PaymentModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const t = useTranslations("Billing");
  const tCommon = useTranslations("Common");
  const tData = useTransData();
  const locale = useLocale();

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPayOpen, setIsPayOpen] = useState(false);

  // Redemption Drawer
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [redeemInvoice, setRedeemInvoice] = useState<Invoice | null>(null);
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(100);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;

      const [invRes, sumRes] = await Promise.all([
        billingApi.listInvoices(params),
        billingApi.getDailySummary(),
      ]);

      setInvoices(invRes.data.results);
      setSummary(sumRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [search, statusFilter]);

  const handleVoidInvoice = async (id: number) => {
    const confirmMsg = t("void_confirm");
    if (!confirm(confirmMsg)) return;
    try {
      await billingApi.voidInvoice(id);
      fetchBillingData();
    } catch (err) {
      console.error(err);
      alert(t("void_error"));
    }
  };

  // Open points redemption drawer
  const openRedeemDrawer = async (invoice: Invoice) => {
    if (!invoice.reservation) {
      alert(t("active_booking_only"));
      return;
    }
    setRedeemInvoice(invoice);
    try {
      const guestId = (invoice.reservation as any)?.guest?.id;
      // Fetch loyalty account by guest
      const accountsRes = await crmApi.listLoyaltyAccounts({ search: (invoice.reservation as any)?.guest?.phone });
      const account = accountsRes.data.results.find((a: any) => a.guest.id === guestId);
      if (account) {
        setLoyaltyAccount(account);
        setIsRedeemOpen(true);
      } else {
        alert(t("active_loyalty_only"));
      }
    } catch (err) {
      console.error(err);
      alert(t("loyalty_load_error"));
    }
  };

  const submitRedeemPoints = async () => {
    if (!loyaltyAccount || !redeemInvoice) return;
    try {
      await crmApi.redeemPoints(loyaltyAccount.id, redeemInvoice.id, redeemPoints);
      alert(t("redeem_success"));
      setIsRedeemOpen(false);
      fetchBillingData();
    } catch (err) {
      console.error(err);
      alert(t("redeem_failed"));
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "partially_paid":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "unpaid":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "voided":
        return "bg-workspace-500/10 text-workspace-400 border-workspace-500/20";
      default:
        return "bg-workspace-500/10 text-workspace-400 border-workspace-500/20";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("title")}</h1>
          <p className="text-workspace-400 text-sm">{t("subtitle")}</p>
        </div>
      </div>

      {/* Daily Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-workspace-900/60 border-workspace-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-workspace-400 uppercase tracking-wider">
                {t("payments_collected_today")}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">
                {locale === "ne" ? "रु " : "Rs. "}
                {Number(summary.total_payments_collected).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-workspace-900/60 border-workspace-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-workspace-400 uppercase tracking-wider">
                {t("invoiced_revenue_today")}
              </CardTitle>
              <FileText className="h-4 w-4 text-brand-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">
                {locale === "ne" ? "रु " : "Rs. "}
                {Number(summary.total_invoiced_today).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-workspace-900/60 border-workspace-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-workspace-400 uppercase tracking-wider">
                {t("esewa_settlements_today")}
              </CardTitle>
              <Wallet className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">
                {locale === "ne" ? "रु " : "Rs. "}
                {Number(summary.payment_by_method?.esewa ?? "0").toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-workspace-900/60 border-workspace-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-workspace-400 uppercase tracking-wider">
                {t("invoices_issued")}
              </CardTitle>
              <BadgeCent className="h-4 w-4 text-violet-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">
                {locale === "ne" ? `${summary.invoice_count} बिलहरू` : `${summary.invoice_count} Bills`}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invoice Ledger and Filters */}
      <Card className="bg-workspace-900/60 border-workspace-800">
        <CardHeader className="border-b border-workspace-800/80 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-sm font-semibold text-foreground">
              {t("transactions_ledger")}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-workspace-500" />
                <Input
                  placeholder={t("search_placeholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-workspace-950 border-workspace-800 text-white w-64 rounded-xl text-xs h-9"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                <SelectTrigger className="bg-workspace-950 border-workspace-800 text-workspace-300 w-40 text-xs h-9 rounded-xl">
                  <Filter className="h-3.5 w-3.5 text-workspace-500 mr-2" />
                  <SelectValue placeholder={t("all_status")}>
                    {(value) => (value ? (value === "all" ? t("all_status") : tData(value)) : t("all_status"))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-workspace-950 border-slate-905 text-foreground">
                  <SelectItem value="all">{t("all_status")}</SelectItem>
                  <SelectItem value="unpaid">{tData("unpaid")}</SelectItem>
                  <SelectItem value="partially_paid">{tData("partially_paid")}</SelectItem>
                  <SelectItem value="paid">{tData("paid")}</SelectItem>
                  <SelectItem value="voided">{tData("voided")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-workspace-300 text-xs">
              <thead className="bg-workspace-950/80 border-b border-workspace-800 text-workspace-400 text-left font-medium tracking-wider">
                <tr>
                  <th className="p-4">{t("invoice_no")}</th>
                  <th className="p-4">{t("type")}</th>
                  <th className="p-4">{t("guest")}</th>
                  <th className="p-4 text-right">{t("total")}</th>
                  <th className="p-4 text-right">{t("paid")}</th>
                  <th className="p-4 text-right">{t("balance")}</th>
                  <th className="p-4">{t("status")}</th>
                  <th className="p-4">{t("date")}</th>
                  <th className="p-4 text-center">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-workspace-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center p-8 text-workspace-500">
                      {locale === "ne" ? "बिलिङ विवरणहरू लोड हुँदैछ..." : "Loading billing records..."}
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center p-8 text-workspace-500">
                      {locale === "ne" ? "कुनै बिल फेला परेन।" : "No invoices found."}
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-workspace-900/40 transition-colors">
                      <td className="p-4 font-mono font-semibold text-workspace-200">{inv.invoice_number}</td>
                      <td className="p-4 capitalize">{tData(inv.invoice_type)}</td>
                      <td className="p-4">
                        {inv.reservation ? (
                          <div>
                            <p className="font-semibold text-workspace-200">{(inv.reservation as any).guest?.full_name}</p>
                            <p className="text-[10px] text-workspace-500">{(inv.reservation as any).guest?.phone}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold text-workspace-200">{inv.walk_in_guest_name || (locale === "ne" ? "वाक-इन पाहुना" : "Walk-In Guest")}</p>
                            <p className="text-[10px] text-workspace-500">{inv.walk_in_guest_phone || "N/A"}</p>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono font-semibold text-foreground">
                        {locale === "ne" ? "रु " : "Rs. "}
                        {Number(inv.total_amount).toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-mono text-emerald-400">
                        {locale === "ne" ? "रु " : "Rs. "}
                        {Number(inv.paid_amount).toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-mono text-rose-400">
                        {locale === "ne" ? "रु " : "Rs. "}
                        {Number(inv.balance_due).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <Badge className={`${getStatusBadgeColor(inv.status)} border text-[10px] uppercase font-semibold`}>
                          {tData(inv.status)}
                        </Badge>
                      </td>
                      <td className="p-4 text-workspace-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-center space-x-1.5 whitespace-nowrap">
                        {inv.status !== "paid" && inv.status !== "voided" && (
                          <>
                            <Button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setIsPayOpen(true);
                              }}
                              className="bg-brand-500 hover:bg-brand-600 text-workspace-950 px-3 py-1 h-7 text-[10px] font-semibold"
                            >
                              {t("settle")}
                            </Button>

                            <Button
                              onClick={() => openRedeemDrawer(inv)}
                              className="bg-brand-600 hover:bg-brand-700 text-white px-2 py-1 h-7 text-[10px] font-semibold"
                            >
                              {t("redeem_points")}
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => window.open(billingApi.getInvoicePdfUrl(inv.id), "_blank")}
                          className="border-workspace-800 hover:bg-workspace-800 text-workspace-300 px-2.5 py-1 h-7 text-[10px]"
                        >
                          <Printer className="h-3 w-3 mr-1" /> PDF
                        </Button>
                        {inv.status !== "paid" && inv.status !== "voided" && (
                          <Button
                            variant="destructive"
                            onClick={() => handleVoidInvoice(inv.id)}
                            className="bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-workspace-950 px-2.5 py-1 h-7 text-[10px]"
                          >
                            <ShieldAlert className="h-3 w-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Settlement Modal */}
      {selectedInvoice && (
        <PaymentModal
          isOpen={isPayOpen}
          onClose={() => {
            setIsPayOpen(false);
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
          onPaymentSuccess={fetchBillingData}
        />
      )}

      {/* Loyalty Redemption Dialog */}
      {isRedeemOpen && loyaltyAccount && redeemInvoice && (
        <Dialog open={isRedeemOpen} onOpenChange={setIsRedeemOpen}>
          <DialogContent className="bg-workspace-950 border-workspace-900 text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <BadgeCent className="h-5 w-5 text-brand-400" />
                {t("redeem_points")}
              </DialogTitle>
              <DialogDescription className="text-workspace-400 text-xs">
                {locale === "ne"
                  ? "रसिद भुक्तानी क्रेडिटको लागि पाहुनाको अङ्क साट्नुहोस्। १०० अङ्क = रु ५० छुट।"
                  : "Redeem points for invoice credit. 100 points = NPR 50 discount."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="bg-workspace-900/60 border border-slate-850 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-workspace-400">{t("guest_name")}</span>
                  <span className="font-semibold text-foreground">{loyaltyAccount.guest.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-workspace-400">{t("points_balance")}</span>
                  <span className="font-semibold text-brand-400">{loyaltyAccount.points_balance} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-workspace-400">{t("tier_status")}</span>
                  <span className="font-semibold text-brand-400 capitalize">{tData(loyaltyAccount.tier)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-workspace-400">{t("invoice_due")}</span>
                  <span className="font-semibold text-rose-400">
                    {locale === "ne" ? "रु " : "Rs. "}
                    {Number(redeemInvoice.balance_due).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-workspace-400">{t("points_to_redeem")}</label>
                <Input
                  type="number"
                  min={100}
                  step={100}
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(Number(e.target.value))}
                  className="bg-workspace-950 border-workspace-800 text-white"
                />
                <p className="text-[10px] text-workspace-500">
                  {t("redeem_value_desc", { val: redeemPoints * 0.5 })}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsRedeemOpen(false)} className="w-1/2 border-workspace-800 hover:bg-workspace-800 text-workspace-300">
                  {tCommon("cancel")}
                </Button>
                <Button onClick={submitRedeemPoints} className="w-1/2 bg-brand-600 hover:bg-brand-700 text-white font-semibold">
                  {locale === "ne" ? "छुट लागू गर्नुहोस्" : "Apply Discount"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
