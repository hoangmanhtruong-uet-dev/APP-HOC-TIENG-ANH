"use client";

import React, { useMemo } from "react";

interface StudyHeatmapProps {
  activeDays?: number;
  totalTime?: string;
  data?: number[];
}

export function StudyHeatmap({
  activeDays = 32,
  totalTime = "13h 0m",
  data,
}: StudyHeatmapProps) {
  // 18 weeks * 7 days = 126 cells
  const cells = useMemo(() => {
    if (data && data.length >= 126) {
      return data.slice(0, 126);
    }
    // Deterministic pseudo-random generation matching prototype (32 active days)
    let s = 7;
    const r = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const N = 126;
    const result = Array<number>(N).fill(0);
    let n = 0;
    while (n < activeDays) {
      const i = Math.floor(r() * N);
      const bias = i > N * 0.35 || r() > 0.6;
      if (!result[i] && bias) {
        result[i] = 1 + Math.floor(r() * 4);
        n++;
      }
    }
    return result;
  }, [data, activeDays]);

  return (
    <div className="box">
      <div className="heat-top">
        <div>
          <b>{activeDays}</b>
          <small>active days</small>
        </div>
        <div>
          <b>{totalTime}</b>
          <small>total</small>
        </div>
      </div>

      <div
        className="heat"
        style={{ gridTemplateColumns: "repeat(18, 1fr)" }}
        aria-label="Study activity over the last 18 weeks"
      >
        {cells.map((level, i) => (
          <i
            key={i}
            className={level > 0 ? `l${level}` : undefined}
            title={level > 0 ? `Activity level: ${level}` : "No activity"}
          />
        ))}
      </div>

      <div className="legend">
        <span>Less</span>
        <i style={{ background: "var(--panel2)" }} />
        <i style={{ background: "#2C3170" }} />
        <i style={{ background: "#4045B5" }} />
        <i style={{ background: "var(--indigo-hi)" }} />
        <i style={{ background: "var(--mark)" }} />
        <span>More</span>
      </div>
    </div>
  );
}
