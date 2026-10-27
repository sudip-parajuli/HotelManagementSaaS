"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { sessionsApi, TimedSession, LiveStatus } from "@/lib/api/sessions";
import {
  Loader2, ArrowLeft, Clock, Pause, Play, Square,
  DollarSign, User, Phone, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function LiveTimerDisplay({
  start,
  paidMinutes,
  pausedMinutes,
  ended,
  onTick,
}: {
  start: string;
  paidMinutes: number;
  pausedMinutes: number;
  ended?: boolean;
  onTick?: (elapsed: number, remaining: number) => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - new Date(start).getTime()) / 1000) - pausedMinutes * 60);
  const remaining = Math.max(0, paidMinutes * 60 - elapsed);
  const inOverage = remaining <= 0;
  const elapsedStr = `${String(Math.floor(elapsed / 3600)).padStart(2, "0")}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const remainingStr = `${String(Math.floor(remaining / 3600)).padStart(2, "0")}:${String(Math.floor((remaining % 3600) / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  useEffect(() => {
    onTick?.(elapsed, remaining);
  }, [elapsed, remaining, onTick]);

  if (ended) return <span className="text-workspace-500 text-2xl font-mono">--:--:--</span>;

  return (
    <div className="flex items-baseline gap-4">
      <div>
        <div className="text-[10px] text-workspace-500 uppercase tracking-wider">Elapsed</div>
        <div className="text-2xl font-mono font-bold text-foreground">{elapsedStr}</div>
      </div>
      <div className="text-workspace-700 text-2xl font-mono">/</div>
      <div>
        <div className="text-[10px] text-workspace-500 uppercase tracking-wider">Remaining</div>
        <div className={cn(
          "text-2xl font-mono font-bold",
          inOverage ? "text-red-400 animate-pulse" : remaining < 600 ? "text-amber-400" : "text-emerald-400"
        )}>
          {inOverage ? `+${Math.floor(Math.abs(remaining) / 60)}min overage` : remainingStr}
        </div>
      </div>
    </div>
  );
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [session, setSession] = useState<TimedSession | null>(null);
  const [live, setLive] = useState<LiveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [extendMinutes, setExtendMinutes] = useState(30);

  const fetchData = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([
        sessionsApi.getSession(id),
        sessionsApi.liveStatus(id),
      ]);
      setSession(s);
      setLive(l);
    } catch {
      toast.error("Session not found");
      router.push("/sessions");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Recalibrate every 60s
  useEffect(() => {
    const intervalId = setInterval(() => {
      sessionsApi.liveStatus(Number(params.id)).then(setLive).catch(() => {});
    }, 60000);
    return () => clearInterval(intervalId);
  }, [params.id]);

  const handleAction = async (action: string, fn: () => Promise<any>) => {
    setActionLoading(action);
    try {
      await fn();
      toast.success(`Session ${action}ed`);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
      </div>
    );
  }

  if (!session) return null;

  const isActive = session.status === "active";
  const isPaused = session.status === "paused";
  const isEnded = session.status === "ended";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push("/sessions")}
        className="flex items-center gap-1 text-sm text-workspace-400 hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main — Timer + Actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Session header */}
          <Card className="bg-workspace-900 border-workspace-800 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold">{session.unit.unit_name}</h1>
                  <Badge className={cn(
                    isActive && "bg-emerald-500/20 text-emerald-400",
                    isPaused && "bg-amber-500/20 text-amber-400",
                    isEnded && "bg-workspace-500/20 text-workspace-400",
                  )}>
                    {session.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-workspace-400 mt-1">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> {session.guest_name}</span>
                  {session.guest_phone && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {session.guest_phone}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Live timer */}
            <LiveTimerDisplay
              start={session.actual_start}
              paidMinutes={session.paid_duration_minutes}
              pausedMinutes={session.total_paused_minutes}
              ended={isEnded}
            />
          </Card>

          {/* Action buttons */}
          {!isEnded && (
            <Card className="bg-workspace-900 border-workspace-800 p-4">
              <div className="flex flex-wrap gap-2">
                {isActive && (
                  <Button
                    variant="outline"
                    onClick={() => handleAction("pause", () => sessionsApi.pauseSession(id))}
                    disabled={actionLoading === "pause"}
                    className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  >
                    {actionLoading === "pause" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4 mr-1" />}
                    Pause
                  </Button>
                )}
                {isPaused && (
                  <Button
                    onClick={() => handleAction("resume", () => sessionsApi.resumeSession(id))}
                    disabled={actionLoading === "resume"}
                  >
                    {actionLoading === "resume" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                    Resume
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => handleAction("end", () => sessionsApi.endSession(id))}
                  disabled={actionLoading === "end"}
                >
                  {actionLoading === "end" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4 mr-1" />}
                  End Session
                </Button>
              </div>

              {/* Extend */}
              {(isActive || isPaused) && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-workspace-800">
                  <Input
                    type="number"
                    value={extendMinutes}
                    onChange={(e) => setExtendMinutes(parseInt(e.target.value) || 0)}
                    className="bg-workspace-950 border-workspace-800 w-20 text-sm"
                    min={1}
                  />
                  <span className="text-xs text-workspace-500">min</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction("extend", () => sessionsApi.extendSession(id, extendMinutes))}
                    disabled={actionLoading === "extend"}
                  >
                    {actionLoading === "extend" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5 mr-1" />}
                    Extend
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Charges */}
          <Card className="bg-workspace-900 border-workspace-800 p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-brand-400" /> Charges
            </h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-workspace-400">Base amount ({session.paid_duration_minutes} min paid)</span>
                <span>NPR {parseFloat(session.base_amount).toLocaleString("en-IN")}</span>
              </div>
              {session.overage_minutes > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Overage ({session.overage_minutes} min)</span>
                  <span>+ NPR {parseFloat(session.overage_amount).toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-workspace-800 pt-1.5 mt-1.5">
                <span>Total</span>
                <span>NPR {parseFloat(session.total_amount).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar — Live info + history */}
        <div className="space-y-4">
          {/* Live status */}
          {live && (
            <Card className="bg-workspace-900 border-workspace-800 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-workspace-500 mb-3">Live Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-workspace-400">Elapsed</span>
                  <span>{live.elapsed_minutes} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-workspace-400">Remaining</span>
                  <span className={live.remaining_minutes < 10 ? "text-red-400" : "text-emerald-400"}>
                    {live.remaining_minutes} min
                  </span>
                </div>
                {live.overage_minutes > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Overage</span>
                    <span>{live.overage_minutes} min</span>
                  </div>
                )}
                {live.paused && (
                  <div className="flex justify-between text-amber-400">
                    <span>Paused</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Extension history — shown when extensions field is populated */}
          {(session as any).extensions && (session as any).extensions.length > 0 && (
            <Card className="bg-workspace-900 border-workspace-800 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-workspace-500 mb-3 flex items-center gap-1">
                <History className="h-3 w-3" /> Extensions
              </h3>
              <div className="space-y-1.5">
                {(session as any).extensions.map((ext: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-workspace-400">+{ext.extended_by_minutes} min</span>
                    <span className="text-workspace-500">NPR {parseFloat(ext.additional_amount || "0").toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
