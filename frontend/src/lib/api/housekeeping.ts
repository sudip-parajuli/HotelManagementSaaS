import { apiClient } from "./client";
import type { 
  HousekeepingTask, 
  HousekeepingStatus, 
  HousekeepingBoardRoom, 
  MaintenanceRequest,
  CreateMaintenancePayload 
} from "../types";

export interface BulkAssignPayload {
  task_ids: number[];
  assigned_to_id: number;
}

export interface CompleteTaskPayload {
  notes?: string;
  completion_photo?: string;
}

export interface ResolveMaintenancePayload {
  resolution_notes: string;
}

export const housekeepingApi = {
  getTasks: (params?: { date?: string; status?: string; assigned_to?: string }) =>
    apiClient.get<HousekeepingTask[]>("/housekeeping/tasks/", { params }),
  getBoard: () => apiClient.get<HousekeepingBoardRoom[]>("/housekeeping/board/"),
  updateTaskStatus: (taskId: number, status: HousekeepingStatus) =>
    apiClient.put<HousekeepingTask>(`/housekeeping/tasks/${taskId}/status/`, { status }),
  completeTask: (taskId: number, data: CompleteTaskPayload) =>
    apiClient.post<HousekeepingTask>(`/housekeeping/tasks/${taskId}/complete/`, data),
  bulkAssignTasks: (data: BulkAssignPayload) =>
    apiClient.post<{ message: string }>("/housekeeping/tasks/bulk_assign/", data),
  createMaintenanceRequest: (data: CreateMaintenancePayload) =>
    apiClient.post<MaintenanceRequest>("/housekeeping/maintenance/", data),
  resolveMaintenanceRequest: (reqId: number, data: ResolveMaintenancePayload) =>
    apiClient.post<MaintenanceRequest>(`/housekeeping/maintenance/${reqId}/resolve/`, data),
};
