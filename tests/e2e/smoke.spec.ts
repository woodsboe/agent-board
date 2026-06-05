import { expect, test } from "@playwright/test";

test("global dashboard renders portfolio metrics", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("button", { name: "AgentBoard Demo", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Connected Agents")).toBeVisible();
  await expect(page.getByText("Portfolio Status")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Project" }).first()).toBeVisible();
});

test("project expansion state persists across reload", async ({ page }) => {
  await page.goto("/dashboard");

  await page.getByRole("button", { name: "Expand AgentBoard Demo" }).click();
  await expect(page.getByRole("link", { name: "Tasks" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("link", { name: "Tasks" })).toBeVisible();
});

test("kanban board lists seeded tasks across lanes", async ({ page }) => {
  await page.goto("/tasks");

  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New Task" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Backlog Task task card" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Done Task task card" })).toBeVisible();
});

test("task drawer streams a live agent run to completion", async ({ page }) => {
  await page.goto("/tasks");

  await page.getByRole("button", { name: "Backlog Task task card" }).click();
  await expect(page.getByRole("heading", { name: "Backlog Task" })).toBeVisible();

  await page.getByRole("tab", { name: "Runs" }).click();
  await page.getByRole("button", { name: "Run Agent" }).click();

  // The mock runtime streams a fixed transcript; assert its final line arrives.
  await expect(page.getByText("Review required before applying.")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".detail-panel").getByText("Completed").first()).toBeVisible();
});

test("agent runs page shows run audit with output and token usage", async ({ page }) => {
  await page.goto("/agent-runs");

  await expect(page.getByRole("heading", { name: "Agent Runs" })).toBeVisible();
  const firstCard = page.locator('[data-testid="agent-run-card"]').first();
  await expect(firstCard).toBeVisible();
  await expect(firstCard.getByText("Output")).toBeVisible();
  await expect(firstCard.getByText(/total/)).toBeVisible();
});

test("git page surfaces repository status and identity", async ({ page }) => {
  await page.goto("/git");

  await expect(page.getByRole("heading", { name: "Git" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Repository" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Open Pull Requests" })).toBeVisible();
});

test("settings exposes agent profile and credential management", async ({ page }) => {
  await page.goto("/settings");

  await expect(page.getByRole("tab", { name: "Credentials" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Git Accounts" })).toBeVisible();

  await page.getByRole("tab", { name: "Agent Profiles" }).click();
  await expect(page.getByText("Claude Sonnet (API)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Profile" })).toBeVisible();
});
