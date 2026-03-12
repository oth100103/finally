import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Watchlist from "../Watchlist";
import { api } from "../../lib/api";

jest.mock("../../lib/api", () => ({
  api: {
    addToWatchlist: jest.fn(),
    removeFromWatchlist: jest.fn(),
  },
}));

// Mock Sparkline since it uses canvas
jest.mock("../Sparkline", () => {
  return function MockSparkline() {
    return <div data-testid="sparkline" />;
  };
});

const defaultProps = {
  prices: {
    AAPL: { ticker: "AAPL", price: 190.5, previous_price: 189, timestamp: "", direction: "up" as const },
    GOOGL: { ticker: "GOOGL", price: 175, previous_price: 176, timestamp: "", direction: "down" as const },
  },
  priceHistory: {},
  flashStates: {},
  tickers: ["AAPL", "GOOGL"],
  selectedTicker: null,
  onSelect: jest.fn(),
  onWatchlistChange: jest.fn(),
};

describe("Watchlist", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders ticker rows with prices", () => {
    render(<Watchlist {...defaultProps} />);
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("GOOGL")).toBeInTheDocument();
    expect(screen.getByText("$190.50")).toBeInTheDocument();
    expect(screen.getByText("$175.00")).toBeInTheDocument();
  });

  it("calls onSelect when a ticker row is clicked", () => {
    render(<Watchlist {...defaultProps} />);
    fireEvent.click(screen.getByText("AAPL"));
    expect(defaultProps.onSelect).toHaveBeenCalledWith("AAPL");
  });

  it("adds a ticker via input", async () => {
    (api.addToWatchlist as jest.Mock).mockResolvedValue({});
    render(<Watchlist {...defaultProps} />);

    const input = screen.getByPlaceholderText("Add ticker...");
    fireEvent.change(input, { target: { value: "TSLA" } });
    fireEvent.click(screen.getByText("Add"));

    await waitFor(() => {
      expect(api.addToWatchlist).toHaveBeenCalledWith("TSLA");
      expect(defaultProps.onWatchlistChange).toHaveBeenCalled();
    });
  });

  it("removes a ticker", async () => {
    (api.removeFromWatchlist as jest.Mock).mockResolvedValue({});
    render(<Watchlist {...defaultProps} />);

    const removeButtons = screen.getAllByText("x");
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(api.removeFromWatchlist).toHaveBeenCalledWith("AAPL");
      expect(defaultProps.onWatchlistChange).toHaveBeenCalled();
    });
  });
});
