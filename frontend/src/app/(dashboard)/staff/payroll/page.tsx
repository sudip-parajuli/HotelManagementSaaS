"use client";

import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  Plus, 
  Play, 
  CheckCircle2, 
  Printer, 
  Settings, 
  Coins, 
  Trash2, 
  AlertTriangle,
  FolderOpen
} from "lucide-react";
import { payrollApi } from "@/lib/api/payroll";
import { format } from "date-fns";
import type { PayrollPeriod, PayrollEntry, AdjustmentItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function PayrollWizardPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form: Create Period
  const [isNewPeriodOpen, setIsNewPeriodOpen] = useState(false);
  const [newPeriodData, setNewPeriodData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  // Dialog: Edit Entry adjustments
  const [selectedEntryForAdjust, setSelectedEntryForAdjust] = useState<PayrollEntry | null>(null);
  const [allowanceInput, setAllowanceInput] = useState<AdjustmentItem[]>([]);
  const [deductionInput, setDeductionInput] = useState<AdjustmentItem[]>([]);
  const [adjustNotes, setAdjustNotes] = useState("");

  const fetchPeriods = async () => {
    setIsLoading(true);
    try {
      const res = await payrollApi.listPeriods();
      const list = res.data.results || [];
      setPeriods(list);
      // Auto-select first period if none is active
      if (list.length > 0 && !selectedPeriod) {
        setSelectedPeriod(list[0]);
      }
    } catch (err) {
      console.error("Error loading periods", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEntries = async () => {
    if (!selectedPeriod) return;
    try {
      const res = await payrollApi.listEntries({ period: selectedPeriod.id });
      setEntries(res.data.results || []);
    } catch (err) {
      console.error("Error loading entries", err);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [selectedPeriod]);

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await payrollApi.createPeriod(newPeriodData.month, newPeriodData.year);
      setIsNewPeriodOpen(false);
      fetchPeriods();
    } catch (err) {
      console.error("Error creating period", err);
    }
  };

  const handleRunCalculation = async () => {
    if (!selectedPeriod) return;
    try {
      await payrollApi.calculatePeriod(selectedPeriod.id);
      fetchEntries();
      fetchPeriods();
    } catch (err) {
      console.error("Error calculating period", err);
    }
  };

  const handleApprovePeriod = async () => {
    if (!selectedPeriod) return;
    try {
      await payrollApi.approvePeriod(selectedPeriod.id);
      fetchPeriods();
      setSelectedPeriod({ ...selectedPeriod, status: "approved" });
    } catch (err) {
      console.error("Error approving period", err);
    }
  };

  const handlePayPeriod = async () => {
    if (!selectedPeriod) return;
    try {
      await payrollApi.payPeriod(selectedPeriod.id);
      fetchPeriods();
      setSelectedPeriod({ ...selectedPeriod, status: "paid" });
    } catch (err) {
      console.error("Error paying period", err);
    }
  };

  // Adjustments handling
  const handleOpenAdjust = (entry: PayrollEntry) => {
    setSelectedEntryForAdjust(entry);
    setAllowanceInput([...entry.allowances]);
    setDeductionInput([...entry.deductions]);
    setAdjustNotes(entry.notes || "");
  };

  const handleAddAllowance = () => {
    setAllowanceInput([...allowanceInput, { name: "", amount: "0.00" }]);
  };

  const handleRemoveAllowance = (idx: number) => {
    setAllowanceInput(allowanceInput.filter((_, i) => i !== idx));
  };

  const handleAllowanceChange = (idx: number, key: "name" | "amount", val: string) => {
    const nextList = [...allowanceInput];
    nextList[idx] = { ...nextList[idx], [key]: val };
    setAllowanceInput(nextList);
  };

  const handleAddDeduction = () => {
    setDeductionInput([...deductionInput, { name: "", amount: "0.00" }]);
  };

  const handleRemoveDeduction = (idx: number) => {
    setDeductionInput(deductionInput.filter((_, i) => i !== idx));
  };

  const handleDeductionChange = (idx: number, key: "name" | "amount", val: string) => {
    const nextList = [...deductionInput];
    nextList[idx] = { ...nextList[idx], [key]: val };
    setDeductionInput(nextList);
  };

  const handleSaveAdjustments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntryForAdjust) return;

    try {
      await payrollApi.updateEntry(selectedEntryForAdjust.id, {
        allowances: allowanceInput,
        deductions: deductionInput,
        notes: adjustNotes
      });
      setSelectedEntryForAdjust(null);
      fetchEntries();
    } catch (err) {
      console.error("Error saving adjustments", err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Payroll Processing Hub
          </h1>
          <p className="text-muted-foreground text-sm">
            Executing employee payroll, pro-rating absences, verifying SSF contributions, and progressive tax TDS.
          </p>
        </div>
        <div>
          <Button onClick={() => setIsNewPeriodOpen(true)} className="bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Initialize Pay Cycle
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Cycle Selector */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="bg-slate-900/30 border-slate-800/80 shadow-xl overflow-hidden">
            <CardHeader className="p-4 border-b border-slate-900 bg-slate-950/25">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-indigo-400" />
                Roster Cycles
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {periods.map((p) => {
                const isActive = selectedPeriod?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPeriod(p)}
                    className={`w-full text-left p-3 rounded-lg flex items-center justify-between gap-3 text-xs transition-all ${
                      isActive 
                        ? "bg-indigo-950/20 border border-indigo-500/20 text-white font-bold"
                        : "text-slate-400 border border-transparent hover:bg-slate-850/40"
                    }`}
                  >
                    <div>
                      <div>{p.month_display} {p.year}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{p.entry_count} employees computed</div>
                    </div>
                    <Badge variant="outline" className={`capitalize text-[9px] px-1.5 py-0.5 ${
                      p.status === "paid"
                        ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5"
                        : p.status === "approved"
                        ? "border-indigo-500/20 text-indigo-400 bg-indigo-500/5"
                        : "border-amber-500/20 text-amber-500 bg-amber-500/5"
                    }`}>
                      {p.status}
                    </Badge>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right: Calculated Ledger */}
        <div className="lg:col-span-9 space-y-6">
          {selectedPeriod ? (
            <Card className="bg-slate-900/20 border-slate-800/60 shadow-xl overflow-hidden">
              <CardHeader className="p-5 border-b border-slate-900/60 flex flex-row flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-white">
                    Cycle Details — {selectedPeriod.month_display} {selectedPeriod.year}
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Roster ledger processing status: <span className="font-bold text-white capitalize">{selectedPeriod.status}</span>
                  </CardDescription>
                </div>

                {/* Operations Buttons */}
                <div className="flex items-center gap-2">
                  {selectedPeriod.status === "draft" && (
                    <>
                      <Button onClick={handleRunCalculation} size="sm" variant="outline" className="border-slate-800 hover:bg-slate-800 text-white flex items-center gap-1.5 text-xs font-semibold">
                        <Play className="h-3.5 w-3.5 text-indigo-400" />
                        Calculate
                      </Button>
                      <Button onClick={handleApprovePeriod} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 text-xs font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve Period
                      </Button>
                    </>
                  )}
                  {selectedPeriod.status === "approved" && (
                    <Button onClick={handlePayPeriod} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 text-xs font-semibold">
                      <Coins className="h-3.5 w-3.5" />
                      Disburse Paid
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0 overflow-x-auto">
                {entries.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
                    <p className="text-slate-400 text-sm">No payroll entries computed. Click 'Calculate' to generate entries.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-800/60 text-slate-400 font-semibold bg-slate-950/10">
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-4 text-right">Base Pay</th>
                        <th className="py-3 px-4 text-right">Overtime</th>
                        <th className="py-3 px-4 text-right">Allowances</th>
                        <th className="py-3 px-4 text-right">SSF (11%)</th>
                        <th className="py-3 px-4 text-right">Income Tax</th>
                        <th className="py-3 px-4 text-right">Gross Pay</th>
                        <th className="py-3 px-4 text-right">Net Takehome</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => {
                        const allSums = entry.allowances.reduce((s, item) => s + parseFloat(item.amount), 0);
                        return (
                          <tr key={entry.id} className="border-b border-slate-900/50 hover:bg-slate-950/10 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-white text-sm">{entry.staff_name}</div>
                              <div className="text-slate-500 text-[10px]">{entry.staff_designation}</div>
                            </td>
                            <td className="py-3 px-4 text-right text-slate-300 font-medium font-mono">
                              Rs. {parseFloat(entry.basic_salary).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-400 font-mono">
                              Rs. {parseFloat(entry.overtime_amount).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-400 font-mono">
                              Rs. {allSums.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-500 font-mono">
                              Rs. {parseFloat(entry.ssf_employee).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-red-500 font-mono">
                              Rs. {parseFloat(entry.income_tax).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-300 font-mono font-semibold">
                              Rs. {parseFloat(entry.gross_salary).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-emerald-400 font-mono font-bold text-sm">
                              Rs. {parseFloat(entry.net_salary).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-1">
                                {selectedPeriod.status === "draft" && (
                                  <Button onClick={() => handleOpenAdjust(entry)} variant="ghost" size="sm" className="h-8 text-indigo-400 hover:text-white">
                                    Adjust
                                  </Button>
                                )}
                                <a 
                                  href={payrollApi.getPayslipUrl(entry.id)} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="h-8 px-2 inline-flex items-center gap-1 rounded text-slate-400 hover:text-white text-[11px] font-semibold hover:bg-slate-800"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  Payslip
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-24 bg-slate-900/10 border border-slate-850/50 rounded-xl space-y-3">
              <CreditCard className="h-12 w-12 text-slate-600 mx-auto" />
              <p className="text-slate-400 font-medium">Select or initialize a pay cycle cycle to begin processing payroll.</p>
            </div>
          )}
        </div>
      </div>

      {/* Dialog: Create Period */}
      <Dialog open={isNewPeriodOpen} onOpenChange={setIsNewPeriodOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-full sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-450" />
              Initialize Pay Cycle
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePeriod} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="p_month">Month</Label>
              <select 
                id="p_month"
                value={newPeriodData.month}
                onChange={(e) => setNewPeriodData({ ...newPeriodData, month: parseInt(e.target.value) })}
                className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {format(new Date(2026, i, 1), "MMMM")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="p_year">Year</Label>
              <select 
                id="p_year"
                value={newPeriodData.year}
                onChange={(e) => setNewPeriodData({ ...newPeriodData, year: parseInt(e.target.value) })}
                className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-sm"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setIsNewPeriodOpen(false)} className="h-9 hover:bg-slate-800 text-slate-400">
                Cancel
              </Button>
              <Button type="submit" className="h-9 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white">
                Initialize Cycle
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit adjustments */}
      <Dialog open={selectedEntryForAdjust !== null} onOpenChange={() => setSelectedEntryForAdjust(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-full sm:max-w-lg overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-400" />
              Adjust Allowances & Deductions
            </DialogTitle>
          </DialogHeader>

          {selectedEntryForAdjust && (
            <form onSubmit={handleSaveAdjustments} className="space-y-4 pt-2">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-xs">
                <div>Employee: <span className="font-bold text-white">{selectedEntryForAdjust.staff_name}</span></div>
                <div>Designation: <span className="text-slate-400">{selectedEntryForAdjust.staff_designation}</span></div>
                <div>Computed Base: <span className="font-bold text-emerald-400">Rs. {parseFloat(selectedEntryForAdjust.basic_salary).toLocaleString()}</span></div>
              </div>

              {/* Allowances */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850 pb-1">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Custom Allowances</h4>
                  <Button type="button" onClick={handleAddAllowance} variant="ghost" size="sm" className="h-7 text-indigo-400 hover:text-white text-[10px] font-bold">
                    + Add line
                  </Button>
                </div>
                {allowanceInput.map((allow, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <Input 
                      value={allow.name}
                      onChange={(e) => handleAllowanceChange(idx, "name", e.target.value)}
                      placeholder="e.g. Festival Bonus, Fuel Allowance"
                      className="bg-slate-950 border-slate-800 text-white text-xs h-9" 
                      required
                    />
                    <Input 
                      type="number"
                      step="0.01"
                      value={allow.amount}
                      onChange={(e) => handleAllowanceChange(idx, "amount", e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white text-xs h-9 w-[120px]" 
                      required
                    />
                    <Button type="button" onClick={() => handleRemoveAllowance(idx)} size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-slate-800 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Deductions */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-850 pb-1">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Custom Deductions</h4>
                  <Button type="button" onClick={handleAddDeduction} variant="ghost" size="sm" className="h-7 text-indigo-400 hover:text-white text-[10px] font-bold">
                    + Add line
                  </Button>
                </div>
                {deductionInput.map((ded, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <Input 
                      value={ded.name}
                      onChange={(e) => handleDeductionChange(idx, "name", e.target.value)}
                      placeholder="e.g. Advance Salary, Damage fine"
                      className="bg-slate-950 border-slate-800 text-white text-xs h-9" 
                      required
                    />
                    <Input 
                      type="number"
                      step="0.01"
                      value={ded.amount}
                      onChange={(e) => handleDeductionChange(idx, "amount", e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white text-xs h-9 w-[120px]" 
                      required
                    />
                    <Button type="button" onClick={() => handleRemoveDeduction(idx)} size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-slate-800 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <Label htmlFor="adj_notes">Audit Notes</Label>
                <Input 
                  id="adj_notes"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Reasoning for manual allowance or deduction..."
                  className="bg-slate-950 border-slate-800 text-white text-xs" 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button type="button" variant="ghost" onClick={() => setSelectedEntryForAdjust(null)} className="h-9 hover:bg-slate-800 text-slate-400">
                  Cancel
                </Button>
                <Button type="submit" className="h-9 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white">
                  Save Adjustments
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
