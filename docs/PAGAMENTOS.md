# Pagamentos — Mercado Pago

## Por que Mercado Pago
PIX nativo com QR Code e copia-e-cola via API, cartão com parcelamento, antifraude incluso, ampla aceitação no Brasil e SDK oficial Node mantido (`mercadopago` v3).

## Configuração (passo a passo)
1. Crie uma aplicação em **https://www.mercadopago.com.br/developers/panel/app** (produto: *Checkout Transparente / Pagamentos online*).
2. Em **Credenciais de teste**, copie *Access Token* (`TEST-…`) e *Public Key* para:
   - `MERCADOPAGO_ACCESS_TOKEN` (somente servidor)
   - `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`
3. Em **Webhooks → Configurar notificações**:
   - URL: `https://SEU-DOMINIO/api/webhooks/mercadopago`
   - Evento: **Pagamentos**
   - Copie a **assinatura secreta** para `MERCADOPAGO_WEBHOOK_SECRET`.
4. Para PIX em produção, a conta precisa ter **chave PIX cadastrada** no Mercado Pago.
5. Teste com [usuários e cartões de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-test/test-cards). Depois troque para as credenciais de produção (`APP_USR-…`).

> Webhooks exigem URL pública **https**. Localmente, a página de pagamento consulta o status no Mercado Pago a cada 5 s (polling autenticado), então o fluxo funciona sem webhook; para testar webhooks localmente use um túnel (ex.: ngrok) e ajuste `APP_URL`.

## Fluxo
1. **Checkout** (`POST /api/checkout`): servidor recalcula preços, frete e cupom, reserva estoque e cria o pedido `PENDING_PAYMENT` com prazo (`pixExpirationMinutes`, padrão 30 min).
2. **PIX** (`POST /api/orders/:id/payments {method:"pix"}`): cria o pagamento com o valor **do banco**, `X-Idempotency-Key`, `external_reference` = ID local e expiração; devolve QR Code e copia-e-cola. PIX pendente válido é reaproveitado.
3. **Cartão**: o Card Payment Brick tokeniza o cartão no navegador (dados do cartão nunca chegam ao servidor). O servidor cria o pagamento com o token; `attemptId` (UUID) é a chave de idempotência — duplo clique não cobra duas vezes.
4. **Confirmação**: webhook assinado ou polling → o servidor **consulta `GET /v1/payments/:id`** e só então aplica o status. Confere valor e moeda contra o pedido; divergência gera alerta e não confirma.
5. **Aprovado**: em uma transação, reserva vira baixa de estoque, pedido → `PAID`, histórico + evento financeiro; e-mail de confirmação é enviado depois.
6. **Expiração**: o cron (`/api/cron/expire-orders`, a cada 10 min via GitHub Actions — veja `docs/DEPLOY.md`) concilia pagamentos pendentes com o provedor e expira os vencidos, liberando estoque e cupom.

## Boleto
- Habilite em **Admin → Configurações** (desligado por padrão) e defina o vencimento (1–5 dias).
- Emitido pela API de Pagamentos (`payment_method_id: bolbradesco`) com CPF e endereço do pedido; o cliente recebe linha digitável e link do PDF.
- **Reserva de estoque** estendida até o vencimento + 3 dias (prazo de compensação bancária) — só depois que o provedor confirma a emissão.
- Confirmação pelo mesmo fluxo (webhook/conciliação). Boleto pago após o prazo segue a regra de "pago após expiração".

## Proteção contra cobrança em duplicidade
O cliente pode alternar entre PIX, cartão e boleto no mesmo pedido. Quando um pagamento é aprovado, os demais pendentes são **cancelados no Mercado Pago**. Se mesmo assim um segundo for aprovado (ex.: boleto já pago no banco), o estoque **não** é baixado de novo, o histórico do pedido recebe um aviso e o **dashboard mostra o alerta "pagamento em duplicidade — reembolsar o excedente"**.

## Casos especiais tratados
| Situação | Comportamento |
|---|---|
| Webhook repetido / concorrente | Deduplicação por chave única + lock da linha do pagamento + transições idempotentes |
| Notificação antiga após aprovação | Status nunca regride (`APPROVED` só vai para `REFUNDED`/`CHARGED_BACK`) |
| Corpo do webhook forjado | Ignorado: o status vem sempre da API |
| Assinatura inválida / segredo ausente | 401 / 503 (fail-closed) |
| Pago após expirar, com estoque | Pedido confirmado (baixa direta, tudo-ou-nada) |
| Pago após expirar, sem estoque | Pagamento registrado, pedido não confirmado, alerta no dashboard → reembolsar |
| Cartão em análise | Pedido não expira enquanto o pagamento estiver `in_process` |

## Reembolsos
Painel → Pedido → Pagamentos → **Reembolsar** (somente papel ADMIN). Total ou parcial, via API oficial com idempotência. Reembolso total antes do envio devolve o estoque automaticamente; após o envio, a devolução física deve ser tratada manualmente.

## Histórico financeiro
Tabelas `Payment`, `PaymentEvent` (cada notificação/consulta, sem dados sensíveis) e `Refund`. Painel → **Financeiro** mostra valores brutos (antes das tarifas do Mercado Pago).
