import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { checkoutSchema } from "@/lib/validation/checkout";
import type { AddressData } from "@/lib/validation/address";
import { createOrder } from "@/server/services/orders";

export const POST = apiHandler(async (req) => {
  const user = await requireApiUser();
  await enforceRateLimit(RATE_LIMITS.checkout, user.id);
  const input = await parseJson(req, checkoutSchema);

  let address: AddressData;
  if (input.addressId) {
    // Endereço salvo: precisa pertencer ao usuário (anti-IDOR).
    const saved = await db.address.findFirst({ where: { id: input.addressId, userId: user.id, deletedAt: null } });
    if (!saved) throw new NotFoundError("Endereço não encontrado.");
    address = {
      label: saved.label,
      recipient: saved.recipient,
      zipCode: saved.zipCode,
      street: saved.street,
      number: saved.number,
      complement: saved.complement,
      district: saved.district,
      city: saved.city,
      state: saved.state as AddressData["state"],
      phone: saved.phone,
      isDefault: saved.isDefault,
    };
  } else {
    address = input.address!;
  }

  const order = await createOrder({
    userId: user.id,
    items: input.items,
    address,
    shippingOptionId: input.shippingOptionId,
    couponCode: input.couponCode,
    customerDocument: input.customerDocument,
    customerPhone: input.customerPhone,
  });

  if (!input.addressId && input.saveAddress) {
    const count = await db.address.count({ where: { userId: user.id, deletedAt: null } });
    if (count < 10) {
      await db.address.create({ data: { ...address, isDefault: count === 0, userId: user.id } }).catch(() => undefined);
    }
  }

  return ok({ orderId: order.id, number: order.number }, { status: 201 });
});
