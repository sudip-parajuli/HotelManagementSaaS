import { apiClient } from "./client";
import type { DashboardSummaryResponse, DailyMetric, ReportExport } from "../types";

export const analyticsApi = {
  // Dashboard snap & metrics (last 30 days)
  getDashboardSummary: () =>
    apiClient.get<DashboardSummaryResponse>("/analytics/dashboard/"),

  // Force daily aggregation (debugging/testing)
  calculateMetrics: (date?: string) =>
    apiClient.post<{ status: string; message: string }>("/analytics/dashboard/", { date }),

  // Timeseries revenue aggregation
  getRevenueData: (params?: { start_date: string; end_date: string }) =>
    apiClient.get<DailyMetric[]>("/analytics/revenue/", { params }),

  // Occupancy rate & type distributions
  getOccupancyData: (params?: { start_date: string; end_date: string }) =>
    apiClient.get<{ metrics: DailyMetric[]; room_types_summary: Record<string, number> }>("/analytics/occupancy/", { params }),

  // Top selling menu products
  getTopMenuItems: (params?: { start_date: string; end_date: string; limit?: number }) =>
    apiClient.get<Array<{ name: string; category: string; quantity: number; revenue: number }>>("/analytics/top-items/", { params }),

  // Guest booking channel pie counts
  getGuestSources: (params?: { start_date: string; end_date: string }) =>
    apiClient.get<Array<{ source: string; count: number }>>("/analytics/guest-sources/", { params }),

  // Report Export Management
  listReports: () =>
    apiClient.get<ReportExport[]>("/analytics/reports/"),

  generateReport: (data: { report_type: string; format: "pdf" | "excel"; start_date: string; end_date: string }) =>
    apiClient.post<ReportExport>("/analytics/reports/", data),

  getReportStatus: (id: number) =>
    apiClient.get<ReportExport>(`/analytics/reports/${id}/`),
};
