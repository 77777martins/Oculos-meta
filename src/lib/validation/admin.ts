import { z } from "zod";
import { centsSchema, cleanText, emailSchema, longText, optionalText, safeUrlSchema } from "./common";
import { couponCodeSchema } from "./checkout";

export const couponSchema = z
  .strictObject({
    code: couponCodeSchema,
    description: optionalText(200),
    type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
    value: z.number().int().min(0).max(100_000_000),
    minSubtotalCents: centsSchema,
    maxDiscountCents: centsSchema.min(1).optional().nullable(),
    startsAt: z.coerce.date().optional().nullable(),
    endsAt: z.coerce.date().optional().nullable(),
    maxRedemptions: z.number().int().min(1).optional().nullable(),
    maxPerUser: z.number().int().min(1).optional().nullable(),
    isActive: z.boolean(),
  })
  .refine((c) => c.type !== "PERCENT" || (c.value >= 1 && c.value <= 10_000), { message: "Percentual entre 0,01% e 100%.", path: ["value"] })
  .refine((c) => c.type !== "FIXED" || c.value >= 1, { message: "Informe o valor do desconto.", path: ["value"] })
  .refine((c) => !c.startsAt || !c.endsAt || c.startsAt < c.endsAt, { message: "A data final deve ser posterior à inicial.", path: ["endsAt"] });

export const shippingZoneSchema = z
  .strictObject({
    name: cleanText(80),
    carrier: cleanText(60),
    serviceName: cleanText(60),
    zipStart: z.string().regex(/^\d{8}$/, "CEP inicial inválido (8 dígitos)."),
    zipEnd: z.string().regex(/^\d{8}$/, "CEP final inválido (8 dígitos)."),
    priceCents: centsSchema,
    freeAboveCents: centsSchema.min(1).optional().nullable(),
    minDays: z.number().int().min(0).max(120),
    maxDays: z.number().int().min(0).max(120),
    isActive: z.boolean(),
  })
  .refine((z) => Number(z.zipStart) <= Number(z.zipEnd), { message: "Faixa de CEP inválida.", path: ["zipEnd"] })
  .refine((z) => z.minDays <= z.maxDays, { message: "Prazo mínimo maior que o máximo.", path: ["maxDays"] });

export const bannerSchema = z.strictObject({
  title: cleanText(120),
  subtitle: optionalText(240),
  imageUrl: safeUrlSchema.optional().nullable(),
  linkUrl: safeUrlSchema.optional().nullable(),
  ctaLabel: optionalText(40),
  sortOrder: z.number().int().min(0).max(10_000),
  isActive: z.boolean(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
});

export const settingsSchema = z.strictObject({
  storeName: cleanText(80),
  legalName: optionalText(160),
  cnpj: optionalText(18),
  contactEmail: emailSchema.optional().nullable().or(z.literal("").transform(() => null)),
  contactPhone: optionalText(30),
  whatsapp: optionalText(30),
  address: optionalText(300),
  instagramUrl: safeUrlSchema.optional().nullable().or(z.literal("").transform(() => null)),
  businessHours: optionalText(160),
  privacyPolicy: longText(50_000).optional().nullable(),
  termsOfUse: longText(50_000).optional().nullable(),
  returnPolicy: longText(50_000).optional().nullable(),
  aboutText: longText(20_000).optional().nullable(),
  pixExpirationMinutes: z.number().int().min(10).max(1440),
  maxInstallments: z.number().int().min(1).max(24),
  boletoEnabled: z.boolean(),
  boletoDueDays: z.number().int().min(1).max(5),
});

export const orderStatusUpdateSchema = z.strictObject({
  status: z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  note: optionalText(500),
});

export const shipmentSchema = z.strictObject({
  carrier: cleanText(60),
  service: optionalText(60),
  trackingCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{4,60}$/, "Código de rastreio inválido."),
  trackingUrl: safeUrlSchema.optional().nullable(),
});

export const shipmentEventSchema = z.strictObject({
  status: z.enum(["POSTED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "RETURNED", "FAILED"]),
  description: cleanText(300),
  location: optionalText(120),
  occurredAt: z.coerce.date().refine((d) => d.getTime() <= Date.now() + 5 * 60_000, "A data não pode estar no futuro."),
});

export const refundSchema = z.strictObject({
  /** Omitido = reembolso total. */
  amountCents: centsSchema.min(1).optional(),
  reason: cleanText(300, 3),
});

export const staffUpdateSchema = z.strictObject({
  role: z.enum(["CUSTOMER", "SUPPORT", "MANAGER", "ADMIN"]),
});

export const staffInviteSchema = z.strictObject({
  email: emailSchema,
  role: z.enum(["SUPPORT", "MANAGER", "ADMIN"]),
});

export const contactSchema = z.strictObject({
  name: cleanText(120, 2),
  email: emailSchema,
  subject: cleanText(160, 3),
  message: longText(4000, 10),
  /** Honeypot anti-bot: deve vir vazio. */
  website: z.string().max(0).optional(),
});

export const dataRequestUpdateSchema = z.strictObject({
  status: z.enum(["COMPLETED", "REJECTED"]),
  notes: optionalText(1000),
});

export const profileSchema = z.strictObject({
  name: cleanText(120, 2),
  phone: z.string().optional().nullable(),
});
