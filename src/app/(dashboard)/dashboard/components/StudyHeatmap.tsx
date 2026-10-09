"use client";

import React, { memo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface StudyHeatmapProps {
  /** 35 values, index 0 = oldest day */
  data: number[];
}

const DAY_LABELS = ["M", "", "W", "", "F", "", "S"];

function intensity(mins: number): 0 | 1 | 2 | 3 | 4 {
  if (mins === 0) return 0;
  if (mins < 10) return 1;
  if (mins < 20) return 2;
  if (mins < 35) return 3;
  return 4;
}

const LEVEL_CLASSES = [
  "bg-[var(--muted)]",
  "bg-[var(--primary-soft)] opacity-50",
  "bg-[var(--primary-soft)]",
  "bg-[var(--primary)] opacity-50",
  "bg-[var(--primary)]",
];

export const StudyHeatmap = memo(function StudyHeatmap({
  data,
}: StudyHeatmapProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(t);
  }, []);

  const cells = data.slice(0, 35);
  const weeks = Array.from({ length: 5 }, (_, w) =>
    cells.slice(w * 7, w * 7 + 7)
  );

  const totalMins = cells.reduce((a, b) => a + b, 0);
  const activeDays = cells.filter((m) => m > 0).length;

  return (
    <div>
      {/* Stats row */}
      <div className="mb-3 flex items-center gap-4 text-xs font-semibold text-[var(--muted-foreground)]">
        <span>
          <span className="font-black text-[var(--foreground)]">{activeDays}</span>{" "}
          active days
        </span>
        <span>
          <span className="font-black text-[var(--foreground)]">
            {Math.floor(totalMins / 60)}h {totalMins % 60}m
          </span>{" "}
          total
        </span>
      </div>

      {/* Grid */}
      <div className="flex gap-[5px]">
        {/* Day labels column */}
        <div className="flex flex-col gap-[5px] pr-1">
          {DAY_LABELS.map((d, i) => (
            <span
              key={i}
              className="flex h-3 w-4 items-center text-[9px] font-medium text-[var(--muted-foreground)]"
            >
              {d}
            </span>
          ))}
        </div>

        {/* Cells */}
        {weeks.map((week, w) => (
          <div key={w} className="flex flex-col gap-[5px]">
            {week.map((mins, d) => {
              const lvl = intensity(mins);
              const delay = (w * 7 + d) * 14;
              return (
                <div
                  key={d}
                  title={`${mins} min`}
                  className={cn(
                    "h-3 w-3 rounded-[2px] transition-all duration-500",
                    mounted ? LEVEL_CLASSES[lvl] : "bg-[var(--muted)]"
                  )}
                  style={{ transitionDelay: `${delay}ms` }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-1.5 text-[9px] font-medium text-[var(--muted-foreground)]">
        <span>Less</span>
        {LEVEL_CLASSES.map((cls, i) => (
          <div key={i} className={cn("h-3 w-3 rounded-[2px]", cls)} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
});
