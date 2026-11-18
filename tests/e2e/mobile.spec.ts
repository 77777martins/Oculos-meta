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

test("página de produto no celular não passa da largura da tela", async ({ page }) => {
  await page.goto("/produtos/demo-ray-ban-meta-wayfarer");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Nenhum bloco do conteúdo principal pode ser mais largo que a tela (rolagem lateral ou corte).
  const wider = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll("main *")].filter((e) => e.getBoundingClientRect().right > w + 1 && !e.closest("[class*=overflow-x-auto]")).length;
  });
  expect(wider).toBe(0);
});
