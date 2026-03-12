"use client";
<<<<<<< HEAD
import { useState, useEffect, useCallback } from "react";
import { useSSE } from "./hooks/useSSE";
import { usePortfolio } from "./hooks/usePortfolio";
import { api } from "./lib/api";
import { WatchlistItem } from "./lib/types";
import Header from "./components/Header";
import Watchlist from "./components/Watchlist";
import MainChart from "./components/MainChart";
import Heatmap from "./components/Heatmap";
import PnLChart from "./components/PnLChart";
import PositionsTable from "./components/PositionsTable";
import TradeBar from "./components/TradeBar";
import ChatPanel from "./components/ChatPanel";

export default function Home() {
  const { prices, priceHistory, status, flashStates } = useSSE();
  const { portfolio, refresh: refreshPortfolio } = usePortfolio(prices);
  const [watchlistTickers, setWatchlistTickers] = useState<string[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(true);

  const loadWatchlist = useCallback(async () => {
    try {
      const items: WatchlistItem[] = await api.getWatchlist();
      setWatchlistTickers(items.map((i) => i.ticker));
    } catch {
      // backend not ready
    }
  }, []);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  useEffect(() => {
    if (!selectedTicker && watchlistTickers.length > 0) {
      setSelectedTicker(watchlistTickers[0]);
    }
  }, [watchlistTickers, selectedTicker]);

  const totalValue = portfolio?.total_value ?? 0;
  const cashBalance = portfolio?.cash_balance ?? 0;
  const positions = portfolio?.positions ?? [];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header totalValue={totalValue} cashBalance={cashBalance} status={status} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Watchlist */}
        <div className="w-72 border-r border-border flex flex-col bg-surface">
          <Watchlist
            prices={prices}
            priceHistory={priceHistory}
            flashStates={flashStates}
            tickers={watchlistTickers}
            selectedTicker={selectedTicker}
            onSelect={setSelectedTicker}
            onWatchlistChange={loadWatchlist}
          />
        </div>

        {/* Center: Charts + Portfolio */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top: Main chart */}
          <div className="flex-1 min-h-0 border-b border-border">
            <MainChart ticker={selectedTicker} priceHistory={priceHistory} />
          </div>

          {/* Middle: Heatmap + P&L */}
          <div className="h-40 flex border-b border-border">
            <div className="flex-1 border-r border-border">
              <Heatmap positions={positions} />
            </div>
            <div className="flex-1">
              <PnLChart />
            </div>
          </div>

          {/* Bottom: Positions + Trade Bar */}
          <div className="h-48 flex flex-col">
            <div className="flex-1 overflow-hidden bg-surface">
              <PositionsTable positions={positions} />
            </div>
            <TradeBar selectedTicker={selectedTicker} onTrade={refreshPortfolio} />
          </div>
        </div>

        {/* Right: Chat Panel */}
        {chatOpen && (
          <div className="w-80 flex flex-col">
            <ChatPanel
              isOpen={chatOpen}
              onToggle={() => setChatOpen(!chatOpen)}
              onPortfolioChange={refreshPortfolio}
              onWatchlistChange={loadWatchlist}
            />
          </div>
        )}
      </div>

      {!chatOpen && (
        <ChatPanel
          isOpen={false}
          onToggle={() => setChatOpen(true)}
          onPortfolioChange={refreshPortfolio}
          onWatchlistChange={loadWatchlist}
        />
      )}
=======

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrices } from "@/lib/use-prices";
import { getPortfolio, getWatchlist } from "@/lib/api";
import type { Portfolio, WatchlistItem } from "@/lib/types";
import Header from "@/components/Header";
import Watchlist from "@/components/Watchlist";
import PriceChart from "@/components/PriceChart";
import PositionsTable from "@/components/PositionsTable";
import PortfolioHeatmap from "@/components/PortfolioHeatmap";
import PnlChart from "@/components/PnlChart";
import TradeBar from "@/components/TradeBar";
import ChatPanel from "@/components/ChatPanel";

async function fetchPortfolio(setter: (p: Portfolio) => void) {
  try {
    const data = await getPortfolio();
    setter(data);
  } catch {
    // Retry on next interval
  }
}

async function fetchWatchlist(setter: (w: WatchlistItem[]) => void) {
  try {
    const data = await getWatchlist();
    setter(data);
  } catch {
    // Retry on next interval
  }
}

export default function Home() {
  const { prices, status, getHistory } = usePrices();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [userSelectedTicker, setUserSelectedTicker] = useState<string | null>(null);

  // Derive the effective selected ticker: user selection, or first watchlist item
  const selectedTicker = useMemo(() => {
    if (userSelectedTicker) return userSelectedTicker;
    return watchlist.length > 0 ? watchlist[0].ticker : null;
  }, [userSelectedTicker, watchlist]);

  const refreshWatchlist = useCallback(() => {
    fetchWatchlist(setWatchlist);
  }, []);

  const refreshAll = useCallback(() => {
    fetchPortfolio(setPortfolio);
    fetchWatchlist(setWatchlist);
  }, []);

  // Periodic data refresh via subscription to external system (API)
  useEffect(() => {
    fetchPortfolio(setPortfolio);
    fetchWatchlist(setWatchlist);
    const interval = setInterval(() => {
      fetchPortfolio(setPortfolio);
      fetchWatchlist(setWatchlist);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header
        totalValue={portfolio?.total_value ?? 10000}
        cashBalance={portfolio?.cash_balance ?? 10000}
        status={status}
      />

      <div className="flex-1 flex min-h-0">
        {/* Left column: Watchlist + Trade bar */}
        <div className="w-80 flex flex-col border-r border-border bg-bg-panel shrink-0">
          <div className="flex-1 min-h-0">
            <Watchlist
              items={watchlist}
              prices={prices}
              getHistory={getHistory}
              selectedTicker={selectedTicker}
              onSelectTicker={setUserSelectedTicker}
              onRefresh={refreshWatchlist}
            />
          </div>
          <TradeBar prices={prices} onTradeExecuted={refreshAll} />
        </div>

        {/* Center: Charts + Positions */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top row: Price Chart + Portfolio Heatmap */}
          <div className="flex-1 flex min-h-0">
            <div className="flex-[2] border-r border-border min-w-0">
              <PriceChart ticker={selectedTicker} getHistory={getHistory} />
            </div>
            <div className="flex-1 min-w-0">
              <PortfolioHeatmap positions={portfolio?.positions ?? []} />
            </div>
          </div>

          {/* Bottom row: Positions + P&L Chart */}
          <div className="h-[40%] flex border-t border-border min-h-0">
            <div className="flex-1 border-r border-border min-w-0">
              <PositionsTable positions={portfolio?.positions ?? []} />
            </div>
            <div className="flex-1 min-w-0">
              <PnlChart />
            </div>
          </div>
        </div>

        {/* Right column: Chat panel */}
        <div className="w-80 shrink-0">
          <ChatPanel onTradeExecuted={refreshAll} />
        </div>
      </div>
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7
    </div>
  );
}
