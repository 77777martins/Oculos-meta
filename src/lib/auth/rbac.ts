import type { Role } from "@prisma/client";

/**
 * Controle de acesso baseado em papéis (RBAC).
 * Arquivo PURO (sem dependências de servidor) para poder ser testado e
 * usado também na UI para esconder ações — a checagem real é sempre no servidor.
 */
export const PERMISSIONS = [
  "admin:access",
  "dashboard:read",
  "orders:read",
  "orders:update",
  "customers:read",
  "products:read",
  "products:write",
  "inventory:write",
  "categories:write",
  "coupons:write",
  "shipping:write",
  "banners:write",
  "media:write",
  "payments:read",
  "payments:refund",
  "settings:write",
  "staff:manage",
  "audit:read",
  "privacy:manage",
  "messages:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const SUPPORT: Permission[] = ["admin:access", "dashboard:read", "orders:read", "orders:update", "customers:read", "products:read", "messages:read"];

const MANAGER: Permission[] = [
  ...SUPPORT,
  "products:write",
  "inventory:write",
  "categories:write",
  "coupons:write",
  "shipping:write",
  "banners:write",
  "media:write",
  "payments:read",
];

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  CUSTOMER: new Set(),
  SUPPORT: new Set(SUPPORT),
  MANAGER: new Set(MANAGER),
  ADMIN: new Set(PERMISSIONS),
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function isStaff(role: Role): boolean {
  return hasPermission(role, "admin:access");
}

export const ROLE_LABELS: Record<Role, string> = {
  CUSTOMER: "Cliente",
  SUPPORT: "Atendimento",
  MANAGER: "Gerente",
  ADMIN: "Administrador",
};
