"use client";
import { useRef, useEffect } from "react";

interface MainChartProps {
  ticker: string | null;
  priceHistory: Record<string, { price: number; time: number }[]>;
}

export default function MainChart({ ticker, priceHistory }: MainChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ticker) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const data = priceHistory[ticker] || [];
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = 40;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, w, h);

    if (data.length < 2) {
      ctx.fillStyle = "#8b949e";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for data...", w / 2, h / 2);
      return;
    }

    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const isUp = prices[prices.length - 1] >= prices[0];

    // Grid lines
    ctx.strokeStyle = "#21262d";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad + ((h - 2 * pad) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - 10, y);
      ctx.stroke();

      const val = max - (range * i) / 4;
      ctx.fillStyle = "#8b949e";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`$${val.toFixed(2)}`, pad - 4, y + 3);
    }

    // Price line
    const gradient = ctx.createLinearGradient(0, pad, 0, h - pad);
    const lineColor = isUp ? "#3fb950" : "#f85149";
    gradient.addColorStop(0, lineColor + "40");
    gradient.addColorStop(1, lineColor + "00");

    // Fill area
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = pad + (i / (data.length - 1)) * (w - pad - 10);
      const y = pad + ((max - prices[i]) / range) * (h - 2 * pad);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(pad + (w - pad - 10), h - pad);
    ctx.lineTo(pad, h - pad);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    for (let i = 0; i < data.length; i++) {
      const x = pad + (i / (data.length - 1)) * (w - pad - 10);
      const y = pad + ((max - prices[i]) / range) * (h - 2 * pad);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Current price label
    const lastPrice = prices[prices.length - 1];
    ctx.fillStyle = lineColor;
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`$${lastPrice.toFixed(2)}`, w - 12, pad - 8);
  }, [ticker, priceHistory]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border text-sm">
        <span className="text-accent-yellow font-bold">{ticker || "Select a ticker"}</span>
        <span className="text-muted ml-2">Price Chart</span>
      </div>
      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
}
