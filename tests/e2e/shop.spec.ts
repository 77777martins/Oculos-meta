import { expect, test, type Page } from "@playwright/test";

/** Falha o teste se houver violação de CSP ou erro de JavaScript na página. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy|Refused to/i.test(m.text())) errors.push(m.text());
  });
  return errors;
}

test("vitrine → produto → carrinho com valores calculados no servidor", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: /Wayfarer — ver detalhes/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: /Wayfarer/ })).toBeVisible();
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.getByText("Adicionado ao carrinho")).toBeVisible();

  await page.goto("/carrinho");
  await expect(page.getByRole("heading", { name: "Resumo do pedido" })).toBeVisible();
  await page.getByLabel("Calcular frete").fill("01310-100");
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.getByText(/PAC · 5–12 dias úteis/)).toBeVisible();

  await page.getByLabel("Cupom de desconto").fill("DEMO10");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("Cupom DEMO10 aplicado!")).toBeVisible();
  expect(errors).toEqual([]);
});

test("cadastro → checkout → pedido criado com estoque reservado → página de pagamento", async ({ page }) => {
  const errors = watchErrors(page);
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto("/cadastro");
  await page.getByLabel("Nome completo").fill("Cliente E2E");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("SenhaForte123");
  await page.getByLabel(/Li e aceito/).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/conta$/);

  await page.goto("/produtos/demo-ray-ban-meta-skyler");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await page.goto("/checkout");
  await page.getByLabel("CPF").fill("529.982.247-25");
  await page.getByLabel("Celular (com DDD)").fill("11999999999");
  await page.getByLabel("CEP").fill("01310100");
  await page.getByLabel("CEP").blur();
  await page.getByLabel("Rua").fill("Av. Paulista");
  await page.getByLabel("Número").fill("1000");
  await page.getByLabel("Bairro").fill("Bela Vista");
  await page.getByLabel("Cidade").fill("São Paulo");
  await page.getByLabel("UF").selectOption("SP");
  await expect(page.getByText("Correios — PAC")).toBeVisible();
  await page.getByRole("button", { name: "Ir para o pagamento" }).click();

  await expect(page).toHaveURL(/\/checkout\/pagamento\//);
  await expect(page.getByRole("heading", { name: "Pagamento" })).toBeVisible();
  await expect(page.getByText(/Reserva do estoque expira em/)).toBeVisible();
  await expect(page.getByRole("tab", { name: /PIX/ })).toBeVisible();

  // Pedido aparece no histórico como aguardando pagamento.
  await page.goto("/conta/pedidos");
  await expect(page.getByText("Aguardando pagamento").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("cliente não acessa o painel administrativo", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByLabel("Nome completo").fill("Curioso");
  await page.getByLabel("E-mail", { exact: true }).fill(`curioso-${Date.now()}@example.com`);
  await page.getByLabel("Senha", { exact: true }).fill("SenhaForte123");
  await page.getByLabel(/Li e aceito/).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/conta$/);
  await page.goto("/admin");
  await expect(page).toHaveURL("http://localhost:3000/");
});

test("administrador acessa dashboard, pedidos e produtos", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/entrar?next=/admin");
  await page.getByLabel("E-mail", { exact: true }).fill(process.env.E2E_ADMIN_EMAIL ?? "admin@localhost.dev");
  await page.getByLabel("Senha", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD ?? "AdminDev2026!x");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Faturamento diário")).toBeVisible();
  await page.getByRole("link", { name: "Pedidos" }).first().click();
  await expect(page.getByRole("heading", { name: "Pedidos" })).toBeVisible();
  await page.getByRole("link", { name: "Produtos e estoque" }).click();
  await expect(page.getByRole("heading", { name: "Produtos e estoque" })).toBeVisible();
  expect(errors).toEqual([]);
  await page.goto("/admin/avaliacoes");
  await expect(page.getByRole("heading", { name: "Avaliações de clientes" })).toBeVisible();
  await page.goto("/admin/lancamento");
  await expect(page.getByRole("heading", { name: "Pronto para vender" })).toBeVisible();
  await expect(page.getByRole("progressbar")).toBeVisible();
});
