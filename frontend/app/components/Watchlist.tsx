"use client";
import { useState } from "react";
import { PriceUpdate } from "../lib/types";
import { api } from "../lib/api";
import Sparkline from "./Sparkline";

interface WatchlistProps {
  prices: Record<string, PriceUpdate>;
  priceHistory: Record<string, { price: number; time: number }[]>;
  flashStates: Record<string, "up" | "down" | null>;
  tickers: string[];
  selectedTicker: string | null;
  onSelect: (ticker: string) => void;
  onWatchlistChange: () => void;
}

export default function Watchlist({
  prices,
  priceHistory,
  flashStates,
  tickers,
  selectedTicker,
  onSelect,
  onWatchlistChange,
}: WatchlistProps) {
  const [newTicker, setNewTicker] = useState("");

  const handleAdd = async () => {
    const ticker = newTicker.trim().toUpperCase();
    if (!ticker) return;
    try {
      await api.addToWatchlist(ticker);
      setNewTicker("");
      onWatchlistChange();
    } catch {
      // ignore
    }
  };

  const handleRemove = async (ticker: string) => {
    try {
      await api.removeFromWatchlist(ticker);
      onWatchlistChange();
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-border">
        <input
          type="text"
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add ticker..."
          className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent-blue"
        />
        <button
          onClick={handleAdd}
          className="bg-accent-purple text-white text-xs px-2 py-1 rounded hover:opacity-80"
        >
          Add
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="text-left py-1 px-2">Ticker</th>
              <th className="text-right py-1 px-2">Price</th>
              <th className="text-right py-1 px-2">Chg%</th>
              <th className="py-1 px-1">Chart</th>
              <th className="py-1 px-1"></th>
            </tr>
          </thead>
          <tbody>
            {tickers.map((ticker) => {
              const p = prices[ticker];
              const flash = flashStates[ticker];
              const changePercent = p && p.previous_price
                ? ((p.price - p.previous_price) / p.previous_price) * 100
                : 0;
              const isSelected = selectedTicker === ticker;

              return (
                <tr
                  key={ticker}
                  onClick={() => onSelect(ticker)}
                  className={`cursor-pointer border-b border-border/50 hover:bg-surface/80 ${
                    isSelected ? "bg-surface" : ""
                  } ${flash === "up" ? "flash-green" : flash === "down" ? "flash-red" : ""}`}
                >
                  <td className="py-1.5 px-2 font-bold text-accent-yellow">{ticker}</td>
                  <td className="py-1.5 px-2 text-right font-mono">
                    {p ? `$${p.price.toFixed(2)}` : "--"}
                  </td>
                  <td className={`py-1.5 px-2 text-right ${changePercent >= 0 ? "text-green" : "text-red"}`}>
                    {p ? `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%` : "--"}
                  </td>
                  <td className="py-1 px-1">
                    <Sparkline data={priceHistory[ticker] || []} />
                  </td>
                  <td className="py-1 px-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(ticker);
                      }}
                      className="text-muted hover:text-red text-xs"
                      title="Remove"
                    >
                      x
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
