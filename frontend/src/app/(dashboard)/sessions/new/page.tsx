"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sessionsApi, SessionUnit, SessionUnitType } from "@/lib/api/sessions";
import { Loader2, Clock, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function NewSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedUnit = searchParams.get("unit");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unitTypes, setUnitTypes] = useState<SessionUnitType[]>([]);
  const [units, setUnits] = useState<SessionUnit[]>([]);

  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [duration, setDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState(false);

  useEffect(() => {
    Promise.all([sessionsApi.listUnitTypes(), sessionsApi.listUnits()])
      .then(([types, unts]) => {
        setUnitTypes(types);
        setUnits(unts.filter((u) => u.status === "available"));
        if (preselectedUnit && unts.find((u) => String(u.id) === preselectedUnit)) {
          setSelectedUnit(preselectedUnit);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [preselectedUnit]);

  const selectedUnitObj = useMemo(
    () => units.find((u) => String(u.id) === selectedUnit),
    [units, selectedUnit]
  );

  const unitType = useMemo(
    () => selectedUnitObj
      ? unitTypes.find((t) => t.id === (typeof selectedUnitObj.unit_type === "object" ? selectedUnitObj.unit_type.id : selectedUnitObj.unit_type))
      : undefined,
    [selectedUnitObj, unitTypes]
  );

  const calculatedPrice = useMemo(() => {
    if (!unitType) return 0;
    const rate = parseFloat(unitType.rate || "0");
    if (unitType.pricing_model === "flat_rate") return rate;
    if (unitType.pricing_model === "per_hour") return rate * Math.ceil(duration / 60);
    if (unitType.pricing_model === "per_minute") return rate * duration;
    if (unitType.pricing_model === "per_day") return rate * Math.max(1, Math.ceil(duration / 1440));
    return 0;
  }, [unitType, duration]);

  const durationOptions = [30, 60, 90, 120, 180];

  const handleSubmit = async () => {
    if (!selectedUnit) { toast.error("Select a unit"); return; }
    if (!guestName.trim()) { toast.error("Guest name is required"); return; }
    setSaving(true);
    try {
      const res = await sessionsApi.startSession({
        unit_id: parseInt(selectedUnit),
        guest_name: guestName,
        guest_phone: guestPhone,
        paid_minutes: duration,
      });
      toast.success("Session started!");
      router.push(`/sessions/${res.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to start session");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Start New Session</h1>

      {/* Step 1: Select unit */}
      <section className="mb-6">
        <Label className="text-sm text-workspace-300 mb-2 block">1. Select Unit</Label>
        {units.length === 0 ? (
          <Card className="bg-workspace-900 border-workspace-800 p-4 text-center text-workspace-500 text-sm">
            No available units
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {units.map((u) => {
              const ut = typeof u.unit_type === "object" ? u.unit_type : null;
              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedUnit(String(u.id))}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all text-sm",
                    selectedUnit === String(u.id)
                      ? "border-brand-500 bg-brand-500/10"
                      : "border-workspace-800 bg-workspace-900 hover:border-workspace-700"
                  )}
                >
                  <div className="font-medium">{u.unit_name}</div>
                  {ut && <div className="text-[10px] text-workspace-500">{ut.type_name}</div>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedUnitObj && (
        <>
          {/* Step 2: Guest info */}
          <section className="mb-6">
            <Label className="text-sm text-workspace-300 mb-2 block">2. Guest Information</Label>
            <Card className="bg-workspace-900 border-workspace-800 p-4 space-y-3">
              <div>
                <div className="text-xs text-workspace-500 mb-1 flex items-center gap-1"><User className="h-3 w-3" /> Name</div>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Guest name"
                  className="bg-workspace-950 border-workspace-800"
                />
              </div>
              <div>
                <div className="text-xs text-workspace-500 mb-1 flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</div>
                <Input
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="Phone number (optional)"
                  className="bg-workspace-950 border-workspace-800"
                />
              </div>
            </Card>
          </section>

          {/* Step 3: Duration + price */}
          <section className="mb-6">
            <Label className="text-sm text-workspace-300 mb-2 block">3. Duration</Label>
            <Card className="bg-workspace-900 border-workspace-800 p-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {durationOptions.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setDuration(d); setCustomDuration(false); }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm border transition-all",
                      !customDuration && duration === d
                        ? "border-brand-500 bg-brand-500/10 text-brand-400"
                        : "border-workspace-800 hover:border-workspace-700 text-workspace-400"
                    )}
                  >
                    {d >= 60 ? `${d / 60}h` : `${d}min`}
                  </button>
                ))}
                <button
                  onClick={() => setCustomDuration(true)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm border transition-all",
                    customDuration ? "border-brand-500 bg-brand-500/10 text-brand-400" : "border-workspace-800 hover:border-workspace-700 text-workspace-400"
                  )}
                >
                  Custom
                </button>
              </div>
              {customDuration && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                    className="bg-workspace-950 border-workspace-800 w-24"
                    min={1}
                  />
                  <span className="text-xs text-workspace-500">minutes</span>
                </div>
              )}

              {/* Price display */}
              {unitType && (
                <div className="mt-3 pt-3 border-t border-workspace-800 flex items-center justify-between">
                  <div className="text-xs text-workspace-500">
                    {unitType.pricing_model === "flat_rate" ? "Flat rate" :
                     unitType.pricing_model === "per_hour" ? `NPR ${parseFloat(unitType.rate).toLocaleString("en-IN")}/hr` :
                     unitType.pricing_model === "per_minute" ? `NPR ${parseFloat(unitType.rate).toLocaleString("en-IN")}/min` :
                     unitType.pricing_model === "per_day" ? `NPR ${parseFloat(unitType.rate).toLocaleString("en-IN")}/day` : ""}
                  </div>
                  <div className="text-lg font-bold text-brand-400">
                    NPR {calculatedPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                </div>
              )}
            </Card>
          </section>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={saving || !guestName.trim()}
            className="w-full h-12 text-base"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Starting...</>
            ) : (
              <><Clock className="h-4 w-4 mr-2" /> Start Session — NPR {calculatedPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</>
            )}
          </Button>
        </>
      )}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
