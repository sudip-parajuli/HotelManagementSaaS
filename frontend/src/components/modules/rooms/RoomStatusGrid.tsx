"use client";

import React from "react";
import { Bed } from "lucide-react";
import { RoomCard } from "./RoomCard";
import type { Room } from "@/lib/types";

interface RoomStatusGridProps {
  rooms: Room[];
  onRoomClick: (room: Room) => void;
}

export const RoomStatusGrid: React.FC<RoomStatusGridProps> = ({ rooms, onRoomClick }) => {
  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-workspace-900 bg-workspace-950/40 text-workspace-400 space-y-4">
        <div className="p-4 rounded-full bg-workspace-900 text-workspace-500">
          <Bed className="h-10 w-10" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-semibold text-foreground">No rooms found</h3>
          <p className="text-sm">Try adjusting your filters or add a new room to this floor.</p>
        </div>
      </div>
    );
  }

  // Group rooms by floor
  const roomsByFloor = rooms.reduce<Record<number, Room[]>>((acc, room) => {
    const floor = room.floor;
    if (!acc[floor]) {
      acc[floor] = [];
    }
    acc[floor].push(room);
    return acc;
  }, {});

  // Sort floors ascending
  const sortedFloors = Object.keys(roomsByFloor)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-10">
      {sortedFloors.map((floor) => (
        <div key={floor} className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-wider text-workspace-400 uppercase">
              {floor === 0 ? "Ground Floor" : `Floor ${floor}`}
            </span>
            <div className="flex-1 h-px bg-workspace-900" />
            <span className="text-xs text-workspace-500 font-semibold bg-workspace-900 border border-workspace-800 px-2 py-0.5 rounded-md">
              {roomsByFloor[floor].length} {roomsByFloor[floor].length === 1 ? "Room" : "Rooms"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {roomsByFloor[floor].map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onClick={() => onRoomClick(room)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
