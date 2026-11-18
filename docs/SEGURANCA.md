# Segurança e LGPD

## Controles implementados (OWASP)
| Risco | Controle |
|---|---|
| SQL/NoSQL Injection | Prisma com queries parametrizadas; SQL bruto apenas com template tags (parametrizado) |
| XSS | React escapa saída; nenhum HTML de usuário renderizado; políticas em formato texto seguro; JSON-LD com escape de `<`; **CSP com nonce + strict-dynamic**; SVG proibido em uploads |
| CSRF | Cookies `SameSite=Lax` + verificação de `Origin`/`Referer` em toda mutação (`apiHandler`) |
| Clickjacking | `X-Frame-Options: DENY` + `frame-ancestors 'none'` |
| SSRF | Única chamada externa com entrada do usuário (ViaCEP) usa host fixo e apenas dígitos |
| Path traversal / upload | Nome de arquivo gerado pelo servidor; tipo validado por *magic bytes*; limite 5 MB |
| Broken auth | Argon2id (OWASP), sessões opacas com hash no banco, cookie `__Host-`, HttpOnly, Secure; bloqueio após 5 falhas; mensagens genéricas; proteção contra timing |
| Brute force / abuso | Rate limit por IP/usuário em login, cadastro, recuperação, checkout, pagamentos, cupons, contato, painel |
| IDOR | Toda consulta de cliente filtra por `userId`; recurso alheio retorna 404 |
| Mass assignment | Schemas Zod `strictObject` (campos extras → 422) e mapeamento explícito de campos |
| Controle de acesso | RBAC no servidor por rota e por página; UI apenas reflete permissões |
| Escalonamento de privilégio | Ninguém altera o próprio papel; sempre ≥ 1 admin; sessões revogadas ao mudar papel |
| Fraude de pagamento | Valores só do banco; confirmação só via API do provedor; assinatura HMAC no webhook; idempotência; conferência de valor/moeda |
| Exposição de dados | Seleções explícitas (nunca `passwordHash`); CPF mascarado ao cliente; logs com redação automática; erros sem stack trace |
| Open redirect | `safeRedirectPath` aceita apenas caminhos internos |
| Segredos | Somente em variáveis de ambiente do servidor (`server-only`); `.env` ignorado no Git |
| Integrações OAuth | Melhor Envio via OAuth2 oficial com `state` aleatório em cookie HttpOnly vinculado ao administrador; tokens **criptografados no banco** (AES-256-GCM, chave derivada por HKDF); escopos mínimos; renovação automática |
| Dados de terceiros | Respostas do Mercado Pago e do Melhor Envio validadas com Zod antes do uso; links externos aceitos apenas em https |
| Monitoramento | Sentry com coleta mínima (sem IP/usuário, cookies, cabeçalhos, corpos, query string, dados de banco e variáveis de stack) + `beforeSend` que remove resquícios; CSP libera apenas o host exato do DSN |
| Dependências | `npm audit --omit=dev` sem vulnerabilidades; `overrides` para transitivas; auditoria na CI |

## LGPD
- **Minimização:** cadastro pede apenas nome, e-mail e senha; CPF/telefone apenas no checkout.
- **Consentimentos registrados** (termos, privacidade, marketing, cookies) com versão, data e IP pseudonimizado.
- **Direitos do titular** em *Minha conta → Privacidade*: exportação JSON (acesso/portabilidade) e exclusão (anonimização com retenção fiscal dos pedidos).
- **IPs** armazenados apenas como HMAC.
- **Retenção automática** (`src/server/services/retention.ts`, executada pelo cron): tokens de senha usados/expirados → 7 dias; mensagens de contato → 24 meses; auditoria → 5 anos; pedidos **nunca pagos** → dados pessoais anonimizados após 180 dias. Pedidos pagos e pagamentos são mantidos (obrigação fiscal).
- **Cookies:** apenas essenciais por padrão; banner de consentimento.
- **Políticas:** modelos iniciais identificados como tal — **revise com assessoria jurídica** antes de operar.

## Riscos residuais / responsabilidades da operação
- Revisão jurídica dos textos legais e definição de DPO.
- Emissão de nota fiscal não está integrada: a loja opera sem CNPJ (decisão do responsável). Envios comerciais exigem NF (ver `docs/DEPLOY.md`, Passo 8.1) — consultar contador.
- Rate limit "fail-open" se o banco estiver indisponível (a loja também estaria).

## Auditoria de dependências
O CI roda `npm run audit:check` (`scripts/audit-check.mjs`): falha com qualquer alerta **alto ou crítico**
nas dependências de produção, exceto os listados em `audit-exceptions.json`. Cada exceção precisa de
justificativa, de quem aprovou e de **data de validade**; vencida, o CI volta a falhar.

Exceções ativas: nenhuma.

Histórico: GHSA-fc5q-39xc-vjpf (picomatch) teve exceção de 18/11/2026, removida no mesmo dia porque o
alerta deixou de constar na base de alertas do npm para a versão usada (4.0.7).
