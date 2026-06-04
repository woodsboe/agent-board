import { expect, test } from "@playwright/test";

test("global dashboard renders portfolio metrics", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("button", { name: "AgentBoard Demo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Connected Agents")).toBeVisible();
  await expect(page.getByText("Running Tasks")).toBeVisible();
  await expect(page.getByText("Portfolio Status")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Project" })).toBeVisible();
});

test("project expansion state persists across reload", async ({ page }) => {
  await page.goto("/dashboard");

  const expandButton = page.getByRole("button", { name: "Expand AgentBoard Demo" });
  await expandButton.click();

  await expect(page.getByRole("link", { name: "Tasks" })).toBeVisible();

  await page.reload();

  await expect(page.getByRole("link", { name: "Tasks" })).toBeVisible();
  await expect(page.getByText("Running Tasks")).toBeVisible();
});

test("task move mode can be activated and cancelled from the board", async ({ page }) => {
  await page.goto("/tasks");

  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();

  await page.getByRole("button", { name: "Pick Up" }).first().click();

  await expect(page.getByText(/Move Mode:/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel Move Mode" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Drop Here" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Cancel Move Mode" }).click();

  await expect(page.getByText(/Move Mode:/)).not.toBeVisible();
});

test("task detail drawer shows context preview and run summary", async ({ page }) => {
  await page.goto("/tasks");

  await page.getByRole("group", { name: "Running Task task card" }).getByRole("button", { name: "Detail" }).click();

  const detailPanel = page.locator(".detail-panel");
  await expect(detailPanel.getByText("Running Task")).toBeVisible();
  await expect(detailPanel.getByRole("heading", { name: "Run Summary" })).toBeVisible();
  await expect(detailPanel.getByText("Total Runs:")).toBeVisible();
  await expect(detailPanel.getByRole("heading", { name: "Context Preview" })).toBeVisible();
  await expect(detailPanel.getByText("architecture.md")).toBeVisible();
  await expect(detailPanel.getByRole("heading", { name: "Recent Agent Runs" })).toBeVisible();
});

test("task detail context preview renders seeded context pack details", async ({ page }) => {
  await page.goto("/tasks");

  await page.getByRole("group", { name: "Backlog Task task card" }).getByRole("button", { name: "Detail" }).click();

  const detailPanel = page.locator(".detail-panel");
  await expect(detailPanel.getByRole("heading", { name: "Context Preview" })).toBeVisible();
  await expect(detailPanel.getByText("Context Pack: Zustand Migration Pack")).toBeVisible();
  await expect(detailPanel.getByText("Included Context Items: 3")).toBeVisible();
  await expect(detailPanel.getByText("Total Tokens: 540")).toBeVisible();
  await expect(detailPanel.getByText("Budget Remaining: 60")).toBeVisible();
  await expect(detailPanel.getByText("architecture.md")).toBeVisible();
  await expect(detailPanel.getByText("zustand-guidelines.md")).toBeVisible();
  await expect(detailPanel.getByText("checkout-api.md")).toBeVisible();
  await expect(detailPanel.getByText("Platform architecture overview.")).toBeVisible();
  await expect(detailPanel.getByText("Migration notes for state management.")).toBeVisible();
  await expect(detailPanel.getByText("Checkout API contracts and latency budget.")).toBeVisible();
});

test("card quick-edit status persists across reload", async ({ page }) => {
  await page.goto("/tasks");

  const backlogTaskCard = page.getByRole("group", { name: "Backlog Task task card" });
  await expect(backlogTaskCard).toBeVisible();

  const waitForTaskPatch = () =>
    page.waitForResponse((response) => response.url().includes("/tasks/") && response.request().method() === "PATCH" && response.ok());

  await backlogTaskCard.getByRole("button", { name: "Detail" }).click();

  const detailPanel = page.locator(".detail-panel");
  await Promise.all([waitForTaskPatch(), detailPanel.getByRole("button", { name: "Move Right" }).click()]);
  await expect(detailPanel.getByText("Status: Ready")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();

  await page.getByRole("group", { name: "Backlog Task task card" }).getByRole("button", { name: "Detail" }).click();
  await expect(detailPanel.getByText("Status: Ready")).toBeVisible();

  await Promise.all([waitForTaskPatch(), detailPanel.getByRole("button", { name: "Move Left" }).click()]);
  await expect(detailPanel.getByText("Status: Backlog")).toBeVisible();
});

test("seeded agent runs show audit details and context diff", async ({ page }) => {
  await page.goto("/agent-runs");

  await expect(page.getByRole("heading", { name: "Agent Runs" })).toBeVisible();

  const reviewRunCard = page.locator('[data-testid="agent-run-card"]').first();
  await expect(reviewRunCard.getByText(/^Prompt$/)).toBeVisible();
  await expect(reviewRunCard.getByText("Agent Profile: Frontend Engineer")).toBeVisible();
  await expect(reviewRunCard.getByText("Task: Review Task")).toBeVisible();
  await expect(reviewRunCard.getByText(/^Output$/)).toBeVisible();
  await expect(reviewRunCard.getByText("Mock execution completed successfully.")).toBeVisible();
  await expect(reviewRunCard.getByText(/^Usage$/)).toBeVisible();
  await expect(reviewRunCard.getByText("620 prompt / 230 completion / 850 total / $0.0021")).toBeVisible();
  await expect(reviewRunCard.getByText(/^Timing$/)).toBeVisible();
  await expect(reviewRunCard.getByText(/^Context Items$/)).toBeVisible();
  await expect(reviewRunCard.getByText("architecture.md, checkout-api.md")).toBeVisible();
  await expect(reviewRunCard.getByText(/^Context Diff$/)).toBeVisible();
  await expect(reviewRunCard.getByText("Added: checkout-api.md")).toBeVisible();
  await expect(reviewRunCard.getByText("Removed: zustand-guidelines.md")).toBeVisible();
  await expect(reviewRunCard.getByText("Modified: None")).toBeVisible();

  const runningRunCard = page.locator('[data-testid="agent-run-card"]').nth(1);
  await expect(runningRunCard.getByText("Agent Profile: Backend Engineer")).toBeVisible();
  await expect(runningRunCard.getByText("Task: Running Task")).toBeVisible();
  await expect(runningRunCard.getByText("540 prompt / 210 completion / 750 total / $0.0019")).toBeVisible();
  await expect(runningRunCard.getByText("architecture.md, zustand-guidelines.md")).toBeVisible();
});
