import { apiClient } from "./client";
import type { DiningArea, DiningTable, MenuCategory, MenuItem, TableStatus } from "../types";

export const restaurantApi = {
  getAreas: () => apiClient.get<DiningArea[]>("/restaurant/areas/"),
  getTables: () => apiClient.get<DiningTable[]>("/restaurant/tables/"),
  updateTableStatus: (tableId: number, status: TableStatus) =>
    apiClient.put<DiningTable>(`/restaurant/tables/${tableId}/status/`, { status }),
  getCategories: () => apiClient.get<MenuCategory[]>("/restaurant/categories/"),
  getItems: () => apiClient.get<MenuItem[]>("/restaurant/items/"),
};
