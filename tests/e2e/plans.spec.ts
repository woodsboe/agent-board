import { expect, test } from "@playwright/test";

// Exercises the full Option B flow end-to-end on the offline mock runtime:
// generate a structured plan with an agent → store it → approve → convert to tasks,
// then re-convert to prove idempotency (skip-only).
test("agent drafts a plan that is stored, approved, and converted into tasks", async ({ page }) => {
  const goal = "Add audit logging to the API";

  await page.goto("/plans");
  await expect(page.getByRole("heading", { name: "Plans", exact: true })).toBeVisible();

  // Compose: the agent picker defaults to the first profile (a mock-backed runtime offline).
  await page.getByRole("button", { name: "New plan with agent" }).click();
  await page.getByRole("textbox", { name: "Goal" }).fill(goal);
  await page.getByRole("button", { name: "Generate plan" }).click();

  // The structured proposal arrives; storing is enabled once it has tasks.
  const storeButton = page.getByRole("button", { name: "Store as plan" });
  await expect(storeButton).toBeEnabled({ timeout: 20_000 });
  await storeButton.click();

  // Scope to the specific stored plan card (order-independent across runs).
  const card = page.getByTestId("plan-card").filter({ hasText: goal });
  await expect(card.getByText("AI-drafted")).toBeVisible();

  // Convert is gated until the plan is approved.
  const createTasks = card.getByRole("button", { name: "Create tasks" });
  await expect(createTasks).toBeDisabled();

  await card.getByRole("button", { name: "Approve" }).click();
  await expect(createTasks).toBeEnabled();

  // First conversion creates tasks.
  await createTasks.click();
  await expect(card.getByText(/Created \d+ tasks?/)).toBeVisible();

  // Second conversion is idempotent — everything is skipped, nothing duplicated.
  await createTasks.click();
  await expect(card.getByText(/skipped \d+ already converted/)).toBeVisible();
});
