"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { sessionsApi, SessionUnit, TimedSession, LiveStatus } from "@/lib/api/sessions";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import { useAuthStore } from "@/lib/store/authStore";
import {
  Loader2, Plus, Clock, User, Square,
  Gamepad2, Wifi, WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const UNIT_COLORS: Record<string, string> = {
  available: "border-emerald-500/40 bg-emerald-500/5",
  occupied: "border-red-500/40 bg-red-500/5",
  reserved: "border-blue-500/40 bg-blue-500/5",
  maintenance: "border-slate-600/40 bg-slate-800",
  cleaning: "border-slate-600/40 bg-slate-800",
};

const STATUS_BADGE: Record<string, string> = {
  available: "bg-emerald-500/20 text-emerald-400",
  occupied: "bg-red-500/20 text-red-400",
  reserved: "bg-blue-500/20 text-blue-400",
  maintenance: "bg-slate-500/20 text-slate-400",
  cleaning: "bg-amber-500/20 text-amber-400",
};

function LiveTimer({ start, paidMinutes, pausedMinutes }: { start: string; paidMinutes: number; pausedMinutes: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - new Date(start).getTime()) / 1000) - pausedMinutes * 60);
  const remaining = Math.max(0, paidMinutes * 60 - elapsed);
  const elapsedStr = `${String(Math.floor(elapsed / 3600)).padStart(2, "0")}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const remainingStr = `${String(Math.floor(remaining / 3600)).padStart(2, "0")}:${String(Math.floor((remaining % 3600) / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  return (
    <div className="flex gap-3 text-xs font-mono">
      <span className="text-slate-500">{elapsedStr}</span>
      <span className={remaining < 600 ? "text-red-400 animate-pulse" : "text-emerald-400"}>{remainingStr}</span>
    </div>
  );
}

export default function SessionsDashboardPage() {
  const router = useRouter();
  const features = useAuthStore((s) => s.features);
  const [units, setUnits] = useState<SessionUnit[]>([]);
  const [sessions, setSessions] = useState<TimedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const fetchData = useCallback(() => {
    Promise.all([sessionsApi.listUnits(), sessionsApi.listSessions({ status: "active" })])
      .then(([u, s]) => { setUnits(u); setSessions(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sync timer calibration every 60s
  useEffect(() => {
    const intervalId = setInterval(fetchData, 60000);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  const handleEnd = async (id: number) => {
    try {
      await sessionsApi.endSession(id);
      toast.success("Session ended");
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to end session");
    }
  };

  const handlePause = async (id: number) => {
    try {
      await sessionsApi.pauseSession(id);
      toast.success("Session paused");
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to pause");
    }
  };

  const handleResume = async (id: number) => {
    try {
      await sessionsApi.resumeSession(id);
      toast.success("Session resumed");
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to resume");
    }
  };

  const activeSessionMap = new Map<number, TimedSession>();
  for (const s of sessions) {
    if (s.status === "active" || s.status === "paused") {
      activeSessionMap.set(s.unit.id, s);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-cyan-400" />
            Sessions
          </h1>
          <p className="text-sm text-slate-400">Live session floor plan</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            {connected ? (
              <><Wifi className="h-3 w-3 text-emerald-400" /> Live</>
            ) : (
              <><WifiOff className="h-3 w-3 text-slate-600" /></>
            )}
          </div>
          <Button onClick={() => router.push("/sessions/new")}>
            <Plus className="h-4 w-4 mr-1" /> Start Session
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Available</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Occupied</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" /> Reserved</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-500" /> Maintenance</span>
      </div>

      {/* Floor plan grid */}
      {units.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800 p-12 text-center">
          <Gamepad2 className="h-12 w-12 mx-auto text-slate-700 mb-3" />
          <p className="text-slate-400 font-medium">No session units configured</p>
          <p className="text-slate-500 text-sm mt-1">Add units in unit management to get started.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/sessions/units")}>
            Manage Units
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {units.map((unit) => {
            const session = activeSessionMap.get(unit.id);
            const isOccupied = unit.status === "occupied" || unit.status === "cleaning";
            const isExpiring = session && (session.paid_duration_minutes * 60 - (Date.now() - new Date(session.actual_start).getTime()) / 1000 + session.total_paused_minutes * 60) < 600;

            return (
              <Card
                key={unit.id}
                className={cn(
                  "p-3 border transition-all cursor-pointer hover:scale-[1.02] group",
                  UNIT_COLORS[unit.status] || "border-slate-800 bg-slate-900",
                  isExpiring && "animate-pulse border-amber-400"
                )}
                onClick={() => session && router.push(`/sessions/${session.id}`)}
              >
                {/* Status dot + name */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium truncate flex-1">{unit.unit_name}</span>
                  <Badge variant="outline" className={cn(
                    "text-[9px] px-1.5 py-0 capitalize",
                    STATUS_BADGE[unit.status] || "text-slate-500"
                  )}>
                    {unit.status}
                  </Badge>
                </div>

                {/* Active session info */}
                {session && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-xs text-slate-300">
                      <User className="h-3 w-3 text-cyan-400" />
                      <span className="truncate">{session.guest_name}</span>
                    </div>
                    <LiveTimer
                      start={session.actual_start}
                      paidMinutes={session.paid_duration_minutes}
                      pausedMinutes={session.total_paused_minutes}
                    />
                    {/* Actions */}
                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[10px]"
                        onClick={(e) => { e.stopPropagation(); router.push(`/sessions/${session.id}`); }}
                      >
                        <Clock className="h-3 w-3 mr-0.5" /> Extend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[10px] text-red-400 hover:text-red-300"
                        onClick={(e) => { e.stopPropagation(); handleEnd(session.id); }}
                      >
                        <Square className="h-3 w-3 mr-0.5" /> End
                      </Button>
                    </div>
                  </div>
                )}

                {/* Available unit — show start button on hover */}
                {unit.status === "available" && (
                  <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      className="w-full h-7 text-[10px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/sessions/new?unit=${unit.id}`);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Start
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
