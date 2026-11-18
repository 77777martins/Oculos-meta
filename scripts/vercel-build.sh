#!/usr/bin/env bash
# Build na Vercel.
# - DIRECT_URL: usa a variável explícita ou as criadas pela integração Neon da Vercel
#   (necessária só para as migrações; em tempo de execução basta DATABASE_URL).
# - Somente em PRODUÇÃO: migrações, dados base (idempotentes) e administrador inicial
#   (criado apenas se ainda não existir nenhum ADMIN).
set -euo pipefail

export DIRECT_URL="${DIRECT_URL:-${DATABASE_URL_UNPOOLED:-${POSTGRES_URL_NON_POOLING:-${DATABASE_URL:-}}}}"

if [ "${VERCEL_ENV:-}" = "production" ]; then
  npx prisma migrate deploy
  npx prisma db seed
  if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
    npx tsx scripts/create-admin.ts --if-missing
  fi
fi

npm run build
