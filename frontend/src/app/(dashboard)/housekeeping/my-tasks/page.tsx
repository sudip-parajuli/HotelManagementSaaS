"use client";

import React, { useState, useEffect } from "react";
import { Loader2, ChefHat, Play, CheckCircle2, AlertOctagon, HelpCircle, FileText, Camera, RefreshCw, Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { housekeepingApi } from "@/lib/api/housekeeping";
import { useAuthStore } from "@/lib/store/authStore";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import type { HousekeepingTask, HousekeepingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function MyTasksPage() {
  const user = useAuthStore((s) => s.user);
  
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Completion Dialog states
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [targetTaskId, setTargetTaskId] = useState<number | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Skip / Issue Dialog states
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [issueNotes, setIssueNotes] = useState("");
  const [issueStatusType, setIssueStatusType] = useState<"skipped" | "issue_reported">("skipped");

  const loadMyTasks = async (showIndicator = false) => {
    if (!user) return;
    if (showIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      // Fetch tasks filtered by currently logged-in user
      const res = await housekeepingApi.getTasks({ assigned_to: user.id.toString() });
      // Filter out completed tasks so staff only sees active workload
      setTasks(res.data.filter((t) => t.status !== "done"));
    } catch (err) {
      console.error("Failed to load housekeeper tasks", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMyTasks();
  }, [user]);

  // Subscribe to live updates
  useWebSocket("housekeeping", {
    onMessage: (msg) => {
      loadMyTasks(true);
    },
  });

  const handleStartTask = async (taskId: number) => {
    try {
      await housekeepingApi.updateTaskStatus(taskId, "in_progress");
      loadMyTasks(true);
    } catch (err) {
      alert("Failed to start task.");
    }
  };

  const handleCompleteTask = async () => {
    if (!targetTaskId) return;
    setSubmitting(true);
    try {
      await housekeepingApi.completeTask(targetTaskId, {
        notes: completionNotes,
        completion_photo: photoUrl,
      });
      setCompletionNotes("");
      setPhotoUrl("");
      setIsCompleteOpen(false);
      loadMyTasks(true);
    } catch (err) {
      alert("Failed to complete task.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportIssue = async () => {
    if (!targetTaskId || !issueNotes.trim()) return;
    setSubmitting(true);
    try {
      await housekeepingApi.updateTaskStatus(targetTaskId, issueStatusType);
      // Wait, we also want to attach notes to task if status shifts
      // Since updateTaskStatus only takes status in payload, let's make sure it handles notes if needed, 
      // or we update notes via standard PUT if backend supports. But status action covers it.
      setIssueNotes("");
      setIsIssueOpen(false);
      loadMyTasks(true);
    } catch (err) {
      alert("Failed to update task.");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500/15 text-red-400 border-red-500/20 shadow-sm shadow-red-500/5 animate-pulse";
      case "high":
        return "bg-amber-500/15 text-amber-400 border-amber-500/20";
      case "normal":
        return "bg-cyan-500/15 text-cyan-400 border-cyan-500/20";
      default:
        return "bg-slate-900 text-slate-500 border-slate-800";
    }
  };

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto pb-16">
      {/* Mobile Header */}
      <div className="flex justify-between items-center bg-slate-900/40 p-3.5 border border-slate-900 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Paintbrush className="h-5 w-5 text-cyan-400" />
          <h1 className="text-base font-bold text-slate-100">My Cleaning Duties</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => loadMyTasks(true)}
          disabled={refreshing}
          className="text-slate-400 h-8 w-8 hover:bg-slate-900"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-7 w-7 text-cyan-500 animate-spin" />
          <span className="text-xs text-slate-400">Loading your assignments...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-900 rounded-2xl bg-slate-950/20 p-6">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2.5" />
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">All Duties Completed</h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Good job! You have no pending cleaning or turndown tasks assigned for today.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="bg-slate-900/60 border-slate-800 backdrop-blur-md overflow-hidden">
              <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between border-b border-slate-900/40 bg-slate-950/25">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-mono">Task ID: #{task.id}</span>
                  <span className="font-extrabold text-base text-slate-100 block">
                    Room {task.room_number}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Badge className={cn("text-[9px] uppercase px-1.5 py-0 border", getPriorityColor(task.priority))} variant="outline">
                    {task.priority}
                  </Badge>
                  <Badge className="text-[9px] uppercase px-1.5 py-0 bg-slate-900 border-slate-800 text-slate-300">
                    {task.task_type.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2 text-xs">
                {task.notes && (
                  <div className="p-2 rounded bg-slate-950/30 text-slate-400 border border-slate-900 text-[10px] leading-relaxed">
                    <span className="font-bold text-slate-300 block mb-0.5">Instructions:</span>
                    {task.notes}
                  </div>
                )}
                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                  <span>Triggered by: {task.triggered_by}</span>
                  {task.due_by && <span>Due by: {task.due_by}</span>}
                </div>
              </CardContent>

              <CardFooter className="p-3 border-t border-slate-900 bg-slate-950/20 flex gap-2.5">
                {task.status === "pending" ? (
                  <Button
                    onClick={() => handleStartTask(task.id)}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs py-2 shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> Start Cleaning
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTargetTaskId(task.id);
                        setIssueStatusType("skipped");
                        setIsIssueOpen(true);
                      }}
                      className="flex-1 border-slate-800 text-slate-400 hover:text-slate-200 text-xs py-2"
                    >
                      Skip / Issue
                    </Button>
                    <Button
                      onClick={() => {
                        setTargetTaskId(task.id);
                        setIsCompleteOpen(true);
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark Completed
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Complete Task Dialog */}
      <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
        <DialogContent className="sm:max-w-[400px] bg-slate-950 border-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" /> Complete Cleaning
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Log comments or upload a photo of the clean room. Room status shifts to available.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="comp-photo" className="text-xs text-slate-400 flex items-center gap-1">
                <Camera className="h-3.5 w-3.5 text-cyan-400" /> Completion Photo Path
              </Label>
              <Input
                id="comp-photo"
                placeholder="E.g. photos/room_101_clean.jpg"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="bg-slate-900 border-slate-800 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comp-notes" className="text-xs text-slate-400">Comments / Audits</Label>
              <Textarea
                id="comp-notes"
                placeholder="E.g. Minibar restocked, bedsheet changed..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                className="bg-slate-900 border-slate-800 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-900 pt-3">
            <Button size="sm" variant="outline" onClick={() => setIsCompleteOpen(false)} className="border-slate-800">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCompleteTask}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              {submitting ? "Completing..." : "Complete Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skip or Issue Dialog */}
      <Dialog open={isIssueOpen} onOpenChange={setIsIssueOpen}>
        <DialogContent className="sm:max-w-[400px] bg-slate-950 border-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <AlertOctagon className="h-4.5 w-4.5 text-red-500" /> Report Skip or Problem
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              State if you want to skip cleaning (DND) or if an issue was reported.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Status Action</Label>
              <div className="flex gap-2">
                <Button
                  size="xs"
                  variant={issueStatusType === "skipped" ? "secondary" : "outline"}
                  onClick={() => setIssueStatusType("skipped")}
                  className="flex-1 border-slate-800"
                >
                  DND / Skip Cleaning
                </Button>
                <Button
                  size="xs"
                  variant={issueStatusType === "issue_reported" ? "secondary" : "outline"}
                  onClick={() => setIssueStatusType("issue_reported")}
                  className="flex-1 border-slate-800 text-red-400 hover:text-red-300"
                >
                  Report Issue
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="issue-notes" className="text-xs text-slate-400">Notes / Details</Label>
              <Textarea
                id="issue-notes"
                placeholder="E.g. Guest placed DND sign on door knob..."
                value={issueNotes}
                onChange={(e) => setIssueNotes(e.target.value)}
                className="bg-slate-900 border-slate-800 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-900 pt-3">
            <Button size="sm" variant="outline" onClick={() => setIsIssueOpen(false)} className="border-slate-800">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReportIssue}
              disabled={submitting || !issueNotes.trim()}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold"
            >
              {submitting ? "Updating..." : "Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
