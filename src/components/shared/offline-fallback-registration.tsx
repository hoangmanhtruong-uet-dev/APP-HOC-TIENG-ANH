"use client";

import { useEffect } from "react";

export function OfflineFallbackRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // Registration failure is non-fatal; the normal online application remains usable.
      });
  }, []);
  return null;
}
