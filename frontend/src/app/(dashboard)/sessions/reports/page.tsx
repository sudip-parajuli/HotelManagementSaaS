"use client";

import React, { useEffect, useState } from "react";
import { sessionsApi } from "@/lib/api/sessions";
import {
  Loader2, BarChart3, Clock, DollarSign, Calendar,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SessionReportsPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [unitsReport, setUnitsReport] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      sessionsApi.getReport("daily"),
      sessionsApi.getReport("units"),
    ])
      .then(([d, u]) => { setReport(d); setUnitsReport(u); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Session Reports</h1>
          <p className="text-sm text-workspace-400">Daily utilization and revenue overview</p>
        </div>
        <Button variant="outline" disabled>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-workspace-900 border-workspace-800 p-4">
          <div className="flex items-center gap-2 text-xs text-workspace-500 mb-1">
            <BarChart3 className="h-3.5 w-3.5" /> Today&apos;s Sessions
          </div>
          <div className="text-2xl font-bold">{report?.total_sessions ?? 0}</div>
        </Card>
        <Card className="bg-workspace-900 border-workspace-800 p-4">
          <div className="flex items-center gap-2 text-xs text-workspace-500 mb-1">
            <Clock className="h-3.5 w-3.5" /> Active Now
          </div>
          <div className="text-2xl font-bold text-emerald-400">{report?.active_now ?? 0}</div>
        </Card>
        <Card className="bg-workspace-900 border-workspace-800 p-4">
          <div className="flex items-center gap-2 text-xs text-workspace-500 mb-1">
            <DollarSign className="h-3.5 w-3.5" /> Today&apos;s Revenue
          </div>
          <div className="text-2xl font-bold text-brand-400">
            NPR {(report?.revenue ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
        </Card>
        <Card className="bg-workspace-900 border-workspace-800 p-4">
          <div className="flex items-center gap-2 text-xs text-workspace-500 mb-1">
            <Calendar className="h-3.5 w-3.5" /> Avg Duration
          </div>
          <div className="text-2xl font-bold">
            {Math.round(report?.avg_duration_minutes ?? 0)} min
          </div>
        </Card>
      </div>

      {/* Units report */}
      {unitsReport && (
        <Card className="bg-workspace-900 border-workspace-800 p-4">
          <h2 className="text-sm font-semibold mb-3">Unit Utilization</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{unitsReport.available}</div>
              <div className="text-xs text-workspace-500">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{unitsReport.occupied_now}</div>
              <div className="text-xs text-workspace-500">Occupied</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">{unitsReport.maintenance}</div>
              <div className="text-xs text-workspace-500">Maintenance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{unitsReport.total_units}</div>
              <div className="text-xs text-workspace-500">Total</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2 rounded-full bg-workspace-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-brand-500 to-red-500 transition-all"
                style={{ width: `${unitsReport.total_units ? (unitsReport.occupied_now / unitsReport.total_units) * 100 : 0}%` }}
              />
            </div>
            <div className="text-[10px] text-workspace-600 mt-1 text-right">
              {unitsReport.total_units ? Math.round((unitsReport.occupied_now / unitsReport.total_units) * 100) : 0}% occupied
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
