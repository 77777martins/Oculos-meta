import { z } from "zod";
import { cleanText, idSchema } from "./common";

export const reviewSchema = z.strictObject({
  productId: idSchema,
  rating: z.number().int().min(1, "Escolha de 1 a 5 estrelas.").max(5),
  comment: cleanText(1000, 10),
});

export const reviewModerationSchema = z.strictObject({ status: z.enum(["PUBLISHED", "REJECTED"]) });
