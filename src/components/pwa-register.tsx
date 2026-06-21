"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (window.location.protocol !== "https:" && !isLocalhost) return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Falha ao registrar service worker:", error);
    });
  }, []);

  return null;
}
