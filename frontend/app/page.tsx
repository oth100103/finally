"use client";
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
    </div>
  );
}
