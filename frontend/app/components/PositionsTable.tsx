"use client";
import { Position } from "../lib/types";

interface PositionsTableProps {
  positions: Position[];
}

export default function PositionsTable({ positions }: PositionsTableProps) {
  if (positions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        No positions yet. Buy some shares!
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-surface">
          <tr className="text-muted border-b border-border">
            <th className="text-left py-1.5 px-2">Ticker</th>
            <th className="text-right py-1.5 px-2">Qty</th>
            <th className="text-right py-1.5 px-2">Avg Cost</th>
            <th className="text-right py-1.5 px-2">Price</th>
            <th className="text-right py-1.5 px-2">P&L</th>
            <th className="text-right py-1.5 px-2">%</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => (
            <tr key={pos.ticker} className="border-b border-border/50">
              <td className="py-1.5 px-2 font-bold text-accent-yellow">{pos.ticker}</td>
              <td className="py-1.5 px-2 text-right">{pos.quantity.toFixed(2)}</td>
              <td className="py-1.5 px-2 text-right">${pos.avg_cost.toFixed(2)}</td>
              <td className="py-1.5 px-2 text-right">${pos.current_price.toFixed(2)}</td>
              <td className={`py-1.5 px-2 text-right font-bold ${pos.unrealized_pnl >= 0 ? "text-green" : "text-red"}`}>
                ${pos.unrealized_pnl.toFixed(2)}
              </td>
              <td className={`py-1.5 px-2 text-right ${pos.pnl_percent >= 0 ? "text-green" : "text-red"}`}>
                {pos.pnl_percent >= 0 ? "+" : ""}{pos.pnl_percent.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
