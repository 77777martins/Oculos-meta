import { z } from "zod";
import { BR_STATES, cleanText, optionalPhoneSchema, optionalText, zipSchema } from "./common";

export const addressSchema = z.strictObject({
  label: optionalText(60),
  recipient: cleanText(120, 2),
  zipCode: zipSchema,
  street: cleanText(160),
  number: cleanText(20),
  complement: optionalText(80),
  district: cleanText(80),
  city: cleanText(80),
  state: z.enum(BR_STATES, { error: "UF inválida." }),
  phone: optionalPhoneSchema,
  isDefault: z.boolean().optional().default(false),
});

export type AddressInput = z.input<typeof addressSchema>;
export type AddressData = z.output<typeof addressSchema>;
