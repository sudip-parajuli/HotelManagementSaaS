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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
    if (!confirm("Are you sure you want to void this invoice? This action cannot be undone.")) return;
    try {
      await billingApi.voidInvoice(id);
      fetchBillingData();
    } catch (err) {
      console.error(err);
      alert("Cannot void invoice. Check if it's already paid.");
    }
  };

  // Open points redemption drawer
  const openRedeemDrawer = async (invoice: Invoice) => {
    if (!invoice.reservation) {
      alert("Loyalty point redemption is only available for guests with active bookings.");
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
        alert("This guest does not have an active loyalty account.");
      }
    } catch (err) {
      console.error(err);
      alert("Could not load loyalty account.");
    }
  };

  const submitRedeemPoints = async () => {
    if (!loyaltyAccount || !redeemInvoice) return;
    try {
      await crmApi.redeemPoints(loyaltyAccount.id, redeemInvoice.id, redeemPoints);
      alert("Points successfully redeemed and applied as discount.");
      setIsRedeemOpen(false);
      fetchBillingData();
    } catch (err) {
      console.error(err);
      alert("Points redemption failed. Verify point balance limits.");
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
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">Billing & Invoices</h1>
          <p className="text-slate-400 text-sm">Manage itemized bills, tax splits, digital gateways, and loyalty settlements.</p>
        </div>
      </div>

      {/* Daily Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Payments Collected Today</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white">Rs. {Number(summary.total_payments_collected).toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Invoiced Revenue Today</CardTitle>
              <FileText className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white">Rs. {Number(summary.total_invoiced_today).toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">eSewa Settlements Today</CardTitle>
              <Wallet className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white">Rs. {Number(summary.payment_by_method?.esewa ?? "0").toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Invoices Issued</CardTitle>
              <BadgeCent className="h-4 w-4 text-violet-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white">{summary.invoice_count} Bills</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invoice Ledger and Filters */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="border-b border-slate-800/80 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-sm font-semibold text-white">Transactions History ledger</CardTitle>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search invoices, phones..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-950 border-slate-800 text-white w-64 rounded-xl text-xs h-9"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-300 w-40 text-xs h-9 rounded-xl">
                  <Filter className="h-3.5 w-3.5 text-slate-500 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-slate-900 text-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="voided">Voided</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-slate-300 text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-left font-medium tracking-wider">
                <tr>
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Guest</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-right">Paid</th>
                  <th className="p-4 text-right">Balance Due</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center p-8 text-slate-500">
                      Loading billing records...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center p-8 text-slate-500">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-4 font-mono font-semibold text-slate-200">{inv.invoice_number}</td>
                      <td className="p-4 capitalize">{inv.invoice_type}</td>
                      <td className="p-4">
                        {inv.reservation ? (
                          <div>
                            <p className="font-semibold text-slate-200">{(inv.reservation as any).guest?.full_name}</p>
                            <p className="text-[10px] text-slate-500">{(inv.reservation as any).guest?.phone}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold text-slate-200">{inv.walk_in_guest_name || "Walk-In Guest"}</p>
                            <p className="text-[10px] text-slate-500">{inv.walk_in_guest_phone || "N/A"}</p>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono font-semibold text-white">Rs. {Number(inv.total_amount).toLocaleString()}</td>
                      <td className="p-4 text-right font-mono text-emerald-400">Rs. {Number(inv.paid_amount).toLocaleString()}</td>
                      <td className="p-4 text-right font-mono text-rose-400">Rs. {Number(inv.balance_due).toLocaleString()}</td>
                      <td className="p-4">
                        <Badge className={`${getStatusBadgeColor(inv.status)} border text-[10px] uppercase font-semibold`}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-slate-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-center space-x-1.5 whitespace-nowrap">
                        {inv.status !== "paid" && inv.status !== "voided" && (
                          <>
                            <Button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setIsPayOpen(true);
                              }}
                              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 px-3 py-1 h-7 text-[10px] font-semibold"
                            >
                              Settle
                            </Button>

                            <Button
                              onClick={() => openRedeemDrawer(inv)}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 h-7 text-[10px] font-semibold"
                            >
                              Redeem Points
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => window.open(billingApi.getInvoicePdfUrl(inv.id), "_blank")}
                          className="border-slate-800 hover:bg-slate-800 text-slate-300 px-2.5 py-1 h-7 text-[10px]"
                        >
                          <Printer className="h-3 w-3 mr-1" /> PDF
                        </Button>
                        {inv.status !== "paid" && inv.status !== "voided" && (
                          <Button
                            variant="destructive"
                            onClick={() => handleVoidInvoice(inv.id)}
                            className="bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-slate-950 px-2.5 py-1 h-7 text-[10px]"
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
          <DialogContent className="bg-slate-950 border-slate-900 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <BadgeCent className="h-5 w-5 text-purple-400" />
                Redeem Loyalty Points
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Redeem points for invoice credit. 100 points = NPR 50 discount.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Guest Name:</span>
                  <span className="font-semibold text-white">{loyaltyAccount.guest.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Points Balance:</span>
                  <span className="font-semibold text-purple-400">{loyaltyAccount.points_balance} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Tier Status:</span>
                  <span className="font-semibold text-cyan-400 capitalize">{loyaltyAccount.tier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Invoice Due:</span>
                  <span className="font-semibold text-rose-400">Rs. {Number(redeemInvoice.balance_due).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Points to Redeem</label>
                <Input
                  type="number"
                  min={100}
                  step={100}
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(Number(e.target.value))}
                  className="bg-slate-950 border-slate-800 text-white"
                />
                <p className="text-[10px] text-slate-500">
                  Value: NPR {redeemPoints * 0.5} discount on subtotal.
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsRedeemOpen(false)} className="w-1/2 border-slate-800 hover:bg-slate-800 text-slate-300">
                  Cancel
                </Button>
                <Button onClick={submitRedeemPoints} className="w-1/2 bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                  Apply Discount
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
