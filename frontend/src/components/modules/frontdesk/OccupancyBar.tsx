import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface OccupancyBarProps {
  rate: number;
  totalRooms: number;
  occupiedRooms: number;
}

export const OccupancyBar: React.FC<OccupancyBarProps> = ({ rate, totalRooms, occupiedRooms }) => {
  const radius = 45;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-md shadow-lg rounded-xl overflow-hidden">
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today Occupancy</p>
          <h3 className="text-2xl font-extrabold text-white tracking-tight">{rate}%</h3>
          <p className="text-[11px] text-slate-400 font-medium">
            {occupiedRooms} of {totalRooms} units occupied today
          </p>
        </div>
        <div className="relative flex items-center justify-center">
          <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
            <circle
              stroke="rgba(30, 41, 59, 0.6)"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <circle
              stroke="url(#occupancy-gradient)"
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={circumference + " " + circumference}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <defs>
              <linearGradient id="occupancy-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute text-[10px] font-extrabold text-cyan-400">{rate}%</span>
        </div>
      </CardContent>
    </Card>
  );
};
