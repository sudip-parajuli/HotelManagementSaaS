"use client";

import React from "react";
import { format, addDays, isSameDay, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Bed } from "lucide-react";
import type { Room, Reservation } from "@/lib/types";

interface BookingCalendarProps {
  rooms: Room[];
  reservations: Reservation[];
  startDate: Date;
  onCellClick: (room: Room, date: string) => void;
  onBookingClick: (reservation: Reservation) => void;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/80 border-amber-500 text-white hover:bg-amber-500 shadow-md shadow-amber-500/10",
  confirmed: "bg-cyan-500/80 border-cyan-500 text-white hover:bg-cyan-500 shadow-md shadow-cyan-500/10",
  checked_in: "bg-emerald-500/80 border-emerald-500 text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/10",
  checked_out: "bg-slate-600/80 border-slate-600 text-slate-200 hover:bg-slate-600",
  cancelled: "bg-rose-500/50 border-rose-500/50 text-slate-400 line-through",
};

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  rooms,
  reservations,
  startDate,
  onCellClick,
  onBookingClick,
}) => {
  // Generate 14 columns of dates
  const dates = Array.from({ length: 14 }).map((_, i) => addDays(startDate, i));

  // Helper to format date key YYYY-MM-DD
  const formatDateKey = (d: Date) => format(d, "yyyy-MM-dd");

  return (
    <div className="rounded-xl border border-slate-900 bg-slate-950/20 overflow-x-auto shadow-2xl">
      <div className="min-w-[980px]">
        {/* X-Axis Column Headers */}
        <div className="grid grid-cols-15 border-b border-slate-900 bg-slate-900/30 sticky top-0 z-10 backdrop-blur-md">
          {/* Room info sticky left spacer */}
          <div className="col-span-2 p-3 font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-r border-slate-900 bg-slate-950/80">
            <Bed className="h-3.5 w-3.5 text-cyan-400" />
            Rooms
          </div>
          {/* Date headers */}
          {dates.map((dateVal, i) => {
            const dayName = format(dateVal, "EEE");
            const dayNum = format(dateVal, "d");
            const isToday = isSameDay(dateVal, new Date());

            return (
              <div
                key={i}
                className={`col-span-1 p-2 text-center border-r border-slate-900/40 select-none flex flex-col justify-center items-center gap-0.5 ${
                  isToday ? "bg-cyan-500/10 text-cyan-400 font-bold" : "text-slate-400"
                }`}
              >
                <span className="text-[10px] uppercase font-semibold tracking-wider">
                  {dayName}
                </span>
                <span className={`text-xs h-5 w-5 rounded-full flex items-center justify-center font-bold ${
                  isToday ? "bg-cyan-500 text-white" : ""
                }`}>
                  {dayNum}
                </span>
              </div>
            );
          })}
        </div>

        {/* Y-Axis Rows */}
        <div className="divide-y divide-slate-900/60">
          {rooms.map((room) => {
            // Filter reservations for this room that fall within the current timeline window range
            const roomBookings = reservations.filter((res) => {
              if (res.room?.id !== room.id) return false;
              if (res.status === "cancelled") return false; // Hide cancelled bookings on calendar
              
              const resStart = new Date(res.check_in_date);
              const resEnd = new Date(res.check_out_date);
              const calStart = startDate;
              const calEnd = addDays(startDate, 14);

              return resStart < calEnd && resEnd > calStart;
            });

            return (
              <div key={room.id} className="grid grid-cols-15 group relative items-stretch h-14">
                {/* Room Identifier Card */}
                <div className="col-span-2 p-3 border-r border-slate-900 bg-slate-950/80 flex flex-col justify-center sticky left-0 z-10">
                  <span className="font-extrabold text-sm text-white group-hover:text-cyan-400 transition-colors">
                    {room.room_number}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate">
                    {room.room_type?.name}
                  </span>
                </div>

                {/* Date Grid Cells (Clickable) */}
                <div className="col-span-13 grid grid-cols-13 relative items-stretch">
                  {dates.map((dateVal, i) => {
                    const dateStr = formatDateKey(dateVal);
                    return (
                      <div
                        key={i}
                        onClick={() => onCellClick(room, dateStr)}
                        className="col-span-1 border-r border-slate-900/40 hover:bg-slate-900/40 cursor-crosshair transition-colors h-full"
                      />
                    );
                  })}

                  {/* Absolute Positioned Booking Blocks */}
                  {roomBookings.map((booking) => {
                    const resStart = new Date(booking.check_in_date);
                    const resEnd = new Date(booking.check_out_date);

                    // Compute left offset in terms of days
                    let startDaysDiff = differenceInDays(resStart, startDate);
                    let leftOffset = startDaysDiff;
                    if (leftOffset < 0) leftOffset = 0; // Starts before the window view

                    // Compute span width in terms of days
                    let duration = differenceInDays(resEnd, resStart);
                    if (startDaysDiff < 0) {
                      // Adjust duration if starting earlier
                      duration += startDaysDiff;
                    }
                    
                    // Cap duration to fit remaining slots
                    const remainingSlots = 14 - leftOffset;
                    let displaySpan = duration;
                    if (displaySpan > remainingSlots) {
                      displaySpan = remainingSlots;
                    }

                    if (displaySpan <= 0) return null;

                    // Calculate positioning percentages
                    const leftPct = (leftOffset / 14) * 100;
                    const widthPct = (displaySpan / 14) * 100;
                    const colorClass = statusColors[booking.status] || statusColors.pending;

                    return (
                      <div
                        key={booking.id}
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid triggering cell click
                          onBookingClick(booking);
                        }}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          top: "12%",
                          height: "76%",
                        }}
                        className={`absolute z-10 px-3 flex items-center justify-between rounded-lg border text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.01] overflow-hidden select-none ${colorClass}`}
                      >
                        <span className="truncate pr-1">
                          {booking.guest?.first_name} {booking.guest?.last_name}
                        </span>
                        <span className="text-[9px] opacity-80 flex-shrink-0 font-mono">
                          #{booking.id}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {rooms.length === 0 && (
            <div className="p-10 text-center text-slate-500 text-xs">
              No rooms config mapped to this floor/class filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
