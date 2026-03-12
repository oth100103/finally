import { Portfolio, TradeResponse, WatchlistItem, PortfolioSnapshot, ChatResponse } from "./types";

const BASE = "/api";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  return res.json();
}

export const api = {
  getPortfolio: () => fetchJSON<Portfolio>(`${BASE}/portfolio`),

  executeTrade: (ticker: string, quantity: number, side: "buy" | "sell") =>
    fetchJSON<TradeResponse>(`${BASE}/portfolio/trade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, quantity, side }),
    }),

  getPortfolioHistory: () =>
    fetchJSON<PortfolioSnapshot[]>(`${BASE}/portfolio/history`),

  getWatchlist: () => fetchJSON<WatchlistItem[]>(`${BASE}/watchlist`),

  addToWatchlist: (ticker: string) =>
    fetchJSON<WatchlistItem>(`${BASE}/watchlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    }),

  removeFromWatchlist: (ticker: string) =>
    fetch(`${BASE}/watchlist/${ticker}`, { method: "DELETE" }),

  sendChat: (message: string) =>
    fetchJSON<ChatResponse>(`${BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }),
};
