import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TradeBar from "../TradeBar";
import { api } from "../../lib/api";

jest.mock("../../lib/api", () => ({
  api: {
    executeTrade: jest.fn(),
  },
}));

describe("TradeBar", () => {
  const onTrade = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders buy and sell buttons", () => {
    render(<TradeBar selectedTicker={null} onTrade={onTrade} />);
    expect(screen.getByText("BUY")).toBeInTheDocument();
    expect(screen.getByText("SELL")).toBeInTheDocument();
  });

  it("shows error for missing ticker/quantity", () => {
    render(<TradeBar selectedTicker={null} onTrade={onTrade} />);
    fireEvent.click(screen.getByText("BUY"));
    expect(screen.getByText("Enter valid ticker and quantity (min 0.01)")).toBeInTheDocument();
  });

  it("shows error for quantity below minimum", () => {
    render(<TradeBar selectedTicker="AAPL" onTrade={onTrade} />);
    const qtyInput = screen.getByPlaceholderText("Qty");
    fireEvent.change(qtyInput, { target: { value: "0.001" } });
    fireEvent.click(screen.getByText("BUY"));
    expect(screen.getByText("Enter valid ticker and quantity (min 0.01)")).toBeInTheDocument();
  });

  it("executes a buy trade successfully", async () => {
    (api.executeTrade as jest.Mock).mockResolvedValue({});
    render(<TradeBar selectedTicker="AAPL" onTrade={onTrade} />);

    const qtyInput = screen.getByPlaceholderText("Qty");
    fireEvent.change(qtyInput, { target: { value: "10" } });
    fireEvent.click(screen.getByText("BUY"));

    await waitFor(() => {
      expect(api.executeTrade).toHaveBeenCalledWith("AAPL", 10, "buy");
      expect(onTrade).toHaveBeenCalled();
    });
  });

  it("executes a sell trade successfully", async () => {
    (api.executeTrade as jest.Mock).mockResolvedValue({});
    render(<TradeBar selectedTicker="AAPL" onTrade={onTrade} />);

    const qtyInput = screen.getByPlaceholderText("Qty");
    fireEvent.change(qtyInput, { target: { value: "5" } });
    fireEvent.click(screen.getByText("SELL"));

    await waitFor(() => {
      expect(api.executeTrade).toHaveBeenCalledWith("AAPL", 5, "sell");
    });
  });

  it("shows error message on trade failure", async () => {
    (api.executeTrade as jest.Mock).mockRejectedValue(new Error("Insufficient cash"));
    render(<TradeBar selectedTicker="AAPL" onTrade={onTrade} />);

    const qtyInput = screen.getByPlaceholderText("Qty");
    fireEvent.change(qtyInput, { target: { value: "10" } });
    fireEvent.click(screen.getByText("BUY"));

    await waitFor(() => {
      expect(screen.getByText("Insufficient cash")).toBeInTheDocument();
    });
  });
});
