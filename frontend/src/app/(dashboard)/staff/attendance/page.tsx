"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  User, 
  Clock, 
  MapPin, 
  Check,
  FileSpreadsheet,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { hrApi } from "@/lib/api/hr";
import { staffApi } from "@/lib/api/staff";
import type { Attendance, StaffMember, AttendanceStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AttendancePage() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Clock Console
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [enteredPin, setEnteredPin] = useState<string>("");
  const [consoleMessage, setConsoleMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Month & Year Filter
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, attRes] = await Promise.all([
        staffApi.listStaffMembers({ is_active: true }),
        hrApi.listAttendance({
          month: currentMonth,
          year: currentYear
        })
      ]);
      setMembers(staffRes.data.results || []);
      setAttendanceLogs(attRes.data.results || []);
    } catch (err) {
      console.error("Error loading attendance data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentMonth, currentYear]);

  const handlePinBtnClick = (num: string) => {
    if (enteredPin.length < 4) {
      setEnteredPin(enteredPin + num);
    }
  };

  const handlePinClear = () => {
    setEnteredPin("");
  };

  const handleClockIn = async () => {
    if (!selectedStaffId || enteredPin.length !== 4) return;
    setConsoleMessage(null);
    try {
      const res = await hrApi.clockIn(parseInt(selectedStaffId), enteredPin);
      setConsoleMessage({
        text: `Success! Clocked in at ${format(new Date(res.data.clock_in!), "hh:mm a")}`,
        success: true
      });
      setEnteredPin("");
      fetchData();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Clock-in failed. Please verify your PIN.";
      setConsoleMessage({ text: errMsg, success: false });
    }
  };

  const handleClockOut = async () => {
    if (!selectedStaffId || enteredPin.length !== 4) return;
    setConsoleMessage(null);
    try {
      const res = await hrApi.clockOut(parseInt(selectedStaffId), enteredPin);
      setConsoleMessage({
        text: `Success! Clocked out at ${format(new Date(res.data.clock_out!), "hh:mm a")}. Overtime: ${res.data.overtime_hours} hrs.`,
        success: true
      });
      setEnteredPin("");
      fetchData();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Clock-out failed. Please verify your PIN.";
      setConsoleMessage({ text: errMsg, success: false });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Attendance logs & Clock Console
        </h1>
        <p className="text-muted-foreground text-sm">
          PIN checking, check-in timestamps, and overtime metrics calculation sheets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Clock-in Console */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-slate-900/30 border-slate-800/80 shadow-2xl backdrop-blur-md">
            <CardHeader className="pb-4 border-b border-slate-900">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-400" />
                Staff Terminal
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Select your name and enter your 4-digit PIN to clock in or out.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Select Staff */}
              <div className="space-y-1">
                <Label htmlFor="cstaff" className="text-xs text-slate-400">Select Employee</Label>
                <select 
                  id="cstaff"
                  value={selectedStaffId}
                  onChange={(e) => {
                    setSelectedStaffId(e.target.value);
                    setConsoleMessage(null);
                  }}
                  className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none"
                >
                  <option value="">Choose your profile...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>

              {/* PIN Display */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">PIN Entry Code</Label>
                <div className="h-12 w-full bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center gap-3 font-mono text-2xl font-bold tracking-widest text-white">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <span key={idx} className={idx < enteredPin.length ? "text-indigo-400" : "text-slate-800"}>
                      {idx < enteredPin.length ? "●" : "○"}
                    </span>
                  ))}
                </div>
              </div>

              {/* PIN Pad 0-9 */}
              <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto pt-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <Button 
                    key={num} 
                    type="button" 
                    onClick={() => handlePinBtnClick(num)} 
                    variant="outline" 
                    className="h-11 border-slate-850 bg-slate-900/40 text-white hover:bg-slate-800 text-lg font-bold"
                  >
                    {num}
                  </Button>
                ))}
                <Button 
                  type="button" 
                  onClick={handlePinClear} 
                  variant="ghost" 
                  className="h-11 text-red-400 hover:text-red-300 font-bold"
                >
                  Clear
                </Button>
                <Button 
                  type="button" 
                  onClick={() => handlePinBtnClick("0")} 
                  variant="outline" 
                  className="h-11 border-slate-850 bg-slate-900/40 text-white hover:bg-slate-800 text-lg font-bold"
                >
                  0
                </Button>
                <div />
              </div>

              {/* Console message block */}
              {consoleMessage && (
                <div className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs ${
                  consoleMessage.success 
                    ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400"
                    : "bg-red-950/20 border-red-500/20 text-red-400"
                }`}>
                  {consoleMessage.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span>{consoleMessage.text}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4 pt-3">
                <Button 
                  onClick={handleClockIn} 
                  disabled={!selectedStaffId || enteredPin.length !== 4}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white h-10 font-bold"
                >
                  Clock In
                </Button>
                <Button 
                  onClick={handleClockOut} 
                  disabled={!selectedStaffId || enteredPin.length !== 4}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white h-10 font-bold"
                >
                  Clock Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Attendance Logs List */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-slate-900/20 border-slate-800/60 shadow-xl overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-900/60 flex flex-row flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-white">Daily Attendance Records</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Roster logs, hours logged, and manual overrides.</CardDescription>
              </div>

              {/* Month/Year selectors */}
              <div className="flex items-center gap-2">
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                  className="h-8 px-2 rounded bg-slate-950 border border-slate-800 text-white text-xs font-semibold"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {format(new Date(2026, i, 1), "MMMM")}
                    </option>
                  ))}
                </select>
                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                  className="h-8 px-2 rounded bg-slate-950 border border-slate-800 text-white text-xs font-semibold"
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
                </div>
              ) : attendanceLogs.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <Calendar className="h-10 w-10 text-slate-600 mx-auto" />
                  <p className="text-slate-400 text-sm">No attendance records registered for this month</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-400 font-semibold bg-slate-950/10">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Clock In</th>
                      <th className="py-3 px-4">Clock Out</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Overtime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceLogs.map((log) => {
                      const isAbsent = log.status === "absent";
                      const isLeave = log.status === "leave";
                      return (
                        <tr key={log.id} className="border-b border-slate-900/50 hover:bg-slate-950/10 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-400">{log.date}</td>
                          <td className="py-3 px-4 font-bold text-white text-sm">{log.staff_name}</td>
                          <td className="py-3 px-4 text-slate-300 font-mono font-medium">
                            {log.clock_in ? format(new Date(log.clock_in), "hh:mm a") : "—"}
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono font-medium">
                            {log.clock_out ? format(new Date(log.clock_out), "hh:mm a") : "—"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge 
                              variant="outline" 
                              className={`capitalize ${
                                isAbsent 
                                  ? "border-red-500/20 text-red-500 bg-red-500/5"
                                  : isLeave
                                  ? "border-blue-500/20 text-blue-400 bg-blue-500/5"
                                  : "border-emerald-500/20 text-emerald-500 bg-emerald-500/5"
                              }`}
                            >
                              {log.status.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-indigo-400">
                            {parseFloat(log.overtime_hours) > 0 ? `${log.overtime_hours} hrs` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
