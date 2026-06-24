import { test, expect } from "@playwright/test";

test("login → import → reassign → recap", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "admin@local");
  await page.fill("#password", "changeme");
  await page.click('button[type="submit"]');
  await page.waitForURL("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto("/import");
  await page
    .locator("text=A. Dosen master")
    .locator("..")
    .locator('button:has-text("Use local data/ file")')
    .click();
  await expect(page.locator("text=Counts")).toBeVisible({ timeout: 30_000 });

  await page.goto("/plotting");
  const prodiSelect = page.locator("select").first();
  const options = await prodiSelect.locator("option").allTextContents();
  const ifOption = options.find((o) => o.startsWith("IF "));
  await prodiSelect.selectOption({ label: ifOption! });

  const firstChangeButton = page.locator('button:has-text("Change")').first();
  await firstChangeButton.click();
  const picker = page.locator("input[placeholder*='Search']");
  await expect(picker).toBeVisible();
  const firstDosenOption = page.locator("ul li button").first();
  const dosenLabel = await firstDosenOption.innerText();
  const dosenKode = dosenLabel.split(" — ")[0].trim();
  await firstDosenOption.click();

  await expect(page.locator(`text=${dosenKode} —`).first()).toBeVisible({ timeout: 10_000 });

  await page.goto("/recap");
  await expect(page.locator("text=Beban Dosen").first()).toBeVisible();
  await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });
});
