import { apiClient } from "./client";

export interface SessionUnitType {
  id: number;
  type_name: string;
  icon_name: string;
  pricing_model: "per_hour" | "per_minute" | "flat_rate" | "per_day";
  rate: string;
  minimum_duration_minutes: number;
  grace_period_minutes: number;
  overage_rate: string | null;
}

export interface SessionUnit {
  id: number;
  unit_type: SessionUnitType;
  unit_name: string;
  status: "available" | "occupied" | "reserved" | "maintenance" | "cleaning";
  qr_code: string;
  is_active: boolean;
}

export interface TimedSession {
  id: number;
  unit: SessionUnit;
  guest_name: string;
  guest_phone: string;
  status: "active" | "paused" | "ended";
  actual_start: string;
  actual_end: string | null;
  paid_duration_minutes: number;
  base_amount: string;
  overage_minutes: number;
  overage_amount: string;
  total_amount: string;
  total_active_minutes: number;
  total_paused_minutes: number;
  created_at: string;
}

export interface LiveStatus {
  session_id: number;
  unit_id: number;
  unit_name: string;
  status: string;
  elapsed_minutes: number;
  remaining_minutes: number;
  overage_minutes: number;
  estimated_overage_charge: string;
  estimated_total: string;
  paused: boolean;
}

export const sessionsApi = {
  listUnitTypes: () =>
    apiClient.get<SessionUnitType[]>("/sessions/unit-types/").then((r) => r.data),

  listUnits: (params?: { status?: string; unit_type?: number }) =>
    apiClient.get<SessionUnit[]>("/sessions/units/", { params }).then((r) => r.data),

  listSessions: (params?: { status?: string; date_from?: string; date_to?: string }) =>
    apiClient.get<TimedSession[]>("/sessions/", { params }).then((r) => r.data),

  getSession: (id: number) =>
    apiClient.get<TimedSession>(`/sessions/${id}/`).then((r) => r.data),

  startSession: (payload: {
    unit_id: number;
    guest_name?: string;
    guest_phone?: string;
    guest_id?: number;
    paid_minutes: number;
  }) => apiClient.post("/sessions/start/", payload).then((r) => r.data),

  extendSession: (id: number, additional_minutes: number, payment_method?: string) =>
    apiClient
      .post(`/sessions/${id}/extend/`, { additional_minutes, payment_method })
      .then((r) => r.data),

  pauseSession: (id: number) =>
    apiClient.post(`/sessions/${id}/pause/`).then((r) => r.data),

  resumeSession: (id: number) =>
    apiClient.post(`/sessions/${id}/resume/`).then((r) => r.data),

  endSession: (id: number) =>
    apiClient.post(`/sessions/${id}/end/`).then((r) => r.data),

  liveStatus: (id: number) =>
    apiClient.get<LiveStatus>(`/sessions/${id}/live/`).then((r) => r.data),

  getReport: (report: "daily" | "units") =>
    apiClient.get(`/sessions/reports/${report}/`).then((r) => r.data),
};
