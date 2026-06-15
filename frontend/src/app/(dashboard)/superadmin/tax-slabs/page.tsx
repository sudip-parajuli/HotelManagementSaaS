"use client";

import React, { useEffect, useState } from "react";
import { 
  FileText, 
  Loader2, 
  Save, 
  AlertTriangle,
  Plus, 
  Trash2, 
  Info,
  DollarSign,
  TrendingUp,
  Percent
} from "lucide-react";
import { superAdminApi } from "@/lib/api/superadmin";

interface TaxSlab {
  id?: number;
  fiscal_year: string;
  filing_status: "single" | "married";
  slab_order: number;
  min_amount: number | string;
  max_amount: number | string | null;
  rate_percent: number | string;
}

interface SSFConfig {
  id?: number;
  fiscal_year: string;
  employee_rate_percent: number | string;
  employer_rate_percent: number | string;
  is_active: boolean;
}

export default function TaxSlabsPage() {
  const [taxSlabs, setTaxSlabs] = useState<TaxSlab[]>([]);
  const [ssfConfigs, setSsfConfigs] = useState<SSFConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"single" | "married" | "ssf">("single");
  const [fiscalYear, setFiscalYear] = useState("2081/82");

  useEffect(() => {
    loadTaxConfig();
  }, []);

  const loadTaxConfig = async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.getTaxConfig();
      setTaxSlabs(data.tax_slabs || []);
      setSsfConfigs(data.ssf_config || []);
      if (data.tax_slabs && data.tax_slabs.length > 0) {
        setFiscalYear(data.tax_slabs[0].fiscal_year);
      }
    } catch (err) {
      console.error("Failed to load tax configuration", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Basic validation: ensure amounts are numbers
      const cleanedSlabs = taxSlabs.map(slab => ({
        ...slab,
        fiscal_year: fiscalYear,
        min_amount: Number(slab.min_amount),
        max_amount: slab.max_amount === "" || slab.max_amount === null ? null : Number(slab.max_amount),
        rate_percent: Number(slab.rate_percent)
      }));

      const cleanedSsf = ssfConfigs.map(cfg => ({
        ...cfg,
        fiscal_year: fiscalYear,
        employee_rate_percent: Number(cfg.employee_rate_percent),
        employer_rate_percent: Number(cfg.employer_rate_percent)
      }));

      await superAdminApi.updateTaxConfig({
        tax_slabs: cleanedSlabs,
        ssf_config: cleanedSsf
      });

      alert("Configuration successfully saved and synchronized across all active hotels.");
      loadTaxConfig();
    } catch (err) {
      console.error("Failed to save tax config", err);
      alert("Error saving configuration.");
    } finally {
      setSaving(false);
    }
  };

  const updateSlabField = (index: number, field: keyof TaxSlab, value: any) => {
    const updated = [...taxSlabs];
    updated[index] = { ...updated[index], [field]: value };
    setTaxSlabs(updated);
  };

  const updateSsfField = (index: number, field: keyof SSFConfig, value: any) => {
    const updated = [...ssfConfigs];
    updated[index] = { ...updated[index], [field]: value };
    setSsfConfigs(updated);
  };

  const addSlab = (status: "single" | "married") => {
    const statusSlabs = taxSlabs.filter(s => s.filing_status === status);
    const lastOrder = statusSlabs.length > 0 ? Math.max(...statusSlabs.map(s => s.slab_order)) : 0;
    const lastMax = statusSlabs.length > 0 ? statusSlabs[statusSlabs.length - 1].max_amount : 0;

    const newSlab: TaxSlab = {
      fiscal_year: fiscalYear,
      filing_status: status,
      slab_order: lastOrder + 1,
      min_amount: lastMax || 0,
      max_amount: "",
      rate_percent: 0
    };

    setTaxSlabs([...taxSlabs, newSlab]);
  };

  const removeSlab = (indexToRemove: number) => {
    const slabToRemove = taxSlabs[indexToRemove];
    const updated = taxSlabs.filter((_, idx) => idx !== indexToRemove);
    
    // Recalculate slab orders for the same filing status
    let orderCounter = 1;
    const reordered = updated.map(slab => {
      if (slab.filing_status === slabToRemove.filing_status) {
        const newSlab = { ...slab, slab_order: orderCounter };
        orderCounter++;
        return newSlab;
      }
      return slab;
    });

    setTaxSlabs(reordered);
  };

  const filteredSlabs = taxSlabs.filter(s => s.filing_status === activeTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-purple-400" />
            Nepal Tax Slabs & SSF Rates
          </h1>
          <p className="text-slate-400 text-sm">
            Manage progressive income tax slabs and Social Security Fund (SSF) contribution rules.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-xl text-sm gap-2">
            <span className="text-slate-500 font-medium">Fiscal Year:</span>
            <input 
              type="text" 
              value={fiscalYear} 
              onChange={(e) => setFiscalYear(e.target.value)}
              className="bg-transparent border-none text-white outline-none w-20 text-center font-bold"
              placeholder="e.g. 2081/82"
            />
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-purple-500/10 transition-all disabled:opacity-50 w-full sm:w-auto"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save & Sync Slabs
          </button>
        </div>
      </div>

      {/* Warning banner */}
      <div className="bg-amber-950/20 border border-amber-900/30 p-4 rounded-xl flex gap-3 text-xs leading-relaxed text-amber-300/95 max-w-4xl">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
        <div>
          <strong className="text-amber-400 block font-bold mb-1">Global Synchronization Disclaimer</strong>
          Any modifications made on this console will automatically reset and synchronize the tax rates and SSF brackets for <span className="underline font-semibold text-amber-200">all active hotel client databases</span>. Please verify rates against the latest Inland Revenue Department (IRD) and Social Security Fund (SSF) circulars before saving.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab("single")}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === "single" ? "text-purple-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Single Filing Status Slabs
          {activeTab === "single" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("married")}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === "married" ? "text-purple-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Married Filing Status Slabs
          {activeTab === "married" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("ssf")}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === "ssf" ? "text-purple-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Social Security Fund (SSF) Rates
          {activeTab === "ssf" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
          )}
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <p className="text-slate-500 text-sm">Loading tax configuration...</p>
          </div>
        </div>
      ) : activeTab === "ssf" ? (
        // SSF Configurations Edit Card
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {ssfConfigs.map((cfg, idx) => (
            <div key={idx} className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 p-6 rounded-2xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-md font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-400" />
                  SSF Contribution Rates
                </h3>
                <span className="text-xs font-mono bg-purple-950 text-purple-400 px-2 py-0.5 rounded border border-purple-800/30">
                  {cfg.fiscal_year}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Employee Contribution (%)</label>
                  <div className="flex items-center bg-slate-950/80 border border-slate-850 rounded-xl px-3 py-2">
                    <input
                      type="number"
                      value={cfg.employee_rate_percent}
                      onChange={(e) => updateSsfField(idx, "employee_rate_percent", e.target.value)}
                      className="bg-transparent border-none text-white text-sm outline-none w-full font-mono"
                      step="0.01"
                    />
                    <Percent className="h-3.5 w-3.5 text-slate-500 ml-1" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Employer Contribution (%)</label>
                  <div className="flex items-center bg-slate-950/80 border border-slate-850 rounded-xl px-3 py-2">
                    <input
                      type="number"
                      value={cfg.employer_rate_percent}
                      onChange={(e) => updateSsfField(idx, "employer_rate_percent", e.target.value)}
                      className="bg-transparent border-none text-white text-sm outline-none w-full font-mono"
                      step="0.01"
                    />
                    <Percent className="h-3.5 w-3.5 text-slate-500 ml-1" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 items-start bg-slate-950/40 p-3 rounded-lg border border-slate-850/60 text-[10px] text-slate-500 leading-normal">
                <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>
                  By default, Nepal SSF rules dictate an Employee contribution of 11% (deducted from basic salary) and an Employer contribution of 20% (added as overhead cost).
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Tax Slabs Edit Table
        <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl max-w-5xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4 w-20">Order</th>
                  <th className="px-6 py-4">Minimum Amount (NPR)</th>
                  <th className="px-6 py-4">Maximum Amount (NPR)</th>
                  <th className="px-6 py-4">Rate (%)</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 text-sm text-slate-300">
                {taxSlabs.map((slab, idx) => {
                  if (slab.filing_status !== activeTab) return null;
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-800/10 transition-all font-mono">
                      <td className="px-6 py-3 font-semibold text-white">
                        {slab.slab_order}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center bg-slate-950/60 border border-slate-850 rounded-xl px-3 py-1.5 max-w-[200px]">
                          <span className="text-slate-600 text-xs mr-1">Rs.</span>
                          <input
                            type="number"
                            value={slab.min_amount}
                            onChange={(e) => updateSlabField(idx, "min_amount", e.target.value)}
                            className="bg-transparent border-none text-white text-sm outline-none w-full"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center bg-slate-950/60 border border-slate-850 rounded-xl px-3 py-1.5 max-w-[200px]">
                          <span className="text-slate-600 text-xs mr-1">Rs.</span>
                          <input
                            type="number"
                            placeholder="Above"
                            value={slab.max_amount === null ? "" : slab.max_amount}
                            onChange={(e) => updateSlabField(idx, "max_amount", e.target.value === "" ? null : e.target.value)}
                            className="bg-transparent border-none text-white text-sm outline-none w-full placeholder-slate-600"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center bg-slate-950/60 border border-slate-850 rounded-xl px-3 py-1.5 max-w-[120px]">
                          <input
                            type="number"
                            value={slab.rate_percent}
                            onChange={(e) => updateSlabField(idx, "rate_percent", e.target.value)}
                            className="bg-transparent border-none text-white text-sm outline-none w-full"
                            step="0.1"
                          />
                          <Percent className="h-3 w-3 text-slate-500" />
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => removeSlab(idx)}
                          className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-850 hover:bg-rose-950/30 hover:border-rose-900/40 text-slate-400 hover:text-rose-400 transition-all"
                          title="Delete Slab"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-slate-850/60 bg-slate-900/20 flex justify-between items-center">
            <button
              onClick={() => addSlab(activeTab as "single" | "married")}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-purple-400 border border-slate-800 hover:border-slate-700 px-3 py-2 rounded-xl transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Progressive Slab
            </button>
            
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-slate-500" />
              <span>Slab 1 is evaluated at 0% for SSF enrolled members in payroll calculations.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
