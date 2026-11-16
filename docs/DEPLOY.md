# Deploy em produção — passo a passo

Tempo estimado: 40–60 min. Todas as credenciais são coladas **somente** nos painéis (Vercel / GitHub) — nunca no código, nunca em chats.

> Dica: abra um bloco de notas **local** para guardar temporariamente os valores marcados com 📋 e apague-o ao final.

---

## Passo 1 — Banco de dados (Neon, gratuito)
1. Crie conta em **https://neon.tech** → *New Project*.
   - Postgres **16**, região **AWS São Paulo (sa-east-1)** se disponível (senão, a mais próxima).
2. Em *Dashboard → Connect*:
   - Com **Connection pooling ATIVADO**, copie a URL → 📋 `DATABASE_URL` e acrescente ao final `&pgbouncer=true&connection_limit=5`
     (se a URL não tiver `?`, use `?sslmode=require&pgbouncer=true&connection_limit=5`).
   - Com **Connection pooling DESATIVADO**, copie a URL → 📋 `DIRECT_URL`.

## Passo 2 — Segredos da aplicação
Gere dois valores aleatórios diferentes (qualquer um destes):
```bash
openssl rand -base64 48        # macOS/Linux
```
ou em https://1password.com/password-generator (64 caracteres, sem símbolos).
- 📋 `AUTH_SECRET` (mín. 32 caracteres)
- 📋 `CRON_SECRET`

## Passo 3 — Mercado Pago (comece com TESTE)
1. https://www.mercadopago.com.br/developers/panel/app → *Criar aplicação* → *Pagamentos online* → *Checkout Transparente*.
2. *Credenciais de teste*:
   - Access Token → 📋 `MERCADOPAGO_ACCESS_TOKEN` (começa com `TEST-`)
   - Public Key → 📋 `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`
3. O webhook é configurado no Passo 7 (precisa da URL final).

## Passo 4 — E-mail (Resend)
1. https://resend.com → *API Keys* → *Create* → 📋 `RESEND_API_KEY`.
2. *Domains* → adicione seu domínio e configure os registros DNS (SPF/DKIM). Enquanto não tiver domínio, use `onboarding@resend.dev` como remetente (só envia para o seu próprio e-mail).
3. 📋 `EMAIL_FROM` = `Nome da Loja <nao-responda@seudominio.com.br>`

## Passo 5 — Vercel
1. https://vercel.com → *Add New → Project* → importe `oculos-meta` do GitHub.
   - O branch padrão do repositório é usado como produção.
2. **Antes de clicar em Deploy**, abra *Environment Variables* e cadastre (ambiente **Production**):

| Nome | Valor |
|---|---|
| `DATABASE_URL` | 📋 do Passo 1 (pooled) |
| `DIRECT_URL` | 📋 do Passo 1 (direta) |
| `AUTH_SECRET` | 📋 do Passo 2 |
| `CRON_SECRET` | 📋 do Passo 2 |
| `APP_URL` | `https://NOME-DO-PROJETO.vercel.app` (ajuste no Passo 8 se usar domínio próprio) |
| `MERCADOPAGO_ACCESS_TOKEN` | 📋 do Passo 3 |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | 📋 do Passo 3 |
| `MERCADOPAGO_STATEMENT_DESCRIPTOR` | até 13 letras, ex.: `OCULOSMETA` |
| `RESEND_API_KEY` | 📋 do Passo 4 |
| `EMAIL_FROM` | 📋 do Passo 4 |

3. Clique em **Deploy**. As migrações do banco rodam automaticamente no build de produção.
4. Depois do primeiro deploy: *Storage → Create → Blob* → conecte ao projeto (cria `BLOB_READ_WRITE_TOKEN` sozinho) → *Deployments → ⋯ → Redeploy*.
5. Confira que `APP_URL` é exatamente a URL que abriu (sem barra no final). Se mudou, corrija e faça *Redeploy*.

