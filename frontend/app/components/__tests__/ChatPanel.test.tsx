import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChatPanel from "../ChatPanel";
import { api } from "../../lib/api";

jest.mock("../../lib/api", () => ({
  api: {
    sendChat: jest.fn(),
  },
}));

const defaultProps = {
  isOpen: true,
  onToggle: jest.fn(),
  onPortfolioChange: jest.fn(),
  onWatchlistChange: jest.fn(),
};

describe("ChatPanel", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows floating button when closed", () => {
    render(<ChatPanel {...defaultProps} isOpen={false} />);
    expect(screen.getByText("AI Chat")).toBeInTheDocument();
  });

  it("shows chat panel when open", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask anything...")).toBeInTheDocument();
  });

  it("shows empty state message", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText(/Ask me about your portfolio/)).toBeInTheDocument();
  });

  it("sends a message and displays response", async () => {
    (api.sendChat as jest.Mock).mockResolvedValue({
      message: "Your portfolio looks great!",
      trades_executed: [],
      watchlist_changes_executed: [],
    });

    render(<ChatPanel {...defaultProps} />);
    const input = screen.getByPlaceholderText("Ask anything...");
    fireEvent.change(input, { target: { value: "How is my portfolio?" } });
    fireEvent.click(screen.getByText("Send"));

    expect(screen.getByText("How is my portfolio?")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Your portfolio looks great!")).toBeInTheDocument();
    });
  });

  it("calls onPortfolioChange when trades are executed", async () => {
    (api.sendChat as jest.Mock).mockResolvedValue({
      message: "Bought AAPL for you",
      trades_executed: [{ ticker: "AAPL", side: "buy", quantity: 10, price: 190, status: "filled" }],
      watchlist_changes_executed: [],
    });

    render(<ChatPanel {...defaultProps} />);
    const input = screen.getByPlaceholderText("Ask anything...");
    fireEvent.change(input, { target: { value: "Buy AAPL" } });
    fireEvent.click(screen.getByText("Send"));

    await waitFor(() => {
      expect(defaultProps.onPortfolioChange).toHaveBeenCalled();
    });
  });

  it("shows error message on API failure", async () => {
    (api.sendChat as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(<ChatPanel {...defaultProps} />);
    const input = screen.getByPlaceholderText("Ask anything...");
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.click(screen.getByText("Send"));

    await waitFor(() => {
      expect(screen.getByText("Sorry, I encountered an error. Please try again.")).toBeInTheDocument();
    });
  });
});
