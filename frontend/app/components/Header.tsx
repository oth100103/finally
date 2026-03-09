"use client";
import { ConnectionStatus } from "../hooks/useSSE";

interface HeaderProps {
  totalValue: number;
  cashBalance: number;
  status: ConnectionStatus;
}

const statusColors: Record<ConnectionStatus, string> = {
  connected: "bg-green",
  reconnecting: "bg-accent-yellow",
  disconnected: "bg-red",
};

export default function Header({ totalValue, cashBalance, status }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface">
      <div className="flex items-center gap-3">
        <h1 className="text-accent-yellow font-bold text-lg tracking-wide">FinAlly</h1>
        <span className="text-muted text-xs">AI Trading Workstation</span>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="text-muted mr-2">Portfolio</span>
          <span className="font-bold text-accent-blue">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div>
          <span className="text-muted mr-2">Cash</span>
          <span className="font-bold">${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
          <span className="text-muted text-xs capitalize">{status}</span>
        </div>
      </div>
    </header>
  );
}