## Passo 6 — Administrador (via GitHub, sem usar seu computador)
1. GitHub → repositório → *Settings → Secrets and variables → Actions → New repository secret*:
   - `PROD_DIRECT_URL` = 📋 `DIRECT_URL`
   - `ADMIN_PASSWORD` = uma senha forte (10+ caracteres, maiúsculas, minúsculas e números)
   - `APP_URL` = mesma URL da Vercel
   - `CRON_SECRET` = 📋 do Passo 2
2. *Actions → "Bootstrap de produção" → Run workflow* → informe e-mail e nome do admin.
3. Acesse `APP_URL/entrar` com esse e-mail e senha → você será levado ao `/admin`.

O workflow **"Cron — expirar pedidos"** passa a rodar a cada 10 min automaticamente (o plano Hobby da Vercel só permite cron diário, mantido como reserva).

## Passo 7 — Webhook do Mercado Pago
1. Painel da aplicação → *Webhooks → Configurar notificações* → **Modo de teste**:
   - URL: `APP_URL/api/webhooks/mercadopago`
   - Evento: **Pagamentos** → Salvar.
2. Copie a **Assinatura secreta** → Vercel: `MERCADOPAGO_WEBHOOK_SECRET` → *Redeploy*.
3. *Simular notificação* no painel deve responder **200** (se aparecer 404 "unknown", está correto: o ID simulado não existe na loja).

## Passo 8 — Configurar a loja (no /admin)
1. **Configurações**: nome, CNPJ, contatos, políticas (revisadas), prazo do PIX, parcelas, boleto.
2. **Frete**: cadastre suas faixas de CEP (ex.: `01000000`–`99999999` para Brasil todo) por serviço.
3. **Produtos**: cadastre com dados oficiais e imagens autorizadas; estoque inicial; publique.
4. Domínio próprio (opcional): Vercel → *Settings → Domains* → siga o DNS → atualize `APP_URL` na Vercel e no secret do GitHub, a URL do webhook no Mercado Pago → *Redeploy*.

## Passo 9 — Teste completo (modo teste do Mercado Pago)
- [ ] Criar conta de cliente, comprar, pagar com **cartão de teste** (nome do titular `APRO` aprova, `OTHE` recusa, `CONT` fica pendente) → pedido "Pagamento aprovado" + e-mail
- [ ] Novo pedido com **PIX** (no modo teste o PIX não é pago de verdade; valide geração do QR e copia e cola)
- [ ] No admin: rastreio, movimentação, entrega; **reembolso** de um pedido
- [ ] Pedido abandonado expira e libera o estoque (aguarde o prazo + execução do cron)

## Passo 10 — Virar a chave para produção
1. Mercado Pago → *Credenciais de produção* (ative a conta e cadastre uma **chave PIX**).
2. Vercel: troque `MERCADOPAGO_ACCESS_TOKEN` (`APP_USR-…`) e `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`.
3. Webhooks em **Modo produção** com a mesma URL → copie a nova assinatura secreta → `MERCADOPAGO_WEBHOOK_SECRET`.
4. *Redeploy* → faça uma compra real de valor baixo (PIX) e reembolse pelo painel.

---

## Operação contínua
- **Logs**: Vercel → *Logs* (JSON estruturado). Procure por `payment.amount_mismatch`, `payment.duplicate_approved`, `payment.approved_without_stock`, `webhook.mercadopago.invalid_signature`.
- **Backup**: Neon mantém histórico (PITR) conforme o plano; teste uma restauração em branch de banco.
- **Rollback**: Vercel → *Deployments* → versão anterior → *Instant Rollback*. Migrações são só aditivas por padrão; antes de uma migração destrutiva, crie um branch/snapshot do banco no Neon.
- **Previews**: deploys de Preview **não** rodam migrações. Se quiser previews funcionais, configure no ambiente *Preview* um banco separado (branch do Neon) e credenciais de **teste**.
