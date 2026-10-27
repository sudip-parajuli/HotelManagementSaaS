"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Settings,
  Globe,
  DollarSign,
  Bell,
  Shield,
  Save,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Activity,
  Database,
  Server,
  Cpu,
  HardDrive,
} from "lucide-react";
import { superAdminApi } from "@/lib/api/superadmin";

interface HealthService {
  status: string;
  latency_ms?: number;
  error?: string;
  workers?: number;
}

interface HealthCheck {
  overall: "ok" | "degraded";
  services: Record<string, HealthService>;
  checked_at: string;
}

interface TaxSlab {
  id?: number;
  fiscal_year: string;
  filing_status: string;
  slab_order: number;
  min_amount: string;
  max_amount: string | null;
  rate_percent: string;
}

interface SSFEntry {
  id?: number;
  fiscal_year: string;
  employee_rate_percent: string;
  employer_rate_percent: string;
  is_active: boolean;
}

const FILING_STATUSES = ["single", "married", "joint"];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [taxSlabs, setTaxSlabs] = useState<TaxSlab[]>([]);
  const [ssfConfig, setSsfConfig] = useState<SSFEntry[]>([]);
  const [healthData, setHealthData] = useState<HealthCheck | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.getTaxConfig();
      setTaxSlabs(data.tax_slabs?.length ? data.tax_slabs : []);
      setSsfConfig(data.ssf_config?.length ? data.ssf_config : []);
    } catch {
      setTaxSlabs([]);
      setSsfConfig([]);
    }
    try {
      setHealthData(await superAdminApi.getSystemHealth());
    } catch {
      /* health check unavailable */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const addSlab = () => {
    const nextOrder = taxSlabs.length > 0 ? Math.max(...taxSlabs.map((s) => s.slab_order)) + 1 : 1;
    setTaxSlabs([
      ...taxSlabs,
      {
        fiscal_year: new Date().getFullYear().toString(),
        filing_status: "single",
        slab_order: nextOrder,
        min_amount: "0",
        max_amount: null,
        rate_percent: "0",
      },
    ]);
  };

  const removeSlab = (idx: number) => {
    setTaxSlabs(taxSlabs.filter((_, i) => i !== idx));
  };

  const updateSlab = (idx: number, field: keyof TaxSlab, value: string | number | null) => {
    setTaxSlabs((prev) => {
      const updated = [...prev];
      (updated[idx] as any)[field] = value;
      return updated;
    });
  };

  const addSsf = () => {
    setSsfConfig([
      ...ssfConfig,
      {
        fiscal_year: new Date().getFullYear().toString(),
        employee_rate_percent: "0",
        employer_rate_percent: "0",
        is_active: true,
      },
    ]);
  };

  const removeSsf = (idx: number) => {
    setSsfConfig(ssfConfig.filter((_, i) => i !== idx));
  };

  const updateSsf = (idx: number, field: keyof SSFEntry, value: string | boolean) => {
    setSsfConfig((prev) => {
      const updated = [...prev];
      (updated[idx] as any)[field] = value;
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await superAdminApi.updateTaxConfig({
        tax_slabs: taxSlabs.map(({ id, ...rest }) => rest),
        ssf_config: ssfConfig.map(({ id, ...rest }) => rest),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-cyan-400" />
            Platform Settings
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure global tax slabs, SSF rates, and monitor system health.
          </p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white transition-all disabled:opacity-50 shadow-md shadow-cyan-600/10">
          {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tax Slabs */}
        <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-400" />
              Tax Configuration
            </h3>
            <button onClick={addSlab} title="Add Tax Slab"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all">
              <Plus size={14} />
            </button>
          </div>
          <p className="text-[10px] text-slate-500">Progressive tax slabs synced to all active tenant schemas.</p>
          {taxSlabs.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-4">No tax slabs configured. Click + to add one.</p>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {taxSlabs.map((slab, i) => (
                <div key={i} className="flex flex-wrap items-center gap-1.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 text-xs">
                  <input type="text" value={slab.fiscal_year} maxLength={4}
                    onChange={(e) => updateSlab(i, "fiscal_year", e.target.value)}
                    className="w-14 bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1 text-center text-slate-200 font-mono outline-none" title="FY" />
                  <select value={slab.filing_status}
                    onChange={(e) => updateSlab(i, "filing_status", e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1 text-slate-200 outline-none text-[10px]">
                    {FILING_STATUSES.map((fs) => <option key={fs} value={fs}>{fs}</option>)}
                  </select>
                  <span className="text-slate-600">#</span>
                  <input type="number" value={slab.slab_order}
                    onChange={(e) => updateSlab(i, "slab_order", parseInt(e.target.value))}
                    className="w-10 bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1 text-center text-slate-200 font-mono outline-none" />
                  <span className="text-slate-600">Min:</span>
                  <input type="number" value={slab.min_amount}
                    onChange={(e) => updateSlab(i, "min_amount", e.target.value)}
                    className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1 text-slate-200 font-mono outline-none" />
                  <span className="text-slate-600">Max:</span>
                  <input type="number" value={slab.max_amount ?? ""} placeholder="∞"
                    onChange={(e) => updateSlab(i, "max_amount", e.target.value === "" ? null : e.target.value)}
                    className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1 text-slate-200 font-mono outline-none" />
                  <span className="text-slate-600">Rate:</span>
                  <input type="number" value={slab.rate_percent} step="0.01"
                    onChange={(e) => updateSlab(i, "rate_percent", e.target.value)}
                    className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1 text-slate-200 font-mono outline-none" />
                  <span className="text-slate-400 text-[10px]">%</span>
                  <button onClick={() => removeSlab(i)}
                    className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SSF Config */}
        <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Shield size={16} className="text-cyan-400" />
              SSF Configuration
            </h3>
            <button onClick={addSsf} title="Add SSF Entry"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all">
              <Plus size={14} />
            </button>
          </div>
          <p className="text-[10px] text-slate-500">Social Security Fund rates per fiscal year.</p>
          {ssfConfig.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-4">No SSF entries configured.</p>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {ssfConfig.map((entry, i) => (
                <div key={i} className="flex flex-wrap items-center gap-1.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 text-xs">
                  <input type="text" value={entry.fiscal_year} maxLength={4}
                    onChange={(e) => updateSsf(i, "fiscal_year", e.target.value)}
                    className="w-14 bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1 text-center text-slate-200 font-mono outline-none" title="FY" />
                  <span className="text-slate-600">Emp:</span>
                  <input type="number" value={entry.employee_rate_percent} step="0.01"
                    onChange={(e) => updateSsf(i, "employee_rate_percent", e.target.value)}
                    className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1 text-slate-200 font-mono outline-none" />
                  <span className="text-slate-400 text-[10px]">%</span>
                  <span className="text-slate-600">Empr:</span>
                  <input type="number" value={entry.employer_rate_percent} step="0.01"
                    onChange={(e) => updateSsf(i, "employer_rate_percent", e.target.value)}
                    className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1 text-slate-200 font-mono outline-none" />
                  <span className="text-slate-400 text-[10px]">%</span>
                  <label className="flex items-center gap-1 ml-1 cursor-pointer">
                    <input type="checkbox" checked={entry.is_active}
                      onChange={(e) => updateSsf(i, "is_active", e.target.checked)}
                      className="accent-cyan-500" />
                    <span className="text-slate-400 text-[10px]">Active</span>
                  </label>
                  <button onClick={() => removeSsf(i)}
                    className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Health */}
        <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Activity size={16} className="text-emerald-400" />
            System Health
          </h3>
          {healthData ? (
            <div className="space-y-2">
              {Object.entries(healthData.services).map(([name, info]) => (
                <div key={name} className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <div className={`h-2 w-2 rounded-full ${info.status === "ok" ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="font-semibold capitalize">{name}</span>
                    <span className="text-slate-500 text-[10px]">
                      {info.latency_ms !== undefined ? `${info.latency_ms}ms` : ""}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${info.status === "ok" ? "text-emerald-400" : "text-red-400"}`}>
                    {info.status}
                  </span>
                </div>
              ))}
              <div className="text-[10px] text-slate-500 text-right pt-2">
                Checked: {healthData.checked_at
                  ? new Date(healthData.checked_at).toLocaleString()
                  : "—"}
              </div>
            </div>
          ) : (
            <p className="text-slate-600 text-sm text-center py-4">Health check unavailable.</p>
          )}
        </div>

        {/* Notification Settings — Placeholder */}
        <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Bell size={16} className="text-amber-400" />
            Notification Settings
          </h3>
          <p className="text-slate-600 text-sm text-center py-4">Notification preferences coming soon.</p>
        </div>
      </div>
    </div>
  );
}
