import { apiClient } from "./client";
import type { PayrollPeriod, PayrollEntry, PaginatedResponse } from "../types";

export const payrollApi = {
  // Payroll Periods
  listPeriods: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<PayrollPeriod>>("/payroll/periods/", { params }),
  createPeriod: (month: number, year: number) =>
    apiClient.post<PayrollPeriod>("/payroll/periods/", { month, year }),
  calculatePeriod: (id: number) =>
    apiClient.post<{ message: string }>(`/payroll/periods/${id}/calculate/`),
  approvePeriod: (id: number) =>
    apiClient.post<{ message: string }>(`/payroll/periods/${id}/approve/`),
  payPeriod: (id: number) =>
    apiClient.post<{ message: string }>(`/payroll/periods/${id}/pay/`),

  // Payroll Entries
  listEntries: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<PayrollEntry>>("/payroll/entries/", { params }),
  getEntry: (id: number) =>
    apiClient.get<PayrollEntry>(`/payroll/entries/${id}/`),
  updateEntry: (id: number, data: { allowances?: any[]; deductions?: any[]; is_approved?: boolean; notes?: string }) =>
    apiClient.put<PayrollEntry>(`/payroll/entries/${id}/`, data),
  deleteEntry: (id: number) =>
    apiClient.delete(`/payroll/entries/${id}/`),

  // Payslip URL helper (returns string for direct iframe/tab printing)
  getPayslipUrl: (id: number) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return `${apiBase}/api/payroll/entries/${id}/payslip/`;
  },
};
