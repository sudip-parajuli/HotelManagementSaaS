"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Database,
  Layers,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
  Clock,
  Wifi,
  WifiOff,
  Server,
} from "lucide-react";
import { superAdminApi } from "@/lib/api/superadmin";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServiceHealth {
  status: string;
  latency_ms?: number;
  error?: string;
  workers?: number;
}

interface HealthData {
  overall: "ok" | "degraded";
  services: Record<string, ServiceHealth>;
  checked_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  database: <Database size={20} />,
  redis:    <Layers size={20} />,
  celery:   <Cpu size={20} />,
};

function ServiceCard({ name, health }: { name: string; health: ServiceHealth }) {
  const isOk = health.status === "ok";
  const isNoWorkers = health.status === "no_workers" || health.status === "configured";
  const isError = health.status === "error" || health.status === "degraded";

  const color = isOk
    ? "border-emerald-500/30 bg-emerald-500/5"
    : isNoWorkers
    ? "border-amber-500/30 bg-amber-500/5"
    : "border-red-500/30 bg-red-500/5";

  const iconColor = isOk ? "text-emerald-400" : isNoWorkers ? "text-amber-400" : "text-red-400";
  const statusIcon = isOk
    ? <CheckCircle2 size={18} className="text-emerald-400" />
    : isNoWorkers
    ? <AlertTriangle size={18} className="text-amber-400" />
    : <XCircle size={18} className="text-red-400" />;

  return (
    <div className={`rounded-xl border p-5 transition-all ${color}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className={iconColor}>{SERVICE_ICONS[name] ?? <Server size={20} />}</span>
          <h3 className="font-semibold text-foreground capitalize">{name.replaceAll("_", " ")}</h3>
        </div>
        {statusIcon}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-workspace-500">Status</span>
          <span className={`font-medium capitalize ${isOk ? "text-emerald-400" : isNoWorkers ? "text-amber-400" : "text-red-400"}`}>
            {health.status.replace("_", " ")}
          </span>
        </div>

        {health.latency_ms !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-workspace-500">Latency</span>
            <span className={`font-mono font-medium ${health.latency_ms < 50 ? "text-emerald-400" : health.latency_ms < 200 ? "text-amber-400" : "text-red-400"}`}>
              {health.latency_ms}ms
            </span>
          </div>
        )}

        {health.workers !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-workspace-500">Workers</span>
            <span className={`font-medium ${health.workers > 0 ? "text-emerald-400" : "text-amber-400"}`}>
              {health.workers} online
            </span>
          </div>
        )}

        {health.error && (
          <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 font-mono break-all">
            {health.error}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Latency Gauge ────────────────────────────────────────────────────────────

function LatencyGauge({ label, ms }: { label: string; ms?: number }) {
  const clamp = Math.min(ms ?? 0, 500);
  const pct = (clamp / 500) * 100;
  const color = !ms ? "bg-workspace-700" : ms < 50 ? "bg-emerald-500" : ms < 200 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-workspace-500 capitalize">{label}</span>
        <span className={`font-mono font-semibold ${!ms ? "text-workspace-600" : ms < 50 ? "text-emerald-400" : ms < 200 ? "text-amber-400" : "text-red-400"}`}>
          {ms !== undefined ? `${ms}ms` : "N/A"}
        </span>
      </div>
      <div className="h-2 rounded-full bg-workspace-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.getSystemHealth();
      setHealth(data);
      setLastRefresh(new Date());
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHealth(); }, [loadHealth]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadHealth, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadHealth]);

  const services = health?.services ?? {};
  const serviceNames = Object.keys(services);
  const overallOk = health?.overall === "ok";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-workspace-900/50 border border-workspace-800 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${overallOk ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
            {overallOk ? (
              <Wifi className="text-emerald-400" size={20} />
            ) : (
              <WifiOff className="text-red-400" size={20} />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">System Health</h1>
            <p className="text-workspace-500 text-sm mt-0.5">
              {health
                ? <span className={overallOk ? "text-emerald-400" : "text-red-400"}>
                    {overallOk ? "All systems operational" : "One or more services degraded"}
                  </span>
                : "Unable to fetch health status"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-all ${
              autoRefresh
                ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                : "border-workspace-700 text-workspace-500 hover:text-workspace-300"
            }`}
          >
            <Activity size={13} />
            {autoRefresh ? "Live (15s)" : "Auto-refresh"}
          </button>
          <button
            onClick={loadHealth}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-workspace-700 text-workspace-400 hover:text-workspace-200 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Refresh
          </button>
        </div>
      </div>

      {/* Last Checked */}
      {lastRefresh && (
        <div className="flex items-center gap-1.5 text-xs text-workspace-600">
          <Clock size={12} />
          Last checked: {lastRefresh.toLocaleTimeString()}
          {autoRefresh && <span className="ml-1 text-indigo-500">• auto-refreshing every 15s</span>}
        </div>
      )}

      {loading && !health ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-indigo-400" size={32} />
        </div>
      ) : !health ? (
        <div className="text-center py-16 rounded-xl border border-workspace-800">
          <AlertTriangle size={40} className="mx-auto text-red-400 mb-3" />
          <p className="text-workspace-400 font-medium">Could not connect to the health endpoint.</p>
          <p className="text-workspace-600 text-sm mt-1">Make sure the backend is running.</p>
          <button onClick={loadHealth} className="mt-4 px-4 py-2 text-sm rounded-lg bg-workspace-800 hover:bg-workspace-700 text-workspace-300 transition-all">
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Overall status banner */}
          <div className={`rounded-xl border px-5 py-4 flex items-center gap-3 ${
            overallOk
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-red-500/20 bg-red-500/5"
          }`}>
            {overallOk
              ? <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
              : <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />}
            <div>
              <p className={`font-semibold text-sm ${overallOk ? "text-emerald-300" : "text-red-300"}`}>
                Overall: {overallOk ? "Healthy" : "Degraded"}
              </p>
              <p className="text-xs text-workspace-500 mt-0.5">
                Checked at {new Date(health.checked_at).toLocaleTimeString()} ·{" "}
                {serviceNames.length} service{serviceNames.length !== 1 ? "s" : ""} monitored
              </p>
            </div>
          </div>

          {/* Service Cards */}
          {serviceNames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {serviceNames.map((name) => (
                <ServiceCard key={name} name={name} health={services[name]} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-workspace-600 rounded-xl border border-workspace-800">
              <Server size={32} className="mx-auto mb-2 opacity-40" />
              <p>No services reported.</p>
            </div>
          )}

          {/* Latency Overview */}
          <div className="rounded-xl border border-workspace-800 bg-workspace-900/40 p-5">
            <h2 className="text-sm font-semibold text-workspace-400 uppercase tracking-wider mb-4">
              Latency Overview (0 – 500ms scale)
            </h2>
            <div className="space-y-3 max-w-md">
              {serviceNames.map((name) => (
                <LatencyGauge
                  key={name}
                  label={name}
                  ms={services[name].latency_ms}
                />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-workspace-800 text-xs">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> &lt;50ms (Excellent)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 50–200ms (Acceptable)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> &gt;200ms (Slow)</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
