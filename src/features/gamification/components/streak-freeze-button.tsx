"use client";

import { useState } from "react";
import { Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buyStreakFreezeAction } from "../actions";

export function StreakFreezeButton({ currentFreezes, currentXp }: { currentFreezes: number, currentXp: number }) {
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    if (confirm("Đổi 500 XP lấy 1 Streak Freeze?")) {
      setLoading(true);
      const res = await buyStreakFreezeAction();
      setLoading(false);
      if (res?.error) {
        alert(res.error);
      } else {
        alert("Đổi thành công!");
      }
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-2 border border-blue-100">
      <div className="flex flex-col">
        <span className="text-sm font-bold text-blue-900 flex items-center gap-1">
          <Snowflake size={14} className="text-blue-500" />
          Bảo vệ chuỗi ngày (Freezes: {currentFreezes})
        </span>
        <span className="text-xs text-blue-700">Giá: 500 XP</span>
      </div>
      <Button 
        size="sm" 
        onClick={handleBuy} 
        disabled={loading || currentXp < 500}
        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
      >
        Mua ngay
      </Button>
    </div>
  );
}
