import { apiClient } from "./client";
import type { Shift, LeaveType, LeaveBalance, LeaveRequest, Attendance, PaginatedResponse } from "../types";

export const hrApi = {
  // Shifts
  listShifts: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<Shift>>("/hr/shifts/", { params }),
  createShift: (data: Partial<Shift>) =>
    apiClient.post<Shift>("/hr/shifts/", data),
  updateShift: (id: number, data: Partial<Shift>) =>
    apiClient.put<Shift>(`/hr/shifts/${id}/`, data),
  deleteShift: (id: number) =>
    apiClient.delete(`/hr/shifts/${id}/`),

  // Leave Types
  listLeaveTypes: () =>
    apiClient.get<PaginatedResponse<LeaveType>>("/hr/leave-types/"),
  createLeaveType: (data: Partial<LeaveType>) =>
    apiClient.post<LeaveType>("/hr/leave-types/", data),
  updateLeaveType: (id: number, data: Partial<LeaveType>) =>
    apiClient.put<LeaveType>(`/hr/leave-types/${id}/`, data),
  deleteLeaveType: (id: number) =>
    apiClient.delete(`/hr/leave-types/${id}/`),

  // Leave Balances
  listLeaveBalances: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<LeaveBalance>>("/hr/leave-balances/", { params }),

  // Leave Requests
  listLeaveRequests: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<LeaveRequest>>("/hr/leave-requests/", { params }),
  createLeaveRequest: (data: any) =>
    apiClient.post<LeaveRequest>("/hr/leave-requests/", data),
  approveLeaveRequest: (id: number) =>
    apiClient.post<LeaveRequest>(`/hr/leave-requests/${id}/approve/`),
  rejectLeaveRequest: (id: number, reason: string) =>
    apiClient.post<LeaveRequest>(`/hr/leave-requests/${id}/reject/`, { rejection_reason: reason }),

  // Attendance
  listAttendance: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<Attendance>>("/hr/attendance/", { params }),
  clockIn: (staffId: number, pin: string) =>
    apiClient.post<Attendance>("/hr/attendance/clock_in/", { staff_id: staffId, pin }),
  clockOut: (staffId: number, pin: string) =>
    apiClient.post<Attendance>("/hr/attendance/clock_out/", { staff_id: staffId, pin }),
};
