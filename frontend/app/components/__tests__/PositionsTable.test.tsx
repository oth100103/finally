import { render, screen } from "@testing-library/react";
import PositionsTable from "../PositionsTable";
import { Position } from "../../lib/types";

describe("PositionsTable", () => {
  it("shows empty state when no positions", () => {
    render(<PositionsTable positions={[]} />);
    expect(screen.getByText("No positions yet. Buy some shares!")).toBeInTheDocument();
  });

  it("renders position data", () => {
    const positions: Position[] = [
      {
        ticker: "AAPL",
        quantity: 10,
        avg_cost: 150,
        current_price: 160,
        unrealized_pnl: 100,
        pnl_percent: 6.67,
      },
    ];
    render(<PositionsTable positions={positions} />);
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("10.00")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
    expect(screen.getByText("$160.00")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("+6.67%")).toBeInTheDocument();
  });

  it("shows negative P&L correctly", () => {
    const positions: Position[] = [
      {
        ticker: "TSLA",
        quantity: 5,
        avg_cost: 200,
        current_price: 180,
        unrealized_pnl: -100,
        pnl_percent: -10,
      },
    ];
    render(<PositionsTable positions={positions} />);
    expect(screen.getByText("$-100.00")).toBeInTheDocument();
    expect(screen.getByText("-10.00%")).toBeInTheDocument();
  });
});
