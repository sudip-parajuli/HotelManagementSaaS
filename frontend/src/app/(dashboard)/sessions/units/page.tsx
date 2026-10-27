"use client";

import React, { useEffect, useState } from "react";
import { sessionsApi, SessionUnit, SessionUnitType } from "@/lib/api/sessions";
import {
  Loader2, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STATUS_BADGE: Record<string, string> = {
  available: "bg-emerald-500/20 text-emerald-400",
  occupied: "bg-red-500/20 text-red-400",
  reserved: "bg-brand-500/20 text-brand-400",
  maintenance: "bg-amber-500/20 text-amber-400",
  cleaning: "bg-workspace-500/20 text-workspace-400",
};

export default function SessionUnitsPage() {
  const [units, setUnits] = useState<SessionUnit[]>([]);
  const [unitTypes, setUnitTypes] = useState<SessionUnitType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddType, setShowAddType] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([sessionsApi.listUnits(), sessionsApi.listUnitTypes()])
      .then(([u, t]) => { setUnits(u); setUnitTypes(t); })
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

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
          <h1 className="text-xl font-bold">Session Units</h1>
          <p className="text-sm text-workspace-400">Manage units and unit types</p>
        </div>
        <Button onClick={() => setShowAddType(!showAddType)}>
          <Plus className="h-4 w-4 mr-1" /> New Unit Type
        </Button>
      </div>

      {/* Unit Types */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-workspace-300 mb-3">Unit Types</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {unitTypes.map((ut) => (
            <Card key={ut.id} className="bg-workspace-900 border-workspace-800 p-4">
              <div className="font-medium text-sm">{ut.type_name}</div>
              <div className="text-xs text-workspace-500 mt-1 space-y-0.5">
                <div>Rate: NPR {parseFloat(ut.rate).toLocaleString("en-IN")}/{ut.pricing_model === "per_hour" ? "hr" : ut.pricing_model === "per_minute" ? "min" : ut.pricing_model === "flat_rate" ? "session" : "day"}</div>
                <div>Min: {ut.minimum_duration_minutes} min</div>
                {ut.overage_rate && <div>Overage: NPR {parseFloat(ut.overage_rate).toLocaleString("en-IN")}/min</div>}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Units grid */}
      <section>
        <h2 className="text-sm font-semibold text-workspace-300 mb-3">All Units ({units.length})</h2>
        {units.length === 0 ? (
          <Card className="bg-workspace-900 border-workspace-800 p-6 text-center text-workspace-500 text-sm">
            No units configured yet.
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {units.map((unit) => {
              const ut = typeof unit.unit_type === "object" ? unit.unit_type : null;
              return (
                <Card key={unit.id} className="bg-workspace-900 border-workspace-800 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm">{unit.unit_name}</div>
                      {ut && <div className="text-xs text-workspace-500">{ut.type_name}</div>}
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-[10px] capitalize",
                      STATUS_BADGE[unit.status] || "text-workspace-500"
                    )}>
                      {unit.status}
                    </Badge>
                  </div>
                  {unit.qr_code && (
                    <div className="text-[10px] text-workspace-600 mt-2 font-mono">QR: {unit.qr_code.slice(0, 8)}...</div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
