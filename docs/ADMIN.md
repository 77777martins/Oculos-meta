# Painel administrativo (`/admin`)

Acesso somente para contas com papel de equipe. Crie o primeiro administrador com `npm run admin:create`; depois, gerencie a equipe em **Equipe** (a pessoa precisa ter se cadastrado na loja).

## Papéis
| Área | Atendimento | Gerente | Administrador |
|---|:-:|:-:|:-:|
| Dashboard, pedidos, rastreio, clientes, mensagens | ✓ | ✓ | ✓ |
| Produtos, estoque, categorias, cupons, frete, banners, imagens | — | ✓ | ✓ |
| Financeiro (leitura) | — | ✓ | ✓ |
| Reembolsos, configurações, equipe, LGPD, auditoria | — | — | ✓ |

## Rotinas
- **Produtos:** status Rascunho/Publicado/Arquivado. Cadastre apenas especificações verificadas. Preço promocional deve ser menor que o normal.
- **Estoque:** físico × reservado × disponível. Entradas/baixas via **Ajustar estoque** com motivo (registrado no livro-razão). Variantes novas podem receber estoque inicial.
- **Pedidos:** fluxo Pago → Em separação → Enviado → Entregue. Cadastre transportadora e código de rastreio e lance as movimentações informadas pela transportadora (nada é simulado). Pedido pago só pode ser cancelado após reembolso.
- **Frete:** cadastre faixas de CEP (ex.: `01000000`–`19999999`) por serviço (PAC, SEDEX…), com preço, prazo e frete grátis opcional.
- **Cupons:** percentual, fixo ou frete grátis; limites total/por cliente, subtotal mínimo e validade. Usos de pedidos expirados são liberados.
- **Alertas no dashboard:** pagamentos aprovados em pedidos cancelados/expirados ou com valor divergente — exigem ação (normalmente reembolso).
- **Auditoria:** todas as ações sensíveis (login, alterações, reembolsos, papéis) com autor e data.
