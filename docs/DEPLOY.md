# Deploy em produção (Vercel + PostgreSQL gerenciado)

## 1. Banco de dados
Use PostgreSQL gerenciado com backups automáticos e PITR — ex.: **Neon**, **Supabase**, **Vercel Postgres** ou **AWS RDS** — em região próxima a São Paulo.
- `DATABASE_URL`: URL com **pooling** (PgBouncer) — adicione `?pgbouncer=true&connection_limit=1` se o provedor exigir.
- `DIRECT_URL`: URL **direta** (usada pelas migrações).

## 2. Vercel
1. Importe o repositório na Vercel (framework detectado: Next.js).
2. Configure **todas** as variáveis de `.env.example` em *Settings → Environment Variables* (Production e Preview separados; Preview deve usar credenciais **de teste** do Mercado Pago e outro banco).
3. Crie um **Blob Store** (Storage → Blob) e vincule ao projeto (gera `BLOB_READ_WRITE_TOKEN`).
4. Domínio: *Settings → Domains* → adicione seu domínio; HTTPS é automático. Atualize `APP_URL` e a URL do webhook no Mercado Pago.
5. O `vercel.json` já define: região `gru1` (São Paulo), `prisma migrate deploy` antes do build e o **cron** a cada 10 min.
   - O plano **Hobby** só permite cron diário. No Hobby, use um agendador externo chamando `GET /api/cron/expire-orders` com `Authorization: Bearer <CRON_SECRET>` (a expiração também ocorre sob demanda quando o cliente abre o pedido).
6. Após o primeiro deploy: rode `npm run admin:create` localmente apontando `DATABASE_URL` para produção (ou via job seguro) e `npm run db:seed` (sem `SEED_DEMO`).

## 3. E-mail
Crie conta na **Resend**, verifique o domínio (SPF/DKIM) e configure `RESEND_API_KEY` e `EMAIL_FROM`.

## 4. Logs e monitoramento
- Logs estruturados em JSON (uma linha por evento) com redação automática de dados sensíveis → visíveis em *Vercel → Logs*; envie para Datadog/Better Stack via Log Drains.
- Recomendado: Sentry (erros), monitor de uptime em `/` e alerta para mensagens `payment.amount_mismatch`, `payment.approved_without_stock`, `webhook.mercadopago.invalid_signature`.

## 5. Backup e rollback
- **Banco:** backups diários + PITR do provedor. Teste a restauração periodicamente.
- **Aplicação:** *Vercel → Deployments → Promote/Instant Rollback* para voltar a versão anterior em segundos.
- **Migrações:** são aplicadas para frente. Antes de migrações destrutivas, faça snapshot do banco; prefira migrações compatíveis em duas etapas (adicionar coluna → deploy → remover a antiga em outro deploy) para permitir rollback do código sem rollback do banco.

## 6. Checklist de go-live
- [ ] Credenciais de **produção** do Mercado Pago, chave PIX ativa, webhook apontando para o domínio final
- [ ] Pagamento real de valor baixo (PIX e cartão) + reembolso testados
- [ ] `CRON_SECRET`, `AUTH_SECRET` fortes e exclusivos de produção
- [ ] Textos legais revisados (Configurações) e CNPJ/razão social preenchidos
- [ ] Tabela de frete real cadastrada; produtos com dados e imagens autorizadas
- [ ] Nenhum dado `[DEMO]` no banco de produção
- [ ] Backups e alertas configurados
