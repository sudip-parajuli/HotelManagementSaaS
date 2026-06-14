import { apiClient } from "./client";
import type { GuestTag, GuestActivity, Campaign, LoyaltyAccount, LoyaltyTransaction, PaginatedResponse } from "../types";

export const crmApi = {
  // Segmentation Tags
  listTags: () =>
    apiClient.get<PaginatedResponse<GuestTag>>("/crm/tags/"),
  createTag: (data: Partial<GuestTag>) =>
    apiClient.post<GuestTag>("/crm/tags/", data),
  updateTag: (id: number, data: Partial<GuestTag>) =>
    apiClient.put<GuestTag>(`/crm/tags/${id}/`, data),
  deleteTag: (id: number) =>
    apiClient.delete(`/crm/tags/${id}/`),

  // Guest Activities Log
  listActivities: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<GuestActivity>>("/crm/activities/", { params }),

  // Marketing Campaigns
  listCampaigns: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<Campaign>>("/crm/campaigns/", { params }),
  createCampaign: (data: Partial<Campaign>) =>
    apiClient.post<Campaign>("/crm/campaigns/", data),
  updateCampaign: (id: number, data: Partial<Campaign>) =>
    apiClient.put<Campaign>(`/crm/campaigns/${id}/`, data),
  deleteCampaign: (id: number) =>
    apiClient.delete(`/crm/campaigns/${id}/`),
  dispatchCampaign: (id: number) =>
    apiClient.post<{ message: string; campaign: Campaign }>(`/crm/campaigns/${id}/dispatch/`),

  // Guest Portfolio Details
  listGuests: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<any>>("/crm/guests/", { params }), // GuestProfilePortfolioSerializer
  getGuest: (id: number) =>
    apiClient.get<any>(`/crm/guests/${id}/`),
  tagGuest: (guestId: number, tagId: number) =>
    apiClient.post<any>(`/crm/guests/${guestId}/tag_guest/`, { tag_id: tagId }),
  untagGuest: (guestId: number, tagId: number) =>
    apiClient.post<any>(`/crm/guests/${guestId}/untag_guest/`, { tag_id: tagId }),

  // Loyalty Accounts & Ledger
  listLoyaltyAccounts: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<LoyaltyAccount>>("/crm/loyalty/", { params }),
  getLoyaltyAccount: (id: number) =>
    apiClient.get<LoyaltyAccount>(`/crm/loyalty/${id}/`),
  redeemPoints: (accountId: number, invoiceId: number, points: number) =>
    apiClient.post<{
      message: string;
      points_balance: number;
      invoice_total: string;
      invoice_balance_due: string;
    }>(`/crm/loyalty/${accountId}/redeem/`, { invoice_id: invoiceId, points }),
  
  listLoyaltyTransactions: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<LoyaltyTransaction>>("/crm/loyalty-transactions/", { params }),
};
