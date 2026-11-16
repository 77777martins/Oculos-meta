import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getCurrentUser, SESSION_COOKIE } from "@/lib/auth/session";
import { sha256 } from "@/lib/security/crypto";
import { changePassword, loginUser, registerUser, requestPasswordReset, resetPassword } from "@/server/services/auth";
import { requestState } from "../helpers/integration-setup";
import { createUser, resetDb } from "../helpers/db";

const ctx = { ip: "203.0.113.10", userAgent: "vitest" };

beforeEach(async () => {
  await resetDb();
  requestState.cookies.clear();
});

describe("cadastro", () => {
  it("cria usuário com hash Argon2id, consentimentos e sessão", async () => {
    await registerUser({ name: "Ana", email: "ana@ex.com", password: "SenhaForte123", marketingOptIn: false }, ctx);
    const user = await db.user.findUniqueOrThrow({ where: { email: "ana@ex.com" }, include: { consents: true } });
    expect(user.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(user.role).toBe("CUSTOMER");
    expect(user.consents.map((c) => c.type).sort()).toEqual(["MARKETING", "PRIVACY", "TERMS"]);
    const token = requestState.cookies.get(SESSION_COOKIE)!;
    // O banco guarda somente o hash do token de sessão.
    expect(await db.session.count({ where: { tokenHash: sha256(token) } })).toBe(1);
    expect(await db.session.count({ where: { tokenHash: token } })).toBe(0);
    expect((await getCurrentUser())?.email).toBe("ana@ex.com");
  });

  it("recusa e-mail duplicado", async () => {
    await createUser({ email: "dup@ex.com" });
    await expect(registerUser({ name: "Ana", email: "dup@ex.com", password: "SenhaForte123", marketingOptIn: false }, ctx)).rejects.toMatchObject({ status: 409 });
  });
});

describe("login e proteção contra brute force", () => {
  it("autentica com credenciais corretas", async () => {
    await createUser({ email: "joao@ex.com" });
    await loginUser({ email: "joao@ex.com", password: "SenhaForte123" }, ctx);
    expect((await getCurrentUser())?.email).toBe("joao@ex.com");
  });

  it("mensagem idêntica para e-mail inexistente e senha errada", async () => {
    await createUser({ email: "joao@ex.com" });
    const a = await loginUser({ email: "nao@ex.com", password: "x" }, ctx).catch((e) => e.message);
    const b = await loginUser({ email: "joao@ex.com", password: "errada" }, ctx).catch((e) => e.message);
    expect(a).toBe(b);
  });

  it("bloqueia a conta após 5 falhas, mesmo com a senha correta depois", async () => {
    await createUser({ email: "joao@ex.com" });
    for (let i = 0; i < 5; i++) await loginUser({ email: "joao@ex.com", password: "errada" }, ctx).catch(() => undefined);
    const u = await db.user.findUniqueOrThrow({ where: { email: "joao@ex.com" } });
    expect(u.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    await expect(loginUser({ email: "joao@ex.com", password: "SenhaForte123" }, ctx)).rejects.toMatchObject({ status: 401 });
  });

  it("sessão revogada ou expirada não autentica", async () => {
    await createUser({ email: "joao@ex.com" });
    await loginUser({ email: "joao@ex.com", password: "SenhaForte123" }, ctx);
    await db.session.updateMany({ data: { revokedAt: new Date() } });
    expect(await getCurrentUser()).toBeNull();
  });

  it("cookie forjado não autentica", async () => {
    requestState.cookies.set(SESSION_COOKIE, "a".repeat(43));
    expect(await getCurrentUser()).toBeNull();
  });
});

describe("recuperação de senha", () => {
  async function issueToken(email: string): Promise<string> {
    // Captura o token do link no "e-mail" de desenvolvimento.
    const logs: string[] = [];
    const original = console.info;
    console.info = (msg: string) => logs.push(msg);
    try {
      await requestPasswordReset(email, ctx);
    } finally {
      console.info = original;
    }
    const match = logs.join("\n").match(/token=([A-Za-z0-9_-]+)/);
    return decodeURIComponent(match![1]!);
  }

  it("token é de uso único, redefine a senha e revoga sessões", async () => {
    const user = await createUser({ email: "rec@ex.com" });
    await loginUser({ email: "rec@ex.com", password: "SenhaForte123" }, ctx);
    const token = await issueToken("rec@ex.com");
    expect(await db.passwordResetToken.count({ where: { tokenHash: token } })).toBe(0); // só o hash é salvo

    await resetPassword(token, "NovaSenha456", ctx);
    expect(await db.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
    await expect(resetPassword(token, "OutraSenha789", ctx)).rejects.toMatchObject({ status: 422 });
    await loginUser({ email: "rec@ex.com", password: "NovaSenha456" }, ctx);
  });

  it("token expirado é recusado", async () => {
    await createUser({ email: "exp@ex.com" });
    const token = await issueToken("exp@ex.com");
    await db.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(resetPassword(token, "NovaSenha456", ctx)).rejects.toMatchObject({ status: 422 });
  });

  it("e-mail inexistente não gera erro (não revela cadastro)", async () => {
    await expect(requestPasswordReset("ninguem@ex.com", ctx)).resolves.toBeUndefined();
  });

  it("troca de senha exige senha atual e mantém só a sessão corrente", async () => {
    const user = await createUser({ email: "troca@ex.com" });
    await loginUser({ email: "troca@ex.com", password: "SenhaForte123" }, ctx);
    const current = (await getCurrentUser())!;
    await expect(changePassword(user.id, current.sessionId, "errada", "NovaSenha456", ctx)).rejects.toMatchObject({ status: 422 });
    await changePassword(user.id, current.sessionId, "SenhaForte123", "NovaSenha456", ctx);
    expect(await getCurrentUser()).not.toBeNull();
  });
});
