"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function ServerTimer({
  serverExpiresAt,
  onExpire,
}: {
  serverExpiresAt: string | null;
  onExpire: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!serverExpiresAt) {
      return;
    }

    const expiresTime = new Date(serverExpiresAt).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, expiresTime - now);
      
      setTimeLeft(Math.floor(diff / 1000));

      if (diff <= 0) {
        clearInterval(interval);
        onExpire();
      }
    };

    updateTimer(); // Initial call
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [serverExpiresAt, onExpire]);

  if (timeLeft === null) {
    return (
      <div className="flex items-center text-zinc-500 text-sm">
        <Clock className="w-4 h-4 mr-1.5" />
        Không giới hạn
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  const isWarning = timeLeft <= 60; // Less than 1 minute

  return (
    <div className={`flex items-center text-sm font-mono font-medium ${isWarning ? "text-red-500 animate-pulse" : "text-zinc-700 dark:text-zinc-300"}`}>
      <Clock className="w-4 h-4 mr-1.5" />
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </div>
  );
}
