import "server-only";
import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";
import { hasPermission, type Permission } from "@/lib/auth/rbac";

// ---- Para Server Components / páginas (redirecionam) -------------------------

export async function requireUserPage(returnTo: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(returnTo)}`);
  return user;
}

export async function requirePermissionPage(permission: Permission, returnTo = "/admin"): Promise<SessionUser> {
  const user = await requireUserPage(returnTo);
  // Não revela a existência da área administrativa para quem não é da equipe.
  if (!hasPermission(user.role, "admin:access")) redirect("/");
  if (!hasPermission(user.role, permission)) redirect("/admin?erro=permissao");
  return user;
}

// ---- Para Route Handlers (lançam erros mapeados para HTTP) -------------------

export async function requireApiUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireApiPermission(permission: Permission): Promise<SessionUser> {
  const user = await requireApiUser();
  if (!hasPermission(user.role, permission)) throw new ForbiddenError();
  return user;
}
