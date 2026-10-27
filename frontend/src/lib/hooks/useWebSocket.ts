"use client";
import { useEffect, useRef, useCallback } from "react";
type Message = Record<string, any>;
interface Options { onMessage?: (data: Message) => void; onOpen?: () => void; onClose?: () => void; onError?: (error: Event) => void; reconnectInterval?: number; maxRetries?: number; }
/** Shared authenticated HTTP event feed. The legacy hook name keeps callers compatible. */
export function useWebSocket(channel: string, options: Options = {}) {
  const handlers = useRef(options);
  handlers.current = options;
  const abort = useRef<AbortController | null>(null);
  const stopped = useRef(false);
  useEffect(() => {
    stopped.current = false;
    let cursor: number | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let connected = false;
    let failures = 0;
    async function poll() {
      if (stopped.current) return;
      if (document.hidden) { timer = setTimeout(poll, 5000); return; }
      const controller = new AbortController();
      abort.current = controller;
      try {
        const query = new URLSearchParams({ channel });
        if (cursor !== undefined) query.set("cursor", String(cursor));
        const response = await fetch(`/api/operations/events/?${query}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        const result = await response.json();
        if (stopped.current) return;
        cursor = result.cursor;
        if (!connected) { connected = true; handlers.current.onOpen?.(); }
        failures = 0;
        if (result.resync) handlers.current.onMessage?.({ event: "resync" });
        for (const message of result.events) handlers.current.onMessage?.(message);
      } catch (error) {
        if (controller.signal.aborted || stopped.current) return;
        failures++;
        cursor = undefined; // Reconcile the screen after any delivery gap.
        if (connected) { connected = false; handlers.current.onClose?.(); }
        handlers.current.onError?.(new Event("error"));
      }
      if (!stopped.current) timer = setTimeout(poll, failures ? Math.min(30000, 3000 * failures) : 5000);
    }
    const resume = () => { if (!document.hidden && !stopped.current) { clearTimeout(timer); abort.current?.abort(); cursor = undefined; void poll(); } };
    void poll();
    document.addEventListener("visibilitychange", resume);
    return () => { stopped.current = true; clearTimeout(timer); abort.current?.abort(); document.removeEventListener("visibilitychange", resume); if (connected) handlers.current.onClose?.(); };
  }, [channel]);
  const disconnect = useCallback(() => { stopped.current = true; abort.current?.abort(); }, []);
  // Mutations continue through the ordinary authorized REST endpoints.
  const send = useCallback((_data: Message) => {}, []);
  return { send, disconnect };
}
