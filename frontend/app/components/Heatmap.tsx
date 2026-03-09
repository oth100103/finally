"use client";
import { Position } from "../lib/types";

interface HeatmapProps {
  positions: Position[];
}

export default function Heatmap({ positions }: HeatmapProps) {
  if (positions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        No positions to display
      </div>
    );
  }

  const totalValue = positions.reduce((s, p) => s + p.current_price * p.quantity, 0);

  // Simple treemap layout: single row, widths proportional to value
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border text-sm text-muted">Portfolio Heatmap</div>
      <div className="flex-1 flex p-1 gap-1">
        {positions.map((pos) => {
          const weight = (pos.current_price * pos.quantity) / totalValue;
          const pnlPercent = pos.pnl_percent;
          const intensity = Math.min(Math.abs(pnlPercent) / 5, 1);
          const bg = pnlPercent >= 0
            ? `rgba(63, 185, 80, ${0.15 + intensity * 0.6})`
            : `rgba(248, 81, 73, ${0.15 + intensity * 0.6})`;

          return (
            <div
              key={pos.ticker}
              className="flex flex-col items-center justify-center rounded text-xs font-bold"
              style={{
                flex: `${weight}`,
                minWidth: "40px",
                backgroundColor: bg,
              }}
            >
              <span className="text-foreground">{pos.ticker}</span>
              <span className={pnlPercent >= 0 ? "text-green" : "text-red"} style={{ fontSize: "10px" }}>
                {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
