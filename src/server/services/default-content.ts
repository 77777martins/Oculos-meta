/**
 * TEXTOS-MODELO exibidos enquanto o administrador não cadastra os textos
 * definitivos em Admin > Configurações. NÃO constituem aconselhamento
 * jurídico: revise com um profissional antes de operar.
 */
export const DEFAULT_PRIVACY = `## Modelo — revise antes de publicar
Este texto é um modelo inicial. Substitua-o pela política revisada por sua assessoria jurídica em Admin > Configurações.

## Quais dados coletamos
- Cadastro: nome, e-mail, senha (armazenada apenas como hash criptográfico) e telefone opcional.
- Compras: CPF (exigido para nota fiscal e pelo processador de pagamentos), endereço de entrega e itens comprados.
- Segurança: registros técnicos mínimos, com endereço IP armazenado apenas de forma pseudonimizada.

## Para que usamos
- Executar o contrato de compra e venda (processar pedidos, pagamentos e entregas).
- Cumprir obrigações legais e fiscais.
- Prevenir fraudes e proteger sua conta.
- Enviar comunicações de marketing somente com o seu consentimento.

## Compartilhamento
Compartilhamos dados apenas com quem é necessário para concluir sua compra: processador de pagamentos (Mercado Pago), transportadoras e provedores de infraestrutura. Dados de cartão são digitados diretamente nos campos seguros do Mercado Pago e não passam pelos nossos servidores.

## Seus direitos (LGPD, art. 18)
Você pode, a qualquer momento, acessar e baixar seus dados, corrigi-los e solicitar a exclusão da conta pela área "Minha conta > Privacidade e dados".

## Retenção
Dados de pedidos são mantidos pelo prazo exigido pela legislação fiscal. Ao excluir a conta, dados pessoais não obrigatórios são removidos ou anonimizados.

## Cookies
Utilizamos cookies estritamente necessários (sessão e segurança). Cookies de análise só são utilizados com seu consentimento.`;

export const DEFAULT_TERMS = `## Modelo — revise antes de publicar
Este texto é um modelo inicial. Substitua-o pelos termos revisados por sua assessoria jurídica em Admin > Configurações.

## Uso da loja
Ao criar uma conta e realizar compras, você declara que as informações fornecidas são verdadeiras.

## Preços e disponibilidade
Preços e estoque são confirmados no momento da criação do pedido. O estoque fica reservado por tempo limitado enquanto o pagamento é concluído.

## Pagamento
Pagamentos são processados pelo Mercado Pago. O pedido é confirmado somente após a aprovação do pagamento pelo provedor.

## Entrega
Os prazos informados contam a partir da confirmação do pagamento e podem variar conforme a transportadora.`;

export const DEFAULT_RETURNS = `## Modelo — revise antes de publicar
Este texto é um modelo inicial. Substitua-o pela política definitiva em Admin > Configurações.

## Direito de arrependimento
Compras realizadas pela internet podem ser canceladas em até 7 dias corridos após o recebimento, conforme o art. 49 do Código de Defesa do Consumidor.

## Como solicitar
Entre em contato pela página de Contato informando o número do pedido. Orientaremos sobre o envio do produto.

## Produtos com defeito
Produtos com defeito seguem as regras de garantia legal e as condições de garantia do fabricante.

## Reembolso
Após o recebimento e a conferência do produto, o reembolso é feito pelo mesmo meio de pagamento utilizado na compra.`;

export const DEFAULT_ABOUT = `Somos uma loja especializada em óculos inteligentes, com foco em procedência, atendimento próximo e uma experiência de compra segura.

Edite este texto em Admin > Configurações.`;

export const FAQ: Array<{ q: string; a: string }> = [
  { q: "Quais formas de pagamento são aceitas?", a: "PIX (aprovação em segundos) e cartão de crédito com parcelamento, processados pelo Mercado Pago." },
  { q: "Quando meu pedido é confirmado?", a: "Assim que o Mercado Pago aprova o pagamento. A confirmação é automática e você recebe um e-mail." },
  { q: "Por quanto tempo o produto fica reservado?", a: "Ao criar o pedido, reservamos o estoque por tempo limitado (exibido na página de pagamento). Se o pagamento não for concluído, a reserva é liberada." },
  { q: "Como acompanho a entrega?", a: "Em Minha conta > Pedidos. Quando o pedido é enviado, o código de rastreio e as movimentações aparecem no detalhe do pedido." },
  { q: "Posso trocar ou devolver?", a: "Sim. Consulte a nossa Política de Trocas e Devoluções." },
  { q: "Meus dados estão seguros?", a: "Sim. Senhas são armazenadas com hash Argon2id, dados de cartão nunca passam pelos nossos servidores e você pode exportar ou excluir seus dados a qualquer momento." },
];
