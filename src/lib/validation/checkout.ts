import { z } from "zod";
import { addressSchema } from "./address";
import { cpfSchema, idSchema, phoneSchema, zipSchema } from "./common";

export const MAX_QTY_PER_ITEM = 10;
export const MAX_CART_LINES = 20;

export const cartItemSchema = z.strictObject({
  variantId: idSchema,
  quantity: z.number().int().min(1).max(MAX_QTY_PER_ITEM),
});

export const cartItemsSchema = z.array(cartItemSchema).min(1, "Seu carrinho está vazio.").max(MAX_CART_LINES, "Itens demais no carrinho.");

export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{3,40}$/, "Cupom inválido.");

/** Cotação do carrinho: somente IDs e quantidades — preços SEMPRE vêm do banco. */
export const cartQuoteSchema = z.strictObject({
  items: z.array(cartItemSchema).max(MAX_CART_LINES),
  zipCode: zipSchema.optional(),
  couponCode: couponCodeSchema.optional(),
});

export const checkoutSchema = z.strictObject({
  items: cartItemsSchema,
  /** Endereço salvo OU um novo endereço. */
  addressId: idSchema.optional(),
  address: addressSchema.optional(),
  saveAddress: z.boolean().optional().default(true),
  couponCode: couponCodeSchema.optional(),
  /** "zone_<id>" (tabela) ou "me_<serviço>" (Melhor Envio) — o preço é recalculado no servidor. */
  shippingOptionId: z.string().regex(/^(zone_[a-z0-9]{20,32}|me_\d{1,6})$/, "Opção de frete inválida."),
  customerDocument: cpfSchema,
  customerPhone: phoneSchema,
}).refine((v) => Boolean(v.addressId) !== Boolean(v.address), { message: "Selecione ou informe um endereço de entrega.", path: ["address"] });

export const pixPaymentSchema = z.strictObject({ method: z.literal("pix") });
export const boletoPaymentSchema = z.strictObject({ method: z.literal("boleto") });

/** Dados retornados pelo Card Payment Brick (cartão já tokenizado pelo Mercado Pago). */
export const cardPaymentSchema = z.strictObject({
  method: z.literal("card"),
  attemptId: z.uuid("Tentativa inválida."),
  token: z.string().min(10).max(128),
  paymentMethodId: z.string().regex(/^[a-z_]{2,30}$/),
  issuerId: z.union([z.string().regex(/^\d{1,10}$/), z.number().int().positive()]).optional().nullable(),
  installments: z.number().int().min(1).max(24),
  payerEmail: z.email().max(254),
  identificationType: z.enum(["CPF", "CNPJ"]).optional(),
  identificationNumber: z.string().regex(/^\d{11,14}$/).optional(),
});

export const paymentRequestSchema = z.discriminatedUnion("method", [pixPaymentSchema, boletoPaymentSchema, cardPaymentSchema]);

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CartItemInput = z.infer<typeof cartItemSchema>;
