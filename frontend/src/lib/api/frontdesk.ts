import { apiClient } from "./client";
import type { Reservation } from "../types";

export interface CheckInPayload {
  reservation_id: number;
  id_document_image?: string;
  key_issued: string;
  locker_number?: string;
  notes?: string;
}

export interface CheckOutPayload {
  reservation_id: number;
  additional_charges?: Array<{ description: string; amount: number }>;
  payment_method: string;
  feedback_rating?: number;
  feedback_comment?: string;
}

export interface WalkInPayload {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  nationality?: string;
  id_type?: string;
  id_number?: string;
  room_id: number;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  key_issued?: string;
  locker_number?: string;
  notes?: string;
}

export interface TodayStatsResponse {
  arrivals: Reservation[];
  departures: Reservation[];
  in_house: Reservation[];
  occupancy_rate: number;
}

export const frontdeskApi = {
  getTodayStats: () => apiClient.get<TodayStatsResponse>("/frontdesk/today/"),
  checkIn: (data: CheckInPayload) => apiClient.post<any>("/frontdesk/checkin/", data),
  checkOut: (data: CheckOutPayload) => apiClient.post<any>("/frontdesk/checkout/", data),
  walkIn: (data: WalkInPayload) => apiClient.post<any>("/frontdesk/walkin/", data),
};
