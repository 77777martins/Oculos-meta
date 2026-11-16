import "server-only";
import type { z } from "zod";
import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { requireApiPermission } from "@/lib/auth/guards";
import type { Permission } from "@/lib/auth/rbac";
import { NotFoundError } from "@/lib/errors";
import { getRequestContext } from "@/lib/security/request";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { idSchema } from "@/lib/validation/common";
import { audit } from "@/server/services/audit";

/**
 * Fábrica de rotas administrativas CRUD. Garante, em um único lugar, que
 * TODA rota de escrita do painel aplique: permissão RBAC, rate limit,
 * CSRF (via apiHandler), validação Zod estrita e trilha de auditoria.
 */
interface CrudConfig<S extends z.ZodType> {
  entity: string;
  permission: Permission;
  schema: S;
  create: (data: z.infer<S>, actorId: string) => Promise<{ id: string }>;
  update: (id: string, data: z.infer<S>, actorId: string) => Promise<{ id: string }>;
  remove: (id: string, actorId: string) => Promise<void>;
}

async function guard(permission: Permission) {
  const user = await requireApiPermission(permission);
  await enforceRateLimit(RATE_LIMITS.admin, user.id);
  const { ip } = await getRequestContext();
  return { user, ip };
}

export async function parseAdminId(params: Promise<{ id: string }>): Promise<string> {
  const parsed = idSchema.safeParse((await params).id);
  if (!parsed.success) throw new NotFoundError();
  return parsed.data;
}

export function crudCollection<S extends z.ZodType>(cfg: CrudConfig<S>) {
  return {
    POST: apiHandler(async (req) => {
      const { user, ip } = await guard(cfg.permission);
      const data = await parseJson(req, cfg.schema);
      const created = await cfg.create(data, user.id);
      await audit({ actorId: user.id, action: `${cfg.entity}.create`, entityType: cfg.entity, entityId: created.id, ip });
      return ok(created, { status: 201 });
    }),
  };
}

export function crudItem<S extends z.ZodType>(cfg: CrudConfig<S>) {
  return {
    PUT: apiHandler<{ id: string }>(async (req, { params }) => {
      const { user, ip } = await guard(cfg.permission);
      const id = await parseAdminId(params);
      const data = await parseJson(req, cfg.schema);
      const updated = await cfg.update(id, data, user.id);
      await audit({ actorId: user.id, action: `${cfg.entity}.update`, entityType: cfg.entity, entityId: id, ip });
      return ok(updated);
    }),
    DELETE: apiHandler<{ id: string }>(async (_req, { params }) => {
      const { user, ip } = await guard(cfg.permission);
      const id = await parseAdminId(params);
      await cfg.remove(id, user.id);
      await audit({ actorId: user.id, action: `${cfg.entity}.delete`, entityType: cfg.entity, entityId: id, ip });
      return ok({ success: true });
    }),
  };
}

export { guard as adminGuard };
