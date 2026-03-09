"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { PortfolioSnapshot } from "../lib/types";
import { api } from "../lib/api";

export default function PnLChart() {
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getPortfolioHistory();
      setSnapshots(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || snapshots.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = 35;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, w, h);

    const values = snapshots.map((s) => s.total_value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const isUp = values[values.length - 1] >= values[0];
    const color = isUp ? "#3fb950" : "#f85149";

    // Grid
    ctx.strokeStyle = "#21262d";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 3; i++) {
      const y = pad + ((h - 2 * pad) * i) / 3;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - 5, y);
      ctx.stroke();
      const val = max - (range * i) / 3;
      ctx.fillStyle = "#8b949e";
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`$${val.toFixed(0)}`, pad - 3, y + 3);
    }

    // Line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < values.length; i++) {
      const x = pad + (i / (values.length - 1)) * (w - pad - 5);
      const y = pad + ((max - values[i]) / range) * (h - 2 * pad);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [snapshots]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border text-sm text-muted">Portfolio Value</div>
      <div className="flex-1 relative">
        {snapshots.length < 2 ? (
          <div className="flex items-center justify-center h-full text-muted text-xs">
            Accumulating snapshots...
          </div>
        ) : (
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        )}
      </div>
    </div>
  );
}
