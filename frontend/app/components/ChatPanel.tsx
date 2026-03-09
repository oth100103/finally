"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "../lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  trades?: Array<{ ticker: string; side: string; quantity: number; price: number; status: string }>;
  watchlistChanges?: Array<{ ticker: string; action: string; status: string }>;
}

interface ChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onPortfolioChange: () => void;
  onWatchlistChange: () => void;
}

export default function ChatPanel({ isOpen, onToggle, onPortfolioChange, onWatchlistChange }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.sendChat(text);
      const msg: Message = {
        role: "assistant",
        content: res.message,
        trades: res.trades_executed,
        watchlistChanges: res.watchlist_changes_executed,
      };
      setMessages((prev) => [...prev, msg]);

      if (res.trades_executed?.length) onPortfolioChange();
      if (res.watchlist_changes_executed?.length) onWatchlistChange();
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-4 bottom-4 bg-accent-purple text-white px-4 py-2 rounded-lg shadow-lg hover:opacity-90 text-sm font-bold z-50"
      >
        AI Chat
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full border-l border-border bg-surface">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-bold text-accent-blue">AI Assistant</span>
        <button onClick={onToggle} className="text-muted hover:text-foreground text-xs">
          Close
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-muted text-xs text-center mt-8">
            Ask me about your portfolio, request analysis, or tell me to execute trades.
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`text-xs ${msg.role === "user" ? "text-right" : ""}`}>
            <div
              className={`inline-block max-w-[90%] rounded-lg px-3 py-2 ${
                msg.role === "user"
                  ? "bg-accent-purple/20 text-foreground"
                  : "bg-background text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.trades?.map((t, j) => (
                <div key={j} className="mt-1 text-[10px] border-t border-border/50 pt-1">
                  <span className={t.side === "buy" ? "text-green" : "text-red"}>
                    {t.side.toUpperCase()}
                  </span>{" "}
                  {t.quantity} {t.ticker} @ ${t.price?.toFixed(2)} —{" "}
                  <span className="text-muted">{t.status}</span>
                </div>
              ))}
              {msg.watchlistChanges?.map((w, j) => (
                <div key={j} className="mt-1 text-[10px] border-t border-border/50 pt-1">
                  <span className="text-accent-blue">{w.action}</span> {w.ticker} —{" "}
                  <span className="text-muted">{w.status}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs text-muted animate-pulse">Thinking...</div>
        )}
      </div>
      <div className="p-2 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask anything..."
            className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent-blue"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-accent-purple text-white px-3 py-1.5 rounded text-xs font-bold hover:opacity-80 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
