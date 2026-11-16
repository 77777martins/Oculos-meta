import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = {
  "@": path.resolve(import.meta.dirname, "src"),
  // "server-only" lança erro fora do bundler do Next; nos testes é um módulo vazio.
  "server-only": path.resolve(import.meta.dirname, "tests/helpers/empty.ts"),
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/helpers/integration-setup.ts"],
          globalSetup: ["tests/helpers/global-setup.ts"],
          // Banco compartilhado: executa os arquivos em série para isolamento.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
