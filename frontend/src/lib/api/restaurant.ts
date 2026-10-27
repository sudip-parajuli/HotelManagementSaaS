import { apiClient } from "./client";
import type { DiningArea, DiningTable, MenuCategory, MenuItem, TableStatus } from "../types";

export const restaurantApi = {
  getAreas: () => apiClient.get<DiningArea[]>("/restaurant/areas/"),
  getTables: () => apiClient.get<DiningTable[]>("/restaurant/tables/"),
  getFloorPlan: () => apiClient.get<DiningTable[]>("/restaurant/tables/floor_plan/"),
  updateTableStatus: (tableId: number, status: TableStatus) =>
    apiClient.put<DiningTable>(`/restaurant/tables/${tableId}/status/`, { status }),
  updateTableWaiter: (tableId: number, waiterId: number | null) =>
    apiClient.patch<DiningTable>(`/restaurant/tables/${tableId}/`, { assigned_waiter: waiterId }),
  mergeTables: (tableIds: number[], mergedIntoId: number) =>
    apiClient.post(`/restaurant/tables/merge/`, { table_ids: tableIds, merged_into: mergedIntoId }),
  splitTable: (tableId: number, splitType: "by_item" | "by_amount", splits: any[]) =>
    apiClient.post(`/restaurant/tables/${tableId}/split/`, { split_type: splitType, splits }),
  getCategories: () => apiClient.get<MenuCategory[]>("/restaurant/categories/"),
  getItems: () => apiClient.get<MenuItem[]>("/restaurant/items/"),
};
