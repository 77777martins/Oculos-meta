import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { ARGON2_OPTIONS as OPTIONS } from "./argon-options";

/** Argon2id (algoritmo padrão do @node-rs/argon2) com parâmetros OWASP. */

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/**
 * Hash fictício usado quando o e-mail não existe: mantém o tempo de resposta
 * semelhante e impede descobrir quais e-mails estão cadastrados (timing attack).
 */
let dummyHash: Promise<string> | undefined;
export async function verifyDummyPassword(password: string): Promise<void> {
  dummyHash ??= hashPassword("dummy-password-for-timing-protection");
  await verifyPassword(await dummyHash, password);
}
