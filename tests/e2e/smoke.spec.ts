import { expect, test } from "@playwright/test";

test("seeded dashboard renders project metrics", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("button", { name: "AgentBoard Demo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Open Tasks")).toBeVisible();
  await expect(page.getByText("Running Tasks")).toBeVisible();
  await expect(page.getByText("Completed Tasks")).toBeVisible();
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
