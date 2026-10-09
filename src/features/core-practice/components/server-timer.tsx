"use client";

import { useEffect, useState, useRef } from "react";
import { Clock } from "lucide-react";

export function ServerTimer({
  serverExpiresAt,
  serverNow,
  onExpire,
}: {
  serverExpiresAt: string | null | undefined;
  serverNow?: string;
  onExpire: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!serverExpiresAt) {
      return;
    }

    const expiresTime = new Date(serverExpiresAt).getTime();
    
    // Compute the initial difference between client and server (drift)
    // If no serverNow provided, fallback to Date.now() meaning no drift correction.
    const serverTimeMs = serverNow ? new Date(serverNow).getTime() : Date.now();
    const drift = Date.now() - serverTimeMs;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, expiresTime - (now - drift));
      
      setTimeLeft(Math.floor(diff / 1000));

      if (diff <= 0) {
        clearInterval(interval);
        onExpireRef.current();
      }
    };

    updateTimer(); // Initial call
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [serverExpiresAt, serverNow]);

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
