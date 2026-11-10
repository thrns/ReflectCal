import { expect, test } from "@playwright/test";

test("home page explains the paired experiment", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Can AI recognize when it is wrong?" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Try the live experiment/ })).toBeVisible();
});

test("methodology documents the protocol", async ({ page }) => {
  await page.goto("/methodology");
  await expect(page.getByRole("heading", { name: "How the experiment works" })).toBeVisible();
  await expect(page.getByText("reflectcal-m0-paired-v1.0.0")).toBeVisible();
});

test("playground stays clear when live credentials are missing", async ({ page }) => {
  await page.goto("/experiment");
  await expect(page.getByRole("heading", { name: "Run a two-pass experiment" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Start two-pass experiment/ })).toBeVisible();
  await page.getByRole("button", { name: /Start two-pass experiment/ }).click();
  await expect(page.getByRole("alert")).toContainText("Live experiments are not configured on this server.");
});
