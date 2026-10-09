"use client";

import { Maximize, Minimize } from "lucide-react";
import { useEffect, useState } from "react";

export function ZenModeToggle() {
  const [isZenMode, setIsZenMode] = useState(false);

  useEffect(() => {
    if (isZenMode) {
      document.body.classList.add("zen-mode");
    } else {
      document.body.classList.remove("zen-mode");
    }

    return () => {
      document.body.classList.remove("zen-mode");
    };
  }, [isZenMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isZenMode) {
        setIsZenMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZenMode]);

  return (
    <button
      onClick={() => setIsZenMode((p) => !p)}
      className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
      title={isZenMode ? "Thoát chế độ tập trung (Esc)" : "Chế độ tập trung"}
    >
      {isZenMode ? (
        <>
          <Minimize className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Thoát Zen Mode</span>
        </>
      ) : (
        <>
          <Maximize className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Zen Mode</span>
        </>
      )}
    </button>
  );
}
