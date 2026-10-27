/** Self-contained demo domain. No guest data is sent to a server. Amounts are NPR. */
export type StayStatus = "confirmed" | "in-house" | "checked-out" | "cancelled";
export type RoomState = "ready" | "dirty" | "maintenance";
export interface DemoRoom { id: string; type: string; rate: number; capacity: number; state: RoomState }
export interface DemoStay { id: string; guest: string; email: string; roomId: string; arrival: string; departure: string; guests: number; status: StayStatus; paid: number; source: string; notes: string }
export interface HotelState { version: 1; rooms: DemoRoom[]; stays: DemoStay[] }
export const money = (value: number) => new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR", maximumFractionDigits: 0 }).format(value);
export const todayInNepal = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export function shiftDate(day: string, count: number) { return new Date(Date.parse(day + "T00:00:00Z") + count * 86400000).toISOString().slice(0, 10); }
export function nights(arrival: string, departure: string) { return Math.round((Date.parse(departure) - Date.parse(arrival)) / 86400000); }
export function validDate(day: string) { return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day; }
export function total(stay: DemoStay, rooms: DemoRoom[]) { return nights(stay.arrival, stay.departure) * (rooms.find(r => r.id === stay.roomId)?.rate ?? 0); }
export function balance(stay: DemoStay, rooms: DemoRoom[]) { return Math.max(0, total(stay, rooms) - stay.paid); }
export function available(state: HotelState, roomId: string, arrival: string, departure: string, except?: string) {
  const room = state.rooms.find(r => r.id === roomId);
  return !!room && room.state !== "maintenance" && !state.stays.some(s => s.id !== except && s.roomId === roomId && ["confirmed", "in-house"].includes(s.status) && s.arrival < departure && s.departure > arrival);
}
export function seedHotel(day = todayInNepal()): HotelState {
  const rooms: DemoRoom[] = Array.from({ length: 16 }, (_, i) => ({ id: String((i < 8 ? 101 : 201) + i % 8), type: i < 8 ? "Deluxe King" : i < 12 ? "Garden Twin" : "Himalayan Suite", rate: i < 8 ? 6500 : i < 12 ? 8000 : 14500, capacity: i < 12 ? 2 : 4, state: i === 6 || i === 10 ? "dirty" : i === 15 ? "maintenance" : "ready" }));
  const guests = ["Aarav Sharma", "Sofia Martin", "Maya Gurung", "Oliver Chen", "Anisha Thapa", "James Wilson", "Priya Singh", "Lucas Bennett"];
  const stays: DemoStay[] = guests.map((guest, i) => ({ id: `SW-${1024 + i}`, guest, email: `guest${i + 1}@example.com`, roomId: rooms[i < 6 ? i : i + 2].id, arrival: shiftDate(day, i < 5 ? -2 : 0), departure: shiftDate(day, i < 2 ? 0 : 2), guests: 2, status: i < 5 ? "in-house" : "confirmed", paid: i < 2 ? rooms[i].rate * 2 : rooms[i < 6 ? i : i + 2].rate, source: ["Direct", "Booking.com", "Walk-in"][i % 3], notes: i === 2 ? "Vegetarian breakfast · airport transfer requested" : "" }));
  return { version: 1, rooms, stays };
}
export function addStay(state: HotelState, input: Omit<DemoStay, "id" | "status" | "paid">, day = todayInNepal()): HotelState {
  if (!input.guest.trim()) throw new Error("Please enter the guest's name.");
  if (!validDate(input.arrival) || !validDate(input.departure) || nights(input.arrival, input.departure) < 1 || input.arrival < day) throw new Error("Choose valid dates, starting today or later, with at least one night.");
  const room = state.rooms.find(r => r.id === input.roomId);
  if (!room || !Number.isInteger(input.guests) || input.guests < 1 || input.guests > room.capacity) throw new Error("Choose a room that fits the number of guests.");
  if (!available(state, input.roomId, input.arrival, input.departure)) throw new Error("This room is unavailable for those dates. Please choose another room.");
  const id = `SW-${Math.max(1031, ...state.stays.map(s => Number(s.id.split("-")[1]) || 0)) + 1}`;
  return { ...state, stays: [...state.stays, { ...input, guest: input.guest.trim(), id, status: "confirmed", paid: 0 }] };
}
export function updateStay(state: HotelState, id: string, action: "check-in" | "check-out" | "settle" | "cancel", day = todayInNepal()): HotelState {
  const stay = state.stays.find(s => s.id === id);
  if (!stay) throw new Error("Reservation not found.");
  const room = state.rooms.find(r => r.id === stay.roomId)!;
  let next = { ...stay };
  if (action === "check-in") {
    if (stay.status !== "confirmed" || stay.arrival > day || stay.departure <= day) throw new Error("Only a confirmed reservation within its stay dates can check in.");
    if (room.state !== "ready" || state.stays.some(s => s.id !== id && s.roomId === room.id && s.status === "in-house")) throw new Error("The room must be ready and vacant before check-in.");
    next.status = "in-house";
  } else if (action === "check-out") {
    if (stay.status !== "in-house") throw new Error("Only an in-house guest can check out.");
    if (balance(stay, state.rooms) > 0) throw new Error("Settle the outstanding balance before check-out.");
    next.status = "checked-out";
  } else if (action === "settle") {
    if (!["confirmed", "in-house"].includes(stay.status)) throw new Error("This reservation is closed.");
    next.paid = total(stay, state.rooms);
  } else {
    if (stay.status !== "confirmed") throw new Error("Only a confirmed reservation can be cancelled.");
    next.status = "cancelled";
  }
  return { ...state, stays: state.stays.map(s => s.id === id ? next : s), rooms: state.rooms.map(r => r.id === room.id && action === "check-out" ? { ...r, state: "dirty" } : r) };
}
export function cleanRoom(state: HotelState, id: string): HotelState {
  if (!state.rooms.some(r => r.id === id && r.state === "dirty")) throw new Error("Only a dirty room can be marked ready.");
  if (state.stays.some(s => s.roomId === id && s.status === "in-house")) throw new Error("This room is still occupied.");
  return { ...state, rooms: state.rooms.map(r => r.id === id ? { ...r, state: "ready" } : r) };
}
export function restoreHotel(raw: string): HotelState {
  const value = JSON.parse(raw) as HotelState;
  const statuses = ["confirmed", "in-house", "checked-out", "cancelled"];
  if (value.version !== 1 || !Array.isArray(value.rooms) || value.rooms.length !== 16 || !Array.isArray(value.stays) || !value.rooms.every(r => typeof r.id === "string" && typeof r.type === "string" && Number.isFinite(r.rate) && r.rate > 0 && Number.isInteger(r.capacity) && r.capacity > 0 && ["ready", "dirty", "maintenance"].includes(r.state)) || !value.stays.every(s => typeof s.id === "string" && typeof s.guest === "string" && typeof s.email === "string" && typeof s.notes === "string" && typeof s.source === "string" && value.rooms.some(r => r.id === s.roomId) && statuses.includes(s.status) && Number.isInteger(s.guests) && s.guests > 0 && Number.isFinite(s.paid) && s.paid >= 0 && Number.isFinite(nights(s.arrival, s.departure)) && nights(s.arrival, s.departure) > 0)) throw new Error("Invalid demo snapshot.");
  return value;
}
