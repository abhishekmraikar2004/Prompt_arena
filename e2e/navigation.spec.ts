import { expect, test } from "@playwright/test";

test("landing page explains the challenge and links to play", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /see it/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /play a round/i }),
  ).toHaveAttribute("href", "/play");
  await expect(page.getByText(/sixty seconds/i)).toBeVisible();
});

test("how-to-play route explains timing and voice fallback", async ({
  page,
}) => {
  await page.goto("/how-to-play");
  await expect(
    page.getByRole("heading", { name: /one minute/i }),
  ).toBeVisible();
  await expect(page.getByText(/type/i).first()).toBeVisible();
});
