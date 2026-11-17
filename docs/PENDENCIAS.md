# O que falta para a loja vender de verdade

Tudo o que depende do lojista. O painel mostra a situação atual em **Admin → Pronto para vender**.

## 1. Dados dos produtos
Para cada modelo e cor:

| Campo | Observação |
|---|---|
| Nome do modelo | Todos identificados (Skyler e Wayfarer: falta confirmar a geração) |
| Preço e preço promocional | Todos os valores atuais são fictícios |
| Estoque | Por cor |
| Lente | Transparente, escura, polarizada, que escurece no sol (Transitions) |
| Descrição | Texto de venda |
| Especificações | Somente dados oficiais (câmera, bateria, áudio, peso, compatibilidade) |

### Identificações a confirmar (pelo código gravado na haste ou etiqueta da caixa)
O conteúdo comercial fica em `prisma/catalog-content.ts`. Enquanto não houver confirmação, a loja mostra
nome descritivo e só características gerais; os números da identificação provável ficam guardados em
`unconfirmedSpecs` e são publicados depois da confirmação.

| Produto na loja | Identificação provável | O que fica pendente |
|---|---|---|
| Ray-Ban Meta Skyler | Gen 1 ou Gen 2 | Vídeo, bateria e armazenamento |
| Ray-Ban Meta Wayfarer | Geração não informada | Vídeo, bateria e armazenamento |

Confirmado pelas fotos: **Ray-Ban Meta Audio Clubmaster** (haste: "RAY-BAN META · AUDIO · CLUBMASTER"), sem câmera.

Confirmados pelo lojista no catálogo oficial Ray-Ban (17/11/2026):
- **Ray-Ban Meta Blayzer Optics (Gen 2)** — RW7001 (antes "Retangular").
- **Ray-Ban Meta Zena (Gen 3)** — RW4015 (antes "Gatinho"). Revisar: as fotos frontal e traseira mostram lente verde; as laterais, lente clara/Transitions.
- **Ray-Ban Meta Aviator (Gen 3)** — RW4016, Havana com lentes Transparentes/Marrom Transitions (antes "Piloto").

Confirmar também:
- quais modelos têm mesmo lente que escurece (efeito ligado hoje: Wayfarer preto e azul, Clubmaster, Gatinho, Piloto e Oakley HSTN);
- se as cores com estrela na haste (Adventurer cinza e Capri cinza) são "Lisa Edition";
- se o Clubmaster de lente verde e o de lente que escurece são o mesmo produto.

## 2. Contas e chaves (variáveis na Vercel)
| Serviço | Variáveis | Para que serve |
|---|---|---|
| Mercado Pago | `MERCADOPAGO_ACCESS_TOKEN`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET` | Receber PIX, cartão e boleto |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM` | E-mails de pedido e recuperação de senha |
| Vercel Blob | `BLOB_READ_WRITE_TOKEN` | Enviar fotos pelo painel |
| Melhor Envio (opcional) | `MELHORENVIO_CLIENT_ID`, `MELHORENVIO_CLIENT_SECRET`, `MELHORENVIO_USER_AGENT` | Frete calculado na hora |
| Domínio | `APP_URL` | Endereço definitivo da loja |

Passo a passo em `docs/DEPLOY.md` e `docs/PAGAMENTOS.md`.

## 3. Configurações da loja (Admin → Configurações)
- E-mail, telefone/WhatsApp e horário de atendimento.
- CEP de origem dos envios e tabela de frete real (Admin → Frete).
- Revisão dos textos de privacidade, termos e trocas.

## 4. Virada para produção
1. Merge do PR para `main` e Vercel apontando para `main`.
2. Apagar pedidos, frete e cupom de demonstração: `npm run launch:cleanup` (simula) e `npm run launch:cleanup -- --confirm` (apaga). Produtos e fotos são mantidos.
3. Lançar preços e estoque reais em **Admin → Preços e estoque** (todas as variantes numa tela só).
4. `DEMO_MODE=false` e `SEED_DEMO` desligado.
5. Compra real de valor baixo por PIX, seguida de reembolso pelo painel.

## 5. Fora do código
- ~~Autorização do fornecedor para as fotos~~ — concedida (informada pelo lojista em 17/11/2026). Guardar a comprovação por escrito.
- Busca do nome "Visio" no INPI (classes 9 e 35).
- 2FA na conta da Vercel.
- Orientação contábil sobre venda sem CNPJ/nota fiscal.
