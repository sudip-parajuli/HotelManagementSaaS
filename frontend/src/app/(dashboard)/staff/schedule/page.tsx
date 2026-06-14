"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Trash2
} from "lucide-react";
import { format, startOfWeek, addDays, subDays } from "date-fns";
import { hrApi } from "@/lib/api/hr";
import { staffApi } from "@/lib/api/staff";
import type { Shift, StaffMember, Department } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function ShiftSchedulePage() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday start
  );
  
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog: Assign Shift
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ staff: StaffMember; date: Date } | null>(null);
  const [selectedShiftForEdit, setSelectedShiftForEdit] = useState<Shift | null>(null);

  // Form
  const [formData, setFormData] = useState({
    start_time: "09:00",
    end_time: "17:00",
    department: "",
    is_confirmed: true,
    notes: ""
  });

  // Generate 7 days of current week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, deptsRes, shiftsRes] = await Promise.all([
        staffApi.listStaffMembers({ is_active: true }),
        staffApi.listDepartments(),
        hrApi.listShifts({
          start_date: format(currentWeekStart, "yyyy-MM-dd"),
          end_date: format(addDays(currentWeekStart, 6), "yyyy-MM-dd")
        })
      ]);
      setMembers(staffRes.data.results || []);
      setDepartments(deptsRes.data.results || []);
      setShifts(shiftsRes.data.results || []);
    } catch (err) {
      console.error("Error loading scheduling data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentWeekStart]);

  const handlePrevWeek = () => {
    setCurrentWeekStart(subDays(currentWeekStart, 7));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const handleTodayWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const handleCellClick = (staff: StaffMember, dayDate: Date) => {
    const formattedDate = format(dayDate, "yyyy-MM-dd");
    const existingShift = shifts.find(
      (s) => s.staff === staff.id && s.date === formattedDate
    );

    setSelectedCell({ staff, date: dayDate });

    if (existingShift) {
      setSelectedShiftForEdit(existingShift);
      setFormData({
        start_time: existingShift.start_time.slice(0, 5),
        end_time: existingShift.end_time.slice(0, 5),
        department: existingShift.department.toString(),
        is_confirmed: existingShift.is_confirmed,
        notes: existingShift.notes || ""
      });
    } else {
      setSelectedShiftForEdit(null);
      setFormData({
        start_time: "09:00",
        end_time: "17:00",
        department: staff.department.toString(),
        is_confirmed: true,
        notes: ""
      });
    }

    setIsAssignOpen(true);
  };

  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell) return;

    const formattedDate = format(selectedCell.date, "yyyy-MM-dd");
    const payload = {
      staff: selectedCell.staff.id,
      date: formattedDate,
      start_time: `${formData.start_time}:00`,
      end_time: `${formData.end_time}:00`,
      department: parseInt(formData.department),
      is_confirmed: formData.is_confirmed,
      notes: formData.notes
    };

    try {
      if (selectedShiftForEdit) {
        await hrApi.updateShift(selectedShiftForEdit.id, payload);
      } else {
        await hrApi.createShift(payload);
      }
      setIsAssignOpen(false);
      fetchData();
    } catch (err) {
      console.error("Error saving shift", err);
    }
  };

  const handleShiftDelete = async () => {
    if (!selectedShiftForEdit) return;
    try {
      await hrApi.deleteShift(selectedShiftForEdit.id);
      setIsAssignOpen(false);
      fetchData();
    } catch (err) {
      console.error("Error deleting shift", err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Shift Schedule Roster
          </h1>
          <p className="text-muted-foreground text-sm">
            Planning, verifying, and dispatching weekly employee shifts per department.
          </p>
        </div>
        
        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <Button onClick={handlePrevWeek} size="icon" variant="outline" className="border-slate-800 hover:bg-slate-800 text-white">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button onClick={handleTodayWeek} size="sm" variant="outline" className="border-slate-800 hover:bg-slate-800 text-white font-medium">
            This Week
          </Button>
          <Button onClick={handleNextWeek} size="icon" variant="outline" className="border-slate-800 hover:bg-slate-800 text-white">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-xs text-slate-400 font-bold ml-2">
            {format(currentWeekStart, "MMM d")} – {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
          </span>
        </div>
      </div>

      {/* Grid calendar */}
      <Card className="bg-slate-900/20 border-slate-800/60 shadow-xl overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <table className="w-full border-collapse text-left min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-950/20 text-slate-400 text-xs font-semibold">
                  <th className="py-4 px-4 w-[200px] border-r border-slate-900">Staff Member</th>
                  {weekDays.map((day) => {
                    const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                    return (
                      <th 
                        key={day.toISOString()} 
                        className={`py-3 px-3 text-center border-r border-slate-900 last:border-r-0 ${
                          isToday ? "bg-indigo-950/10 text-indigo-400" : ""
                        }`}
                      >
                        <div className="font-bold">{format(day, "eee")}</div>
                        <div className="text-[10px] mt-0.5">{format(day, "MMM d")}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {members.map((staff) => (
                  <tr key={staff.id} className="border-b border-slate-900/60 hover:bg-slate-950/5 transition-colors text-xs">
                    {/* Staff name */}
                    <td className="py-3 px-4 font-semibold text-white border-r border-slate-900 bg-slate-950/5">
                      <div className="font-bold text-sm">{staff.full_name}</div>
                      <div className="text-slate-500 text-[10px]">{staff.designation}</div>
                    </td>
                    
                    {/* Days */}
                    {weekDays.map((day) => {
                      const formattedDate = format(day, "yyyy-MM-dd");
                      const shift = shifts.find(
                        (s) => s.staff === staff.id && s.date === formattedDate
                      );
                      
                      return (
                        <td 
                          key={day.toISOString()}
                          onClick={() => handleCellClick(staff, day)}
                          className="p-2 border-r border-slate-900 last:border-r-0 text-center cursor-pointer select-none vertical-middle h-[70px] min-w-[100px] hover:bg-indigo-950/5 transition-colors"
                        >
                          {shift ? (
                            <div className={`p-1.5 rounded-lg border text-[11px] leading-tight space-y-1 ${
                              shift.is_confirmed 
                                ? "bg-indigo-950/20 border-indigo-500/20 text-indigo-300"
                                : "bg-slate-950/50 border-slate-800 text-slate-400"
                            }`}>
                              <div className="font-bold flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3 text-indigo-400 shrink-0" />
                                {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                              </div>
                              <div className="text-[9px] text-slate-500 font-semibold truncate flex items-center justify-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5 shrink-0" />
                                {shift.department_name}
                              </div>
                              {!shift.is_confirmed && (
                                <div className="text-[9px] text-amber-500 font-medium">Pending</div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 hover:text-slate-400">
                              <Plus className="h-4 w-4 stroke-[1.5]" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Assign Shift */}
      <Dialog open={isAssignOpen} onOpenChange={() => setIsAssignOpen(false)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-400" />
              {selectedShiftForEdit ? "Edit Scheduled Shift" : "Assign Shift"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCell && (
            <form onSubmit={handleShiftSubmit} className="space-y-4 pt-2">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-xs space-y-1">
                <div>Staff: <span className="font-bold text-white">{selectedCell.staff.full_name} ({selectedCell.staff.designation})</span></div>
                <div>Date: <span className="font-bold text-indigo-400">{format(selectedCell.date, "EEEE, MMMM d, yyyy")}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="start">Start Time</Label>
                  <Input 
                    id="start"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white font-mono" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="end">End Time</Label>
                  <Input 
                    id="end"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white font-mono" 
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="sdept">Roster Department</Label>
                <select 
                  id="sdept"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none"
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="snotes">Shift Instructions</Label>
                <Input 
                  id="snotes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Cover receptionist lunch breaks"
                  className="bg-slate-950 border-slate-800 text-white text-xs" 
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox"
                  id="shift_conf"
                  checked={formData.is_confirmed}
                  onChange={(e) => setFormData({ ...formData, is_confirmed: e.target.checked })}
                  className="w-4 h-4 accent-indigo-500 rounded border-slate-800 bg-slate-950"
                />
                <Label htmlFor="shift_conf" className="cursor-pointer select-none">Publish & Confirm Shift</Label>
              </div>

              <div className="flex justify-between gap-3 pt-4 border-t border-slate-800">
                {selectedShiftForEdit ? (
                  <Button type="button" onClick={handleShiftDelete} variant="destructive" className="h-9 flex items-center gap-1.5">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                ) : (
                  <div />
                )}
                
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setIsAssignOpen(false)} className="h-9 hover:bg-slate-800 text-slate-400">
                    Cancel
                  </Button>
                  <Button type="submit" className="h-9 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white">
                    Save Shift
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
