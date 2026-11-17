import { expect, test } from "@playwright/test";

test("layout mobile: menu, sem rolagem horizontal", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  await page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Todos os modelos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Todos os modelos" })).toBeVisible();
});

test("página de produto no celular não rola para os lados", async ({ page }) => {
  await page.goto("/produtos/demo-ray-ban-meta-wayfarer");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
