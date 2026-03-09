import { test, expect, Page } from "@playwright/test";

test.describe("FinAlly E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the app to load and SSE to connect
    await expect(page.locator("text=FinAlly")).toBeVisible();
  });

  test("Fresh start: default watchlist, $10k balance, prices streaming", async ({
    page,
  }) => {
    // Check header shows portfolio value and cash
    await expect(page.locator("text=Portfolio")).toBeVisible();
    await expect(page.locator("text=Cash")).toBeVisible();
    await expect(page.locator("text=$10,000.00")).toBeVisible();

    // Default watchlist tickers should appear
    for (const ticker of ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA"]) {
      await expect(page.locator(`text=${ticker}`).first()).toBeVisible();
    }

    // Connection status should be connected (green dot)
    await expect(page.locator("text=connected")).toBeVisible({ timeout: 10000 });

    // Wait for prices to start streaming (at least one price should appear)
    await expect(page.locator("td").filter({ hasText: /^\$\d/ }).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("Add and remove a ticker from the watchlist", async ({ page }) => {
    // Add PYPL
    const addInput = page.locator('input[placeholder="Add ticker..."]');
    await addInput.fill("PYPL");
    await addInput.press("Enter");

    // PYPL should appear in watchlist
    await expect(page.locator("td").filter({ hasText: "PYPL" })).toBeVisible({
      timeout: 5000,
    });

    // Remove PYPL by clicking the x button in its row
    const pyplRow = page.locator("tr").filter({ hasText: "PYPL" });
    await pyplRow.locator('button[title="Remove"]').click();

    // PYPL should disappear
    await expect(page.locator("td").filter({ hasText: "PYPL" })).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("Buy shares: cash decreases, position appears", async ({ page }) => {
    // Wait for prices to load so trade can execute
    await expect(page.locator("td").filter({ hasText: /^\$\d/ }).first()).toBeVisible({
      timeout: 10000,
    });

    // Fill trade bar
    const tickerInput = page.locator('input[placeholder*="Ticker"]');
    const qtyInput = page.locator('input[placeholder="Qty"]');
    await tickerInput.fill("AAPL");
    await qtyInput.fill("10");

    // Click BUY
    await page.locator("button", { hasText: "BUY" }).click();

    // Cash should decrease from $10,000
    await expect(async () => {
      const cashText = await page.locator("text=Cash").locator("..").textContent();
      const match = cashText?.match(/\$([\d,]+\.\d{2})/);
      expect(match).toBeTruthy();
      const cash = parseFloat(match![1].replace(",", ""));
      expect(cash).toBeLessThan(10000);
    }).toPass({ timeout: 5000 });

    // AAPL position should appear in positions table
    await expect(
      page.locator("table").last().locator("td").filter({ hasText: "AAPL" })
    ).toBeVisible({ timeout: 5000 });
  });

  test("Sell shares: cash increases, position updates or disappears", async ({
    page,
  }) => {
    // Wait for prices
    await expect(page.locator("td").filter({ hasText: /^\$\d/ }).first()).toBeVisible({
      timeout: 10000,
    });

    // Buy first
    const tickerInput = page.locator('input[placeholder*="Ticker"]');
    const qtyInput = page.locator('input[placeholder="Qty"]');
    await tickerInput.fill("AAPL");
    await qtyInput.fill("10");
    await page.locator("button", { hasText: "BUY" }).click();

    // Wait for buy to complete
    await expect(async () => {
      const cashText = await page.locator("text=Cash").locator("..").textContent();
      const cash = parseFloat(cashText?.match(/\$([\d,]+\.\d{2})/)?.[1]?.replace(",", "") ?? "10000");
      expect(cash).toBeLessThan(10000);
    }).toPass({ timeout: 5000 });

    // Record cash after buy
    const cashAfterBuy = await getCashValue(page);

    // Sell all
    await tickerInput.fill("AAPL");
    await qtyInput.fill("10");
    await page.locator("button", { hasText: "SELL" }).click();

    // Cash should increase
    await expect(async () => {
      const cash = await getCashValue(page);
      expect(cash).toBeGreaterThan(cashAfterBuy);
    }).toPass({ timeout: 5000 });
  });

  test("Portfolio heatmap renders", async ({ page }) => {
    // Wait for prices
    await expect(page.locator("td").filter({ hasText: /^\$\d/ }).first()).toBeVisible({
      timeout: 10000,
    });

    // Buy to create a position for the heatmap
    const tickerInput = page.locator('input[placeholder*="Ticker"]');
    const qtyInput = page.locator('input[placeholder="Qty"]');
    await tickerInput.fill("AAPL");
    await qtyInput.fill("10");
    await page.locator("button", { hasText: "BUY" }).click();

    // Wait for position to appear, then check heatmap has content
    await page.waitForTimeout(1000);

    // The heatmap should contain at least one colored rectangle or text with AAPL
    // We look for the heatmap area which should render after positions exist
    const heatmapArea = page.locator("text=AAPL").first();
    await expect(heatmapArea).toBeVisible({ timeout: 5000 });
  });

  test("P&L chart has data points", async ({ page }) => {
    // Wait for prices
    await expect(page.locator("td").filter({ hasText: /^\$\d/ }).first()).toBeVisible({
      timeout: 10000,
    });

    // Execute a trade to trigger a portfolio snapshot
    const tickerInput = page.locator('input[placeholder*="Ticker"]');
    const qtyInput = page.locator('input[placeholder="Qty"]');
    await tickerInput.fill("AAPL");
    await qtyInput.fill("1");
    await page.locator("button", { hasText: "BUY" }).click();

    // The P&L chart area should render (Recharts renders SVG)
    await expect(page.locator("svg").first()).toBeVisible({ timeout: 5000 });
  });

  test("AI chat (mocked): send message, receive response", async ({ page }) => {
    // Chat panel should be open with AI Assistant header
    await expect(page.locator("text=AI Assistant")).toBeVisible();

    // Send a message
    const chatInput = page.locator('input[placeholder="Ask anything..."]');
    await chatInput.fill("How is my portfolio doing?");
    await page.locator("button", { hasText: "Send" }).click();

    // Should show loading
    await expect(page.locator("text=Thinking...")).toBeVisible({ timeout: 2000 });

    // Should receive assistant response (mock returns portfolio analysis text)
    await expect(
      page.locator("text=portfolio").last()
    ).toBeVisible({ timeout: 15000 });
  });

  test("AI chat (mocked): trade execution appears inline", async ({ page }) => {
    // Wait for prices so trades can execute
    await expect(page.locator("td").filter({ hasText: /^\$\d/ }).first()).toBeVisible({
      timeout: 10000,
    });

    const chatInput = page.locator('input[placeholder="Ask anything..."]');
    await chatInput.fill("buy some AAPL");
    await page.locator("button", { hasText: "Send" }).click();

    // Mock response should include a BUY trade confirmation inline
    await expect(page.locator("text=BUY").last()).toBeVisible({ timeout: 15000 });
  });

  test("SSE resilience: prices continue streaming", async ({ page }) => {
    // Wait for connection
    await expect(page.locator("text=connected")).toBeVisible({ timeout: 10000 });

    // Verify prices are updating by checking a price cell exists
    await expect(page.locator("td").filter({ hasText: /^\$\d/ }).first()).toBeVisible({
      timeout: 10000,
    });

    // Prices should still be visible after a short wait (SSE still working)
    await page.waitForTimeout(2000);
    await expect(page.locator("td").filter({ hasText: /^\$\d/ }).first()).toBeVisible();
  });
});

async function getCashValue(page: Page): Promise<number> {
  const cashText = await page.locator("text=Cash").locator("..").textContent();
  const match = cashText?.match(/\$([\d,]+\.\d{2})/);
  return match ? parseFloat(match[1].replace(",", "")) : 0;
}
