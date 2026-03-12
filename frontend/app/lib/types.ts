export interface PriceUpdate {
  ticker: string;
  price: number;
  previous_price: number;
  timestamp: string;
  direction: "up" | "down" | "unchanged";
}

export interface Position {
  ticker: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  unrealized_pnl: number;
  pnl_percent: number;
}

export interface Portfolio {
  cash_balance: number;
  total_value: number;
  positions: Position[];
}

export interface Trade {
  id: string;
  ticker: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  executed_at: string;
}

export interface TradeResponse {
  trade: Trade;
  cash_balance: number;
  position: Position | null;
}

export interface WatchlistItem {
  ticker: string;
  price?: number;
  previous_price?: number;
  change_percent?: number;
  added_at: string;
}

export interface PortfolioSnapshot {
  id: string;
  total_value: number;
  recorded_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: {
    trades_executed?: Array<Trade & { status: string }>;
    watchlist_changes_executed?: Array<{ ticker: string; action: string; status: string }>;
  };
  created_at: string;
}

export interface ChatResponse {
  message: string;
  trades_executed: Array<Trade & { status: string }>;
  watchlist_changes_executed: Array<{ ticker: string; action: string; status: string }>;
}
