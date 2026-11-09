import { useEffect, useRef } from "react";

export default function BackendWakeup() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    for (const path of ["/api/healthz", "/api/admin-healthz"]) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 70_000);
      void fetch(path, {
        cache: "no-store",
        credentials: "omit",
        signal: controller.signal,
      }).catch(() => undefined).finally(() => window.clearTimeout(timeout));
    }
    // Let the bounded requests finish through Strict Mode's effect replay.
  }, []);

  return null;
}
