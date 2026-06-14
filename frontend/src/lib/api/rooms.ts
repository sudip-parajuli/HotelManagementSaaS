import { apiClient } from "./client";
import type { Room, RoomType, Property, PaginatedResponse } from "../types";

export const roomsApi = {
  // Properties
  listProperties: () =>
    apiClient.get<PaginatedResponse<Property>>("/properties/properties/"),

  // Amenities
  listAmenities: () =>
    apiClient.get<PaginatedResponse<any>>("/properties/amenities/"),

  // Room Types
  listRoomTypes: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<RoomType>>("/properties/room-types/", { params }),
  getRoomType: (id: number) => apiClient.get<RoomType>(`/properties/room-types/${id}/`),
  createRoomType: (data: Partial<RoomType>) =>
    apiClient.post<RoomType>("/properties/room-types/", data),
  updateRoomType: (id: number, data: Partial<RoomType>) =>
    apiClient.put<RoomType>(`/properties/room-types/${id}/`, data),
  deleteRoomType: (id: number) => apiClient.delete(`/properties/room-types/${id}/`),

  // Rooms
  listRooms: (params?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<Room>>("/properties/rooms/", { params }),
  getRoom: (id: number) => apiClient.get<Room>(`/properties/rooms/${id}/`),
  createRoom: (data: Partial<Room>) => apiClient.post<Room>("/properties/rooms/", data),
  updateRoom: (id: number, data: Partial<Room>) =>
    apiClient.put<Room>(`/properties/rooms/${id}/`, data),
  updateRoomStatus: (id: number, status: Room["status"]) =>
    apiClient.patch(`/properties/rooms/${id}/`, { status }),
};
