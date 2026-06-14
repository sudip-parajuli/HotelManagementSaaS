import { apiClient } from "./client";
import type { Invoice, Payment, PaginatedResponse } from "../types";

export const billingApi = {
  // Invoices
  listInvoices: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<Invoice>>("/billing/invoices/", { params }),
  getInvoice: (id: number) =>
    apiClient.get<Invoice>(`/billing/invoices/${id}/`),
  createInvoice: (data: Partial<Invoice>) =>
    apiClient.post<Invoice>("/billing/invoices/", data),
  updateInvoice: (id: number, data: Partial<Invoice>) =>
    apiClient.put<Invoice>(`/billing/invoices/${id}/`, data),
  voidInvoice: (id: number) =>
    apiClient.post<Invoice>(`/billing/invoices/${id}/void/`),
  
  // Custom Payment Record
  recordPayment: (id: number, data: { amount: string; payment_method: string; reference_number?: string; notes?: string }) =>
    apiClient.post<Payment>(`/billing/invoices/${id}/payments/`, data),

  // Payments Ledger
  listPayments: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<Payment>>("/billing/payments/", { params }),

  // Summary Metrics
  getDailySummary: (date?: string) =>
    apiClient.get<{
      date: string;
      total_payments_collected: string;
      payment_by_method: Record<string, string>;
      total_invoiced_today: string;
      invoice_count: number;
    }>("/billing/invoices/daily_summary/", { params: { date } }),

  // PDF stream URL helper
  getInvoicePdfUrl: (id: number) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return `${apiBase}/api/billing/invoices/${id}/pdf/`;
  },
};
