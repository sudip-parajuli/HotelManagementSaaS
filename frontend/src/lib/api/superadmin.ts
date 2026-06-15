/*
SIA HMS — Super Admin API Services
*/

import { apiClient, authClient } from "./client";
import {
  SuperAdminMetrics,
  Tenant,
  SubscriptionPlan,
  TenantSubscription,
  SubscriptionInvoice,
  ClientOnboardPayload
} from "../types";

export const superAdminApi = {
  // Metrics
  getMetrics: async (): Promise<SuperAdminMetrics> => {
    const response = await apiClient.get<SuperAdminMetrics>("/admin/metrics/");
    return response.data;
  },

  // Tenants Management
  getTenants: async (): Promise<Tenant[]> => {
    const response = await apiClient.get<Tenant[]>("/admin/tenants/");
    return response.data;
  },

  createTenant: async (payload: ClientOnboardPayload): Promise<any> => {
    const response = await apiClient.post("/admin/tenants/", payload);
    return response.data;
  },

  suspendTenant: async (id: number): Promise<any> => {
    const response = await apiClient.post(`/admin/tenants/${id}/suspend/`);
    return response.data;
  },

  activateTenant: async (id: number): Promise<any> => {
    const response = await apiClient.post(`/admin/tenants/${id}/activate/`);
    return response.data;
  },

  impersonateTenant: async (id: number, reason: string): Promise<{ success: boolean; tenant_name: string; schema_name: string }> => {
    const response = await authClient.post("/impersonate", { tenantId: id, reason });
    return response.data;
  },

  stopImpersonating: async (): Promise<{ success: boolean; restored: boolean }> => {
    const response = await authClient.delete("/impersonate");
    return response.data;
  },

  getAuditLogs: async (): Promise<{ count: number; results: any[] }> => {
    const response = await apiClient.get<{ count: number; results: any[] }>("/admin/impersonation-logs/");
    return response.data;
  },

  getTaxConfig: async (): Promise<{ tax_slabs: any[]; ssf_config: any[] }> => {
    const response = await apiClient.get<{ tax_slabs: any[]; ssf_config: any[] }>("/admin/tax-config/");
    return response.data;
  },

  updateTaxConfig: async (payload: { tax_slabs: any[]; ssf_config: any[] }): Promise<any> => {
    const response = await apiClient.post("/admin/tax-config/", payload);
    return response.data;
  },

  // Plans Management
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await apiClient.get<SubscriptionPlan[]>("/admin/plans/");
    return response.data;
  },

  createPlan: async (payload: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
    const response = await apiClient.post<SubscriptionPlan>("/admin/plans/", payload);
    return response.data;
  },

  updatePlan: async (id: number, payload: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
    const response = await apiClient.put<SubscriptionPlan>(`/admin/plans/${id}/`, payload);
    return response.data;
  },

  deletePlan: async (id: number): Promise<any> => {
    const response = await apiClient.delete(`/admin/plans/${id}/`);
    return response.data;
  },

  // Subscriptions Management
  getSubscriptions: async (): Promise<TenantSubscription[]> => {
    const response = await apiClient.get<TenantSubscription[]>("/admin/subscriptions/");
    return response.data;
  },

  cancelSubscription: async (id: number): Promise<any> => {
    const response = await apiClient.post(`/admin/subscriptions/${id}/cancel_subscription/`);
    return response.data;
  },

  // Invoices Management
  getInvoices: async (): Promise<SubscriptionInvoice[]> => {
    const response = await apiClient.get<SubscriptionInvoice[]>("/admin/invoices/");
    return response.data;
  },

  markInvoicePaid: async (id: number, paymentRef: string): Promise<any> => {
    const response = await apiClient.post(`/admin/invoices/${id}/mark_paid/`, { payment_ref: paymentRef });
    return response.data;
  }
};
