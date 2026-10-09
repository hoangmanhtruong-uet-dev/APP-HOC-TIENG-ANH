import { useEffect, useRef, useState } from "react";

export function usePracticeTimer(serverNow: string, expiresAt: string) {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(
      0,
      Math.ceil(
        (Date.parse(expiresAt) - Date.parse(serverNow)) / 1000,
      ),
    ),
  );
  
  const serverOffsetRef = useRef(0);

  useEffect(() => {
    serverOffsetRef.current = Date.parse(serverNow) - Date.now();
    
    const tick = () => {
      setRemainingSeconds(
        Math.max(
          0,
          Math.ceil(
            (Date.parse(expiresAt) -
              (Date.now() + serverOffsetRef.current)) /
              1000,
          ),
        ),
      );
    };
    
    tick(); // Initial tick
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, serverNow]);

  const isExpired = remainingSeconds === 0;

  return { remainingSeconds, isExpired };
}
