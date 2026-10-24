"use client";

import React from "react";
import Link from "next/link";

interface WeeklyLeagueCardProps {
  userXp?: number;
  userInitial?: string;
}

export function WeeklyLeagueCard({
  userXp = 1450,
  userInitial = "H",
}: WeeklyLeagueCardProps) {
  const formattedXp = Number(userXp).toLocaleString();
  const rank6Xp = (userXp + 50).toLocaleString();
  const rank8Xp = Math.max(0, userXp - 40).toLocaleString();

  return (
    <div className="box lg">
      <div className="head" style={{ marginBottom: "10px" }}>
        <h2 style={{ fontSize: "19px" }}>Weekly league</h2>
        <Link href="/leaderboard" prefetch={false}>
          View full
        </Link>
      </div>

      <div className="r">
        <span className="rk">6</span>
        <span className="av">NH</span>
        <span>Nam Hoàng</span>
        <span className="xp">{rank6Xp} XP</span>
      </div>

      <div className="r me2">
        <span className="rk" style={{ color: "var(--mark)" }}>
          7
        </span>
        <span className="av">{userInitial}</span>
        <b>You</b>
        <span className="xp">{formattedXp} XP</span>
      </div>

      <div className="r">
        <span className="rk">8</span>
        <span className="av">MT</span>
        <span>Minh Thư</span>
        <span className="xp">{rank8Xp} XP</span>
      </div>

      <div className="gap">+51 XP overtakes rank 6</div>
    </div>
  );
}
