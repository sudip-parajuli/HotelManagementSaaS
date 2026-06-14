import { apiClient } from "./client";
import type { Department, StaffMember, StaffDocument, PaginatedResponse } from "../types";

export const staffApi = {
  // Departments
  listDepartments: () =>
    apiClient.get<PaginatedResponse<Department>>("/staff/departments/"),
  getDepartment: (id: number) =>
    apiClient.get<Department>(`/staff/departments/${id}/`),
  createDepartment: (data: Partial<Department>) =>
    apiClient.post<Department>("/staff/departments/", data),
  updateDepartment: (id: number, data: Partial<Department>) =>
    apiClient.put<Department>(`/staff/departments/${id}/`, data),
  deleteDepartment: (id: number) =>
    apiClient.delete(`/staff/departments/${id}/`),

  // Staff Members
  listStaffMembers: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<StaffMember>>("/staff/members/", { params }),
  getStaffMember: (id: number) =>
    apiClient.get<StaffMember>(`/staff/members/${id}/`),
  createStaffMember: (data: any) =>
    apiClient.post<StaffMember>("/staff/members/", data),
  updateStaffMember: (id: number, data: any) =>
    apiClient.put<StaffMember>(`/staff/members/${id}/`, data),
  deleteStaffMember: (id: number) =>
    apiClient.delete(`/staff/members/${id}/`),

  // Documents
  listDocuments: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<StaffDocument>>("/staff/documents/", { params }),
  uploadDocument: (data: FormData) =>
    apiClient.post<StaffDocument>("/staff/documents/", data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  deleteDocument: (id: number) =>
    apiClient.delete(`/staff/documents/${id}/`),
};
