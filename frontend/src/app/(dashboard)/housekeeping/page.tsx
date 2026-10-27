"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Paintbrush, Layers, CheckSquare, RefreshCw, AlertTriangle, ShieldCheck, UserCheck, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { housekeepingApi } from "@/lib/api/housekeeping";
import { authApi } from "@/lib/api/auth";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import type { HousekeepingBoardRoom, UserProfile, MaintenanceRequest, MaintenanceCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

const CATEGORIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "furniture", label: "Furniture" },
  { value: "ac", label: "AC / HVAC" },
  { value: "other", label: "Other" },
];

export default function HousekeepingManagerPage() {
  const [boardRooms, setBoardRooms] = useState<HousekeepingBoardRoom[]>([]);
  const [housekeepers, setHousekeepers] = useState<UserProfile[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"board" | "maintenance">("board");

  const t = useTranslations("Housekeeping");
  const tData = useTransData();
  const locale = useLocale();

  // Selection states for bulk assignment
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [assignedStaffId, setAssignedStaffId] = useState<string>("none");

  // Modals
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState<number | null>(null);
  const [mCategory, setMCategory] = useState<MaintenanceCategory>("other");
  const [mDescription, setMDescription] = useState("");

  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [targetReqId, setTargetReqId] = useState<number | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Load metrics & lists
  const loadData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      const [boardRes, usersRes, maintRes] = await Promise.all([
        housekeepingApi.getBoard(),
        authApi.listUsers(),
        apiClient.get<MaintenanceRequest[]>("/housekeeping/maintenance/"),
      ]);

      setBoardRooms(boardRes.data);
      setHousekeepers(usersRes.data.filter((u) => u.role === "HOUSEKEEPING" && u.is_active));
      setMaintenanceRequests(maintRes.data);
    } catch (err) {
      console.error("Failed to load housekeeping dashboard data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMaintenance = async () => {
    try {
      const res = await housekeepingApi.createMaintenanceRequest({ room_id: 0, category: "other", description: "" });
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time updates via WebSocket
  useWebSocket("housekeeping", {
    onMessage: (msg) => {
      loadData(true);
    },
    onOpen: () => console.log("Connected to Housekeeping WebSocket Channel"),
  });

  // Bulk assignment logic
  const handleBulkAssign = async () => {
    if (selectedRoomIds.length === 0 || assignedStaffId === "none") return;
    setSubmitting(true);
    try {
      const taskIds: number[] = [];
      const roomsToAssign = boardRooms.filter((r) => selectedRoomIds.includes(r.room_id));
      
      const pendingTaskRooms = roomsToAssign.filter((r) => r.active_task);
      taskIds.push(...pendingTaskRooms.map((r) => r.active_task!.id));

      if (taskIds.length === 0) {
        alert(locale === "ne" 
          ? "चयन गरिएका कोठाहरूमा कुनै सक्रिय सफाइ कार्यहरू छैनन्। केवल बाँकी रहेका सफाइ कार्यहरू भएका कोठाहरू मात्र तोक्न सकिन्छ।"
          : "Selected rooms do not have any active housekeeping tasks. Only rooms with pending cleaning tasks can be assigned.");
        setSubmitting(false);
        return;
      }

      await housekeepingApi.bulkAssignTasks({
        task_ids: taskIds,
        assigned_to_id: parseInt(assignedStaffId),
      });

      setSelectedRoomIds([]);
      setAssignedStaffId("none");
      loadData(true);
    } catch (err) {
      alert("Failed to assign tasks.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMaintenance = async () => {
    if (!targetRoomId || !mDescription.trim()) return;
    setSubmitting(true);
    try {
      await housekeepingApi.createMaintenanceRequest({
        room_id: targetRoomId,
        category: mCategory,
        description: mDescription,
      });
      setMDescription("");
      setIsMaintenanceOpen(false);
      loadData(true);
    } catch (err) {
      alert("Failed to log maintenance request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveMaintenance = async () => {
    if (!targetReqId || !resolutionNotes.trim()) return;
    setSubmitting(true);
    try {
      await housekeepingApi.resolveMaintenanceRequest(targetReqId, {
        resolution_notes: resolutionNotes,
      });
      setResolutionNotes("");
      setIsResolveOpen(false);
      loadData(true);
    } catch (err) {
      alert("Failed to resolve maintenance issue.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelectRoom = (roomId: number) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "border-emerald-500/30 text-emerald-400 bg-emerald-500/5";
      case "dirty":
        return "border-rose-500/30 text-rose-400 bg-rose-500/5";
      case "maintenance":
        return "border-slate-800 text-slate-400 bg-slate-900/50";
      case "occupied":
        return "border-cyan-500/30 text-cyan-400 bg-cyan-500/5";
      default:
        return "border-slate-900 text-slate-500 bg-slate-950";
    }
  };

  const roomsByFloor = React.useMemo(() => {
    const floors: Record<number, HousekeepingBoardRoom[]> = {};
    boardRooms.forEach((r) => {
      if (!floors[r.floor]) floors[r.floor] = [];
      floors[r.floor].push(r);
    });
    return floors;
  }, [boardRooms]);

  const stats = React.useMemo(() => {
    const total = boardRooms.length;
    const clean = boardRooms.filter((r) => r.status === "available").length;
    const dirty = boardRooms.filter((r) => r.status === "dirty").length;
    const maint = boardRooms.filter((r) => r.status === "maintenance").length;
    const cleaning = boardRooms.filter((r) => r.active_task?.status === "in_progress").length;
    return { total, clean, dirty, maint, cleaning };
  }, [boardRooms]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-4 border border-slate-900 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/20">
            <Paintbrush className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">{t("title")}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{t("subtitle")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "board" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("board")}
            className="border-slate-800 text-xs"
          >
            {locale === "ne" ? "कोठाहरूको बोर्ड" : "Rooms Board"}
          </Button>
          <Button
            variant={activeTab === "maintenance" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("maintenance")}
            className="border-slate-800 text-xs"
          >
            {locale === "ne" ? "मर्मतसम्भार अनुरोधहरू" : "Maintenance Requests"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="text-slate-400 hover:text-slate-100 h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
          <span className="text-sm text-slate-400">
            {locale === "ne" ? "हाउसकिपिङ बोर्ड लोड हुँदैछ..." : "Loading housekeeping board..."}
          </span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-slate-900/50 border-slate-900">
              <CardContent className="p-4 flex flex-col justify-center">
                <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">
                  {locale === "ne" ? "जम्मा कोठाहरू" : "Total Rooms"}
                </span>
                <span className="text-2xl font-bold text-slate-100 mt-1">{stats.total}</span>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-900">
              <CardContent className="p-4 flex flex-col justify-center">
                <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">
                  {locale === "ne" ? "सफा / उपलब्ध" : "Clean / Available"}
                </span>
                <span className="text-2xl font-bold text-emerald-400 mt-1">{stats.clean}</span>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-900">
              <CardContent className="p-4 flex flex-col justify-center">
                <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">
                  {locale === "ne" ? "फोहोर / चेक-आउट" : "Dirty / Check-outs"}
                </span>
                <span className="text-2xl font-bold text-rose-400 mt-1">{stats.dirty}</span>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-900">
              <CardContent className="p-4 flex flex-col justify-center">
                <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">
                  {locale === "ne" ? "सफाइ हुँदै" : "In Cleaning"}
                </span>
                <span className="text-2xl font-bold text-blue-400 mt-1">{stats.cleaning}</span>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-900">
              <CardContent className="p-4 flex flex-col justify-center">
                <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">
                  {locale === "ne" ? "मर्मतसम्भार" : "Maintenance"}
                </span>
                <span className="text-2xl font-bold text-slate-400 mt-1">{stats.maint}</span>
              </CardContent>
            </Card>
          </div>

          {activeTab === "board" ? (
            <div className="space-y-6">
              {selectedRoomIds.length > 0 && (
                <div className="p-4 bg-slate-900/60 border border-cyan-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-250">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-cyan-400" />
                    <span className="text-sm font-semibold text-slate-200">
                      {locale === "ne" 
                        ? `${selectedRoomIds.length} कोठाहरू सफाइका लागि छानिएका छन्` 
                        : `${selectedRoomIds.length} rooms selected for cleaning assignment`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <Select value={assignedStaffId} onValueChange={(val) => setAssignedStaffId(val || "none")}>
                      <SelectTrigger className="w-[180px] bg-slate-950 border-slate-800 text-xs h-9">
                        <SelectValue placeholder={locale === "ne" ? "हाउसकिपर तोक्नुहोस्" : "Assign housekeeper"}>
                          {(value) => {
                            if (value === "none") return locale === "ne" ? "कर्मचारी छान्नुहोस्..." : "Choose Staff...";
                            const hk = housekeepers.find((h) => h.id.toString() === value);
                            return hk ? hk.full_name : value || "";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                        <SelectItem value="none">
                          {locale === "ne" ? "कर्मचारी छान्नुहोस्..." : "Choose Staff..."}
                        </SelectItem>
                        {housekeepers.map((hk) => (
                          <SelectItem key={hk.id} value={hk.id.toString()}>
                            {hk.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      onClick={handleBulkAssign}
                      disabled={submitting || assignedStaffId === "none"}
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
                    >
                      {submitting 
                        ? (locale === "ne" ? "तोकिँदै..." : "Assigning...") 
                        : (locale === "ne" ? "जिम्मेवारी तोक्नुहोस्" : "Assign Tasks")}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedRoomIds([])}
                      size="sm"
                      className="text-slate-400 hover:text-slate-200"
                    >
                      {locale === "ne" ? "रद्द गर्नुहोस्" : "Cancel"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-8">
                {Object.entries(roomsByFloor).map(([floor, rooms]) => (
                  <div key={floor} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                      <Layers className="h-4 w-4 text-cyan-500" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {locale === "ne" ? `${floor} तल्ला` : `Floor ${floor}`}
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {rooms.map((room) => {
                        const isSelected = selectedRoomIds.includes(room.room_id);
                        return (
                          <Card
                            key={room.room_id}
                            className={cn(
                              "relative group border transition-all duration-300 overflow-hidden bg-slate-900/40 hover:shadow-md hover:border-slate-700",
                              isSelected ? "ring-1 ring-cyan-500/70 border-cyan-500 bg-cyan-500/[0.01]" : ""
                            )}
                          >
                            <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between bg-slate-950/20 border-b border-slate-900/40">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectRoom(room.room_id)}
                                  className="h-3.5 w-3.5 rounded border-slate-800 bg-slate-950 text-cyan-500 accent-cyan-500 cursor-pointer focus:ring-offset-0 focus:ring-0"
                                />
                                <span className="font-extrabold text-sm text-slate-100">
                                  {locale === "ne" ? `कोठा ${room.room_number}` : `Room ${room.room_number}`}
                                </span>
                              </div>
                              <Badge className={cn("text-[8.5px] uppercase px-1.5 py-0 border", getStatusColor(room.status))} variant="outline">
                                {tData(room.status)}
                              </Badge>
                            </CardHeader>
                            <CardContent className="p-3.5 space-y-3 text-xs">
                              <div className="text-[10px] text-slate-500 font-medium">
                                {locale === "ne" ? "प्रकार: " : "Type: "} {tData(room.room_type_name)}
                              </div>

                              {room.active_task ? (
                                <div className="space-y-1.5 p-2 bg-slate-950/40 rounded-lg border border-slate-900/50">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">
                                      {tData(room.active_task.task_type)}
                                    </span>
                                    <Badge
                                      className={`text-[8.5px] px-1 py-0 capitalize ${
                                        room.active_task.status === "in_progress"
                                          ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
                                          : "bg-amber-500/15 text-amber-400 border-amber-500/20"
                                      }`}
                                    >
                                      {tData(room.active_task.status)}
                                    </Badge>
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <UserCheck className="h-3 w-3 text-cyan-500" />
                                    <span>
                                      {room.active_task.assigned_to_name || (locale === "ne" ? "तोकिएको छैन" : "Unassigned")}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-600 italic py-2">
                                  {locale === "ne" ? "कुनै सक्रिय कार्य छैन" : "No active cleaning task"}
                                </div>
                              )}
                            </CardContent>

                            <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              {room.status !== "maintenance" && (
                                <Button
                                  size="xs"
                                  onClick={() => {
                                    setTargetRoomId(room.room_id);
                                    setIsMaintenanceOpen(true);
                                  }}
                                  className="h-6 px-2 text-[9px] bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/65"
                                >
                                  {locale === "ne" ? "मर्मत" : "Maint."}
                                </Button>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto bg-slate-900/20 border border-slate-900 rounded-xl p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="pb-3.5 pl-2">{locale === "ne" ? "कोठा" : "Room"}</th>
                    <th className="pb-3.5">{locale === "ne" ? "वर्ग" : "Category"}</th>
                    <th className="pb-3.5">{locale === "ne" ? "विवरण" : "Description"}</th>
                    <th className="pb-3.5">{locale === "ne" ? "रिपोर्ट गर्ने" : "Reported By"}</th>
                    <th className="pb-3.5">{locale === "ne" ? "स्थिति" : "Status"}</th>
                    <th className="pb-3.5">{locale === "ne" ? "समाधान विवरण" : "Resolution Notes"}</th>
                    <th className="pb-3.5 pr-2 text-right">{locale === "ne" ? "कार्यहरू" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {maintenanceRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500 italic">
                        {locale === "ne" ? "कुनै मर्मतसम्भार अनुरोधहरू दर्ता छैनन्।" : "No maintenance requests recorded."}
                      </td>
                    </tr>
                  ) : (
                    maintenanceRequests.map((req) => (
                      <tr key={req.id} className="text-slate-300 hover:bg-slate-950/20">
                        <td className="py-3.5 pl-2 font-bold text-slate-200">
                          {locale === "ne" ? `कोठा ${req.room_number}` : `Room ${req.room_number}`}
                        </td>
                        <td className="py-3.5 capitalize font-medium">{tData(req.category)}</td>
                        <td className="py-3.5 max-w-[200px] truncate">{req.description}</td>
                        <td className="py-3.5 text-slate-400">{req.reported_by_name}</td>
                        <td className="py-3.5">
                          <Badge
                            className={`capitalize text-[9px] px-1.5 py-0.5 border ${
                              req.status === "resolved"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : req.status === "in_progress"
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}
                          >
                            {tData(req.status)}
                          </Badge>
                        </td>
                        <td className="py-3.5 max-w-[200px] truncate text-slate-400">
                          {req.resolution_notes || "N/A"}
                        </td>
                        <td className="py-3.5 pr-2 text-right">
                          {req.status !== "resolved" && (
                            <Button
                              size="xs"
                              onClick={() => {
                                setTargetReqId(req.id);
                                setIsResolveOpen(true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] h-6"
                            >
                              {locale === "ne" ? "समाधान" : "Resolve"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Dialog open={isMaintenanceOpen} onOpenChange={setIsMaintenanceOpen}>
        <DialogContent className="sm:max-w-[420px] bg-slate-950 border-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
              {locale === "ne" ? "मर्मतसम्भार समस्या दर्ता गर्नुहोस्" : "Report Maintenance Issue"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              {locale === "ne" 
                ? "कोठा स्वतः 'मर्मतसम्भार' स्थितिमा परिणत हुनेछ र मर्मत टिकट सिर्जना हुनेछ।"
                : "Room status transitions automatically to 'maintenance' and logs a repair ticket."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">{locale === "ne" ? "वर्ग" : "Category"}</Label>
              <Select
                value={mCategory}
                onValueChange={(val) => setMCategory(val as MaintenanceCategory)}
              >
                <SelectTrigger className="bg-slate-900 border-slate-800 text-xs text-slate-200">
                  <SelectValue placeholder="Select category">
                    {(value) => {
                      const c = CATEGORIES.find(item => item.value === value);
                      if (c) return locale === "ne" ? tData(c.value) : c.label;
                      return value || "";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">
                      {locale === "ne" ? tData(c.value) : c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-desc" className="text-xs text-slate-400">
                {locale === "ne" ? "समस्याको विवरण" : "Issue Specification"}
              </Label>
              <Textarea
                id="m-desc"
                placeholder={locale === "ne" ? "जस्तै: ढल चुहावट, AC ले आवाज निकाल्दैछ..." : "E.g. Leaking toilet pipe, AC compressor makes noise..."}
                value={mDescription}
                onChange={(e) => setMDescription(e.target.value)}
                className="bg-slate-900 border-slate-800 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-900 pt-3">
            <Button size="sm" variant="outline" onClick={() => setIsMaintenanceOpen(false)} className="border-slate-800">
              {locale === "ne" ? "रद्द गर्नुहोस्" : "Cancel"}
            </Button>
            <Button
              size="sm"
              onClick={handleCreateMaintenance}
              disabled={submitting || !mDescription.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
            >
              {submitting 
                ? (locale === "ne" ? "दर्ता हुँदै..." : "Reporting...") 
                : (locale === "ne" ? "समस्या दर्ता गर्नुहोस्" : "Report Issue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isResolveOpen} onOpenChange={setIsResolveOpen}>
        <DialogContent className="sm:max-w-[420px] bg-slate-950 border-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              {locale === "ne" ? "मर्मतसम्भार अनुरोध समाधान गर्नुहोस्" : "Resolve Repair Request"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              {locale === "ne" 
                ? "यो अनुरोध समाधान भएको रूपमा चिन्ह लगाउनुहोस्। कोठा सफाइ जाँचको लागि पुनः 'फोहोर' स्थितिमा जानेछ।"
                : "Mark this request as resolved. Room status transitions back to 'dirty' for cleaning check."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2">
            <Label htmlFor="res-notes" className="text-xs text-slate-400">
              {locale === "ne" ? "समाधान विवरण" : "Resolution Logs"}
            </Label>
            <Textarea
              id="res-notes"
              placeholder={locale === "ne" ? "के कस्तो मर्मत कार्य गरियो विवरण उल्लेख गर्नुहोस्..." : "Detail what repairs were conducted..."}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="bg-slate-900 border-slate-800 text-xs"
            />
          </div>

          <DialogFooter className="border-t border-slate-900 pt-3">
            <Button size="sm" variant="outline" onClick={() => setIsResolveOpen(false)} className="border-slate-800">
              {locale === "ne" ? "रद्द गर्नुहोस्" : "Cancel"}
            </Button>
            <Button
              size="sm"
              onClick={handleResolveMaintenance}
              disabled={submitting || !resolutionNotes.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              {submitting 
                ? (locale === "ne" ? "समाधान हुँदै..." : "Resolving...") 
                : (locale === "ne" ? "समाधान सम्पन्न" : "Complete Resolve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { apiClient } from "@/lib/api/client";
