import { apiClient } from "./client";

export interface BusinessType {
  key: string;
  name: string;
  description: string;
  icon_name: string;
  recommended_modules: string[];
}

export interface AddonModule {
  id: number;
  key: string;
  name: string;
  description: string;
  icon_name: string;
  price_monthly: string | null;
  price_yearly: string | null;
  category: string;
  is_core: boolean;
  depends_on_keys: string[];
  recommended_for: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantInfo {
  id: number;
  name: string;
  schema_name: string;
  business_type: string | null;
  business_type_name: string | null;
  business_description: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
  onboarded_at: string | null;
  active_modules: string[];
  subscriptions: TenantModuleSub[];
  monthly_total: string;
}

export interface TenantModuleSub {
  module_key: string;
  module_name: string;
  status: string;
  billing_cycle: string;
  price: string;
  activated_at: string | null;
}

export const modulesApi = {
  listModules: () =>
    apiClient.get<AddonModule[]>("/modules/").then((r) => r.data),

  listBusinessTypes: () =>
    apiClient.get<BusinessType[]>("/modules/business-types/").then((r) => r.data),

  getTenantInfo: () =>
    apiClient.get<TenantInfo>("/modules/tenant/").then((r) => r.data),

  updateTenantBusinessType: (payload: { business_type?: string; business_description?: string }) =>
    apiClient.patch("/modules/tenant/", payload).then((r) => r.data),

  activateModules: (moduleKeys: string[], billingCycle = "monthly") =>
    apiClient
      .post("/modules/activate/", { modules: moduleKeys, billing_cycle: billingCycle })
      .then((r) => r.data),

  deactivateModule: (moduleKey: string) =>
    apiClient.post("/modules/deactivate/", { module_key: moduleKey }).then((r) => r.data),
};
