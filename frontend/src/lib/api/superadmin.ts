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
  TenantFeaturesResponse,
  TenantUsage,
  AddonModule,
  AddonRequest,
  ClientOnboardPayload,
  ModuleRevenueResponse,
  TenantModuleSubAdmin,
} from "../types";

export const superAdminApi = {
  // ─── Metrics ────────────────────────────────────────────────
  getMetrics: async (): Promise<SuperAdminMetrics> => {
    const response = await apiClient.get<SuperAdminMetrics>("/admin/metrics/");
    return response.data;
  },

  // ─── Tenants ────────────────────────────────────────────────
  getTenants: async (): Promise<Tenant[]> => {
    const response = await apiClient.get<Tenant[]>("/admin/tenants/");
    return response.data;
  },

  getTenant: async (id: number): Promise<Tenant> => {
    const response = await apiClient.get<Tenant>(`/admin/tenants/${id}/`);
    return response.data;
  },

  createTenant: async (payload: ClientOnboardPayload): Promise<unknown> => {
    const response = await apiClient.post("/admin/tenants/", payload);
    return response.data;
  },

  suspendTenant: async (id: number): Promise<unknown> => {
    const response = await apiClient.post(`/admin/tenants/${id}/suspend/`);
    return response.data;
  },

  activateTenant: async (id: number): Promise<unknown> => {
    const response = await apiClient.post(`/admin/tenants/${id}/activate/`);
    return response.data;
  },

  impersonateTenant: async (
    id: number,
    reason: string
  ): Promise<{ success: boolean; tenant_name: string; schema_name: string }> => {
    const response = await authClient.post("/impersonate", { tenantId: id, reason });
    return response.data;
  },

  stopImpersonating: async (): Promise<{ success: boolean; restored: boolean }> => {
    const response = await authClient.delete("/impersonate");
    return response.data;
  },

  // ─── Feature Grants ─────────────────────────────────────────
  getTenantFeatures: async (tenantId: number): Promise<TenantFeaturesResponse> => {
    const response = await apiClient.get<TenantFeaturesResponse>(
      `/admin/tenants/${tenantId}/features/`
    );
    return response.data;
  },

  grantFeature: async (
    tenantId: number,
    featureKey: string,
    reason: string,
    expiresAt?: string
  ): Promise<unknown> => {
    const response = await apiClient.post(`/admin/tenants/${tenantId}/features/grant/`, {
      feature_key: featureKey,
      reason,
      expires_at: expiresAt ?? null,
    });
    return response.data;
  },

  revokeFeature: async (tenantId: number, featureKey: string): Promise<unknown> => {
    const response = await apiClient.post(`/admin/tenants/${tenantId}/features/revoke/`, {
      feature_key: featureKey,
    });
    return response.data;
  },

  // ─── Usage ──────────────────────────────────────────────────
  getTenantUsage: async (tenantId: number): Promise<TenantUsage> => {
    const response = await apiClient.get<TenantUsage>(`/admin/tenants/${tenantId}/usage/`);
    return response.data;
  },

  // ─── Audit Logs ─────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAuditLogs: async (): Promise<{ count: number; results: any[] }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await apiClient.get<{ count: number; results: any[] }>(
      "/admin/impersonation-logs/"
    );
    return response.data;
  },

  // ─── Tax Config ─────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTaxConfig: async (): Promise<{ tax_slabs: any[]; ssf_config: any[] }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await apiClient.get<{ tax_slabs: any[]; ssf_config: any[] }>(
      "/admin/tax-config/"
    );
    return response.data;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateTaxConfig: async (payload: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tax_slabs: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ssf_config: any[];
  }): Promise<unknown> => {
    const response = await apiClient.post("/admin/tax-config/", payload);
    return response.data;
  },

  // ─── Plans ──────────────────────────────────────────────────
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await apiClient.get<SubscriptionPlan[]>("/admin/plans/");
    return response.data;
  },

  createPlan: async (payload: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
    const response = await apiClient.post<SubscriptionPlan>("/admin/plans/", payload);
    return response.data;
  },

  updatePlan: async (
    id: number,
    payload: Partial<SubscriptionPlan>
  ): Promise<SubscriptionPlan> => {
    const response = await apiClient.put<SubscriptionPlan>(`/admin/plans/${id}/`, payload);
    return response.data;
  },

  deletePlan: async (id: number): Promise<unknown> => {
    const response = await apiClient.delete(`/admin/plans/${id}/`);
    return response.data;
  },

  // ─── Subscriptions ──────────────────────────────────────────
  getSubscriptions: async (): Promise<TenantSubscription[]> => {
    const response = await apiClient.get<TenantSubscription[]>("/admin/subscriptions/");
    return response.data;
  },

  getSubscriptionByTenant: async (tenantId: number): Promise<TenantSubscription | null> => {
    const response = await apiClient.get<TenantSubscription[]>(
      `/admin/subscriptions/?tenant=${tenantId}`
    );
    return response.data[0] ?? null;
  },

  cancelSubscription: async (id: number): Promise<unknown> => {
    const response = await apiClient.post(`/admin/subscriptions/${id}/cancel_subscription/`);
    return response.data;
  },

  // ─── Invoices ───────────────────────────────────────────────
  getInvoices: async (): Promise<SubscriptionInvoice[]> => {
    const response = await apiClient.get<SubscriptionInvoice[]>("/admin/invoices/");
    return response.data;
  },

  getInvoicesByTenant: async (tenantId: number): Promise<SubscriptionInvoice[]> => {
    const response = await apiClient.get<SubscriptionInvoice[]>(
      `/admin/invoices/?tenant=${tenantId}`
    );
    return response.data;
  },

  markInvoicePaid: async (id: number, paymentRef: string): Promise<unknown> => {
    const response = await apiClient.post(`/admin/invoices/${id}/mark_paid/`, {
      payment_ref: paymentRef,
    });
    return response.data;
  },

  // ─── Add-on Marketplace ─────────────────────────────────────
  getAddonCatalog: async (): Promise<AddonModule[]> => {
    const response = await apiClient.get<AddonModule[]>("/admin/addons/catalog/");
    return response.data;
  },

  createAddon: async (payload: Partial<AddonModule>): Promise<AddonModule> => {
    const response = await apiClient.post<AddonModule>("/admin/addons/catalog/", payload);
    return response.data;
  },

  updateAddon: async (id: number, payload: Partial<AddonModule>): Promise<AddonModule> => {
    const response = await apiClient.patch<AddonModule>(
      `/admin/addons/catalog/${id}/`,
      payload
    );
    return response.data;
  },

  getAddonRequests: async (): Promise<AddonRequest[]> => {
    const response = await apiClient.get<AddonRequest[]>("/admin/addons/requests/");
    return response.data;
  },

  approveAddonRequest: async (id: number): Promise<unknown> => {
    const response = await apiClient.post(`/admin/addons/requests/${id}/approve/`);
    return response.data;
  },

  rejectAddonRequest: async (id: number, reason: string): Promise<unknown> => {
    const response = await apiClient.post(`/admin/addons/requests/${id}/reject/`, { reason });
    return response.data;
  },

  // ─── Module Revenue Analytics ──────────────────────────────
  getModuleRevenue: async (): Promise<ModuleRevenueResponse> => {
    const response = await apiClient.get<ModuleRevenueResponse>("/admin/revenue/modules/");
    return response.data;
  },

  // ─── Tenant Module Subscriptions ──────────────────────────
  getTenantModuleSubscriptions: async (tenantId: number): Promise<TenantModuleSubAdmin[]> => {
    const response = await apiClient.get<TenantModuleSubAdmin[]>(
      `/admin/tenants/${tenantId}/module-subscriptions/`
    );
    return response.data;
  },

  activateTenantModule: async (
    tenantId: number,
    moduleKey: string,
    price?: string,
    billingCycle?: string
  ): Promise<unknown> => {
    const response = await apiClient.post(
      `/admin/tenants/${tenantId}/module-subscriptions/activate/`,
      { module_key: moduleKey, price: price ?? "0", billing_cycle: billingCycle ?? "monthly" }
    );
    return response.data;
  },

  deactivateTenantModule: async (
    tenantId: number,
    moduleKey: string
  ): Promise<unknown> => {
    const response = await apiClient.post(
      `/admin/tenants/${tenantId}/module-subscriptions/deactivate/`,
      { module_key: moduleKey }
    );
    return response.data;
  },

  // ─── System Health ──────────────────────────────────────────
  getSystemHealth: async (): Promise<{
    overall: "ok" | "degraded";
    services: Record<
      string,
      { status: string; latency_ms?: number; error?: string; workers?: number }
    >;
    checked_at: string;
  }> => {
    const response = await apiClient.get("/admin/system/health/");
    return response.data;
  },
};
