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
