import { apiClient } from "./client";
import type { Reservation, GuestProfile, PaginatedResponse } from "../types";

export const bookingsApi = {
  // Availability
  checkAvailability: (params: {
    check_in: string;
    check_out: string;
    adults: number;
    room_type?: number;
  }) => apiClient.get("/bookings/check_availability/", { params }),

  // Reservations
  listReservations: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<Reservation>>("/bookings/reservations/", { params }),
  getReservation: (id: number) => apiClient.get<Reservation>(`/bookings/reservations/${id}/`),
  createReservation: (data: Partial<Reservation> & { guest_id: number; room_id: number }) =>
    apiClient.post<Reservation>("/bookings/reservations/", data),
  updateReservation: (id: number, data: Partial<Reservation>) =>
    apiClient.put<Reservation>(`/bookings/reservations/${id}/`, data),
  confirmReservation: (id: number) =>
    apiClient.post<Reservation>(`/bookings/reservations/${id}/confirm/`),
  cancelReservation: (id: number, reason?: string) =>
    apiClient.post<Reservation>(`/bookings/reservations/${id}/cancel/`, { cancellation_reason: reason }),
  todayStats: () =>
    apiClient.get<{
      arrivals_count: number;
      departures_count: number;
      in_house_count: number;
      arrivals: Reservation[];
      departures: Reservation[];
    }>("/bookings/reservations/today/"),

  // Guests
  listGuests: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<GuestProfile>>("/bookings/guests/", { params }),
  getGuest: (id: number) => apiClient.get<GuestProfile>(`/bookings/guests/${id}/`),
  createGuest: (data: Partial<GuestProfile>) =>
    apiClient.post<GuestProfile>("/bookings/guests/", data),
  updateGuest: (id: number, data: Partial<GuestProfile>) =>
    apiClient.put<GuestProfile>(`/bookings/guests/${id}/`, data),
  searchGuests: (query: string) =>
    apiClient.get<PaginatedResponse<GuestProfile>>("/bookings/guests/", { params: { search: query } }),

  // Public Booking Widget APIs
  publicAvailability: (params: {
    check_in: string;
    check_out: string;
    adults: number;
    room_type?: number;
  }) => apiClient.get<any[]>("/bookings/public/availability/", { params }),
  publicBookingCreate: (data: {
    guest: {
      first_name: string;
      last_name: string;
      phone: string;
      email?: string;
      nationality?: string;
    };
    booking: {
      check_in_date: string;
      check_out_date: string;
      room_type_id: number;
      adults: number;
      children?: number;
      infants?: number;
      special_requests?: string;
    };
  }) => apiClient.post<Reservation>("/bookings/public/bookings/", data),
};
