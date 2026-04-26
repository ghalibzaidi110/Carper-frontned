"use client";

import { useEffect, useState } from "react";

export interface SecureContextStatus {
  ok: boolean;
  reason?: string;
}

/**
 * `getUserMedia()` only works in a secure context (HTTPS or localhost).
 * On plain HTTP in production, the camera fails silently with a generic
 * error and the user has no idea HTTPS is the cause.
 *
 * This hook returns a structured status the page can use to show a clear
 * banner BEFORE the user clicks Start.
 */
export function useSecureContext(): SecureContextStatus {
  // Render the same default on the server and the first client render to
  // avoid hydration mismatch — only update after mount, when window is safe.
  const [status, setStatus] = useState<SecureContextStatus>({ ok: true });

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.isSecureContext) {
      setStatus({ ok: true });
      return;
    }

    const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(
      window.location.hostname,
    );
    if (isLocalhost) {
      setStatus({ ok: true });
      return;
    }

    setStatus({
      ok: false,
      reason:
        "Camera access requires HTTPS. This page is served over HTTP, so " +
        "live detection cannot start. Visit the HTTPS version of this site.",
    });
  }, []);

  return status;
}
