# Óculos Meta Store

E-commerce completo de óculos inteligentes (Ray-Ban Meta e outros modelos): loja, carrinho, checkout, **pagamentos reais via Mercado Pago (PIX, cartão e boleto)**, área do cliente, painel administrativo, controle de estoque, LGPD e segurança alinhada à OWASP.

## Stack

| Camada | Tecnologia |
|---|---|
| App | Next.js 16 (App Router) · React 19 · TypeScript estrito |
| UI | Tailwind CSS 4 · lucide-react · React Hook Form + Zod |
| Dados | PostgreSQL 16 · Prisma 6 (migrações versionadas + CHECK constraints) |
| Autenticação | Sessões opacas no banco (cookie HttpOnly/Secure/SameSite) · Argon2id · RBAC |
| Pagamentos | Mercado Pago (API de Pagamentos + Card Payment Brick + Webhooks assinados) |
| Frete | Melhor Envio (cotação real + rastreio automático, OAuth2) com tabela por CEP como reserva |
| Infra | Vercel (app + cron) · Vercel Blob (imagens) · Resend (e-mail) · Sentry (erros) |
| Testes | Vitest (unitários + integração com Postgres real) · Playwright (E2E) |

## Início rápido (desenvolvimento)

```bash
docker compose up -d                 # PostgreSQL local (dev + banco de testes)
cp .env.example .env                 # preencha AUTH_SECRET e CRON_SECRET (instruções no arquivo)
npm install
npx prisma migrate dev               # aplica as migrações
SEED_DEMO=true npm run db:seed       # categorias + produtos [DEMO] para testar
ADMIN_EMAIL=voce@exemplo.com ADMIN_NAME="Seu Nome" ADMIN_PASSWORD='SenhaForte123' npm run admin:create
npm run dev                          # http://localhost:3000  ·  painel: /admin
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | Desenvolvimento / build de produção / servidor de produção |
| `npm run lint` · `typecheck` | ESLint · TypeScript |
| `npm run test:unit` | Regras puras (preços, cupons, estados, validação, RBAC, assinatura de webhook) |
| `npm run test:integration` | Fluxos com PostgreSQL real (auth, pedidos, concorrência de estoque, pagamentos, webhooks, segurança das rotas) |
| `npm run test:e2e` | Navegador real contra o build de produção (requer `npm run build` e seed de demonstração) |
| `npm run db:migrate` · `db:deploy` · `db:seed` | Migrações (dev) · migrações (produção) · seed |
| `npm run admin:create` | Cria/promove o administrador inicial |

## Automação (GitHub Actions)

| Workflow | Quando | O que faz |
|---|---|---|
| CI | todo push/PR | audit, lint, tipos, testes (Postgres real), build |
| Cron — expirar pedidos | a cada 10 min | chama `/api/cron/expire-orders` (requer secrets `APP_URL`, `CRON_SECRET`) |
| Bootstrap de produção | manual | migrações + dados base + administrador (secrets `PROD_DIRECT_URL`, `ADMIN_PASSWORD`) |

## Documentação

- [Instalação e arquitetura](docs/INSTALACAO.md)
- [Pagamentos (Mercado Pago)](docs/PAGAMENTOS.md)
- [Deploy em produção](docs/DEPLOY.md)
- [Painel administrativo](docs/ADMIN.md)
- [Segurança e LGPD](docs/SEGURANCA.md)

## Estrutura

```
prisma/              schema, migrações (com CHECK constraints) e seed
src/app/(store)      loja pública + área do cliente (/conta) + checkout
src/app/(auth)       login, cadastro, recuperação de senha
src/app/admin        painel administrativo (RBAC por página)
src/app/api          rotas REST (todas via apiHandler: CSRF, erros, no-store)
src/lib              infraestrutura: env, db, auth, segurança, validação (Zod), http
src/server/services  regras de negócio (pedidos, estoque, cupons, frete, LGPD…)
src/server/payments  gateway de pagamentos (interface + Mercado Pago) e serviço financeiro
src/components       UI (ui, layout, store, checkout, account, admin)
tests/               unit · integration · e2e
```

> **Imagens e marcas:** o projeto não inclui fotos de produtos. Use apenas imagens próprias, oficiais autorizadas ou licenciadas (upload pelo painel). Ray-Ban® e Meta® são marcas de seus titulares.
