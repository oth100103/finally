"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { PriceUpdate } from "../lib/types";

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

export function useSSE() {
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});
  const [priceHistory, setPriceHistory] = useState<Record<string, { price: number; time: number }[]>>({});
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const eventSourceRef = useRef<EventSource | null>(null);
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [flashStates, setFlashStates] = useState<Record<string, "up" | "down" | null>>({});

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource("/api/stream/prices");
    eventSourceRef.current = es;

    es.onopen = () => setStatus("connected");

    es.onmessage = (event) => {
      try {
        const data: PriceUpdate = JSON.parse(event.data);
        setPrices((prev) => ({ ...prev, [data.ticker]: data }));

        setPriceHistory((prev) => {
          const history = prev[data.ticker] || [];
          const newPoint = { price: data.price, time: Date.now() };
          const updated = [...history, newPoint].slice(-60);
          return { ...prev, [data.ticker]: updated };
        });

        if (data.direction !== "unchanged") {
          setFlashStates((prev) => ({ ...prev, [data.ticker]: data.direction as "up" | "down" }));
          if (flashTimers.current[data.ticker]) {
            clearTimeout(flashTimers.current[data.ticker]);
          }
          flashTimers.current[data.ticker] = setTimeout(() => {
            setFlashStates((prev) => ({ ...prev, [data.ticker]: null }));
          }, 500);
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setStatus("reconnecting");
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
      Object.values(flashTimers.current).forEach(clearTimeout);
    };
  }, [connect]);

  return { prices, priceHistory, status, flashStates };
}
