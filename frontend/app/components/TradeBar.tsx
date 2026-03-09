"use client";
import { useState } from "react";
import { api } from "../lib/api";

interface TradeBarProps {
  selectedTicker: string | null;
  onTrade: () => void;
}

export default function TradeBar({ selectedTicker, onTrade }: TradeBarProps) {
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const activeTicker = ticker.toUpperCase() || selectedTicker || "";

  const executeTrade = async (side: "buy" | "sell") => {
    const qty = parseFloat(quantity);
    if (!activeTicker || isNaN(qty) || qty < 0.01) {
      setError("Enter valid ticker and quantity (min 0.01)");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.executeTrade(activeTicker, qty, side);
      setQuantity("");
      onTrade();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Trade failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-t border-border bg-surface text-xs">
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        placeholder={selectedTicker || "Ticker"}
        className="w-20 bg-background border border-border rounded px-2 py-1.5 text-foreground placeholder:text-muted focus:outline-none focus:border-accent-blue uppercase"
      />
      <input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="Qty"
        min="0.01"
        step="0.01"
        className="w-20 bg-background border border-border rounded px-2 py-1.5 text-foreground placeholder:text-muted focus:outline-none focus:border-accent-blue"
      />
      <button
        onClick={() => executeTrade("buy")}
        disabled={loading}
        className="bg-green/20 text-green border border-green/30 px-3 py-1.5 rounded font-bold hover:bg-green/30 disabled:opacity-50"
      >
        BUY
      </button>
      <button
        onClick={() => executeTrade("sell")}
        disabled={loading}
        className="bg-red/20 text-red border border-red/30 px-3 py-1.5 rounded font-bold hover:bg-red/30 disabled:opacity-50"
      >
        SELL
      </button>
      {error && <span className="text-red text-xs ml-2">{error}</span>}
    </div>
  );
}
