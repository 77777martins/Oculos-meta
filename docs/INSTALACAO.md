# Instalação e arquitetura

## Requisitos
- Node.js 20.9+ (recomendado 22)
- PostgreSQL 16 (via `docker compose up -d` ou instalado localmente)

## Variáveis de ambiente
Todas estão documentadas em [`.env.example`](../.env.example). Regras:
- **Nunca** commite `.env` (já está no `.gitignore`).
- Somente `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` vai ao navegador — ela é pública por design (só tokeniza cartões).
- `src/lib/env.ts` valida tudo na inicialização e importa `server-only`: segredos não podem vazar para Client Components.

| Variável | Obrigatória em produção | Uso |
|---|---|---|
| `APP_URL` | sim | URL canônica (SEO, e-mails, webhook, CSRF) |
| `DATABASE_URL` / `DIRECT_URL` | sim | Conexão pooled / direta (migrações) |
| `AUTH_SECRET` | sim | HMAC de IPs (pseudonimização) |
| `CRON_SECRET` | sim | Autentica o cron de expiração |
| `MERCADOPAGO_ACCESS_TOKEN` | sim | API do Mercado Pago (servidor) |
| `MERCADOPAGO_WEBHOOK_SECRET` | sim | Validação da assinatura dos webhooks |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | sim (cartão) | Card Payment Brick |
| `RESEND_API_KEY` / `EMAIL_FROM` | sim | E-mails transacionais |
| `BLOB_READ_WRITE_TOKEN` | sim | Upload de imagens (Vercel Blob) |

Sem as chaves externas em **desenvolvimento**: e-mails aparecem no console (marcados `[DEV]`), uploads vão para `public/uploads` e o pagamento exibe "não configurado". Nada é simulado como sucesso.

## Arquitetura (decisões principais)

- **Monólito Next.js** (sem pastas frontend/backend separadas). Páginas são Server Components que leem o banco via serviços; mutações usam Route Handlers REST (`src/app/api`).
- **Camadas:** `app/api` (HTTP: validação, auth, rate limit) → `server/services` (regras de negócio, transações) → Prisma. Regras puras (`pricing.ts`, `order-state.ts`) não acessam banco e têm testes unitários.
- **Dinheiro em centavos inteiros** em todo o sistema; o banco tem CHECK de consistência (`total = subtotal − desconto + frete`).
- **Estoque:** `stock` (físico) e `reserved` (pedidos aguardando pagamento). Reserva/baixa com `UPDATE … WHERE stock - reserved >= qtd` (atômico, sem overselling — testado com checkouts concorrentes). Toda alteração gera `InventoryMovement` (livro-razão).
- **Pedido:** máquina de estados central (`order-state.ts`). Pagamento só é confirmado pelo serviço de pagamentos após consulta à API do provedor.
- **Autenticação própria** com sessões no banco (revogáveis) em vez de JWT: permite logout real, revogação ao trocar senha/papel e sessões mais curtas para a equipe (12h).
- **Rate limit no PostgreSQL** (janela fixa, atômico): funciona em múltiplas instâncias serverless sem Redis. Trade-off: uma escrita por requisição limitada; para tráfego muito alto, troque por Redis/Upstash mantendo a mesma interface (`consumeRateLimit`).
- **CSP com nonce por requisição** (`src/proxy.ts`) → todas as páginas são renderizadas dinamicamente (trade-off aceito em troca de proteção forte contra XSS).

## Migrações
- Desenvolvimento: altere `prisma/schema.prisma` e rode `npx prisma migrate dev --name descricao`.
- A migração inicial contém CHECK constraints e índices SQL (busca em português, endereço padrão único). **Revise o SQL gerado** em migrações futuras.
- Produção: `npx prisma migrate deploy` (executado no build da Vercel, ver `vercel.json`).
