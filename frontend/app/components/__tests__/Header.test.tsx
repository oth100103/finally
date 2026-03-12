import { render, screen } from "@testing-library/react";
import Header from "../Header";

describe("Header", () => {
  it("renders portfolio value and cash balance", () => {
    render(<Header totalValue={12345.67} cashBalance={5000} status="connected" />);
    expect(screen.getByText("FinAlly")).toBeInTheDocument();
    expect(screen.getByText("$12,345.67")).toBeInTheDocument();
    expect(screen.getByText("$5,000.00")).toBeInTheDocument();
  });

  it("shows connection status text", () => {
    render(<Header totalValue={10000} cashBalance={10000} status="disconnected" />);
    expect(screen.getByText("disconnected")).toBeInTheDocument();
  });

  it("shows reconnecting status", () => {
    render(<Header totalValue={10000} cashBalance={10000} status="reconnecting" />);
    expect(screen.getByText("reconnecting")).toBeInTheDocument();
  });
});
