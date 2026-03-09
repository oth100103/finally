"use client";
import { useState, useEffect, useCallback } from "react";
import { Portfolio, PriceUpdate } from "../lib/types";
import { api } from "../lib/api";

export function usePortfolio(prices: Record<string, PriceUpdate>) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getPortfolio();
      setPortfolio(data);
    } catch {
      // backend not ready yet
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Update current prices from SSE
  const enrichedPortfolio = portfolio
    ? {
        ...portfolio,
        positions: portfolio.positions.map((pos) => {
          const livePrice = prices[pos.ticker]?.price;
          if (livePrice && livePrice !== pos.current_price) {
            const unrealized_pnl = (livePrice - pos.avg_cost) * pos.quantity;
            const pnl_percent = ((livePrice - pos.avg_cost) / pos.avg_cost) * 100;
            return { ...pos, current_price: livePrice, unrealized_pnl, pnl_percent };
          }
          return pos;
        }),
        total_value:
          portfolio.cash_balance +
          portfolio.positions.reduce((sum, pos) => {
            const livePrice = prices[pos.ticker]?.price ?? pos.current_price;
            return sum + livePrice * pos.quantity;
          }, 0),
      }
    : null;

  return { portfolio: enrichedPortfolio, refresh };
}
