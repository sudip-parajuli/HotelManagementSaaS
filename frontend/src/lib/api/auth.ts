import { apiClient } from "./client";
import type { UserProfile, ChangePasswordPayload } from "../types";

export const authApi = {
  me: () => apiClient.get<UserProfile>("/auth/me/"),
  updateMe: (data: Partial<UserProfile>) => apiClient.put<UserProfile>("/auth/me/", data),
  changePassword: (data: ChangePasswordPayload) =>
    apiClient.post("/auth/change-password/", data),
  listUsers: (params?: Record<string, any>) =>
    apiClient.get<UserProfile[]>("/auth/users/", { params }),
  createUser: (data: Partial<UserProfile> & { password: string }) =>
    apiClient.post<UserProfile>("/auth/users/", data),
  getUser: (id: number) => apiClient.get<UserProfile>(`/auth/users/${id}/`),
  updateUser: (id: number, data: Partial<UserProfile>) =>
    apiClient.put<UserProfile>(`/auth/users/${id}/`, data),
  deactivateUser: (id: number) => apiClient.delete(`/auth/users/${id}/`),
};
