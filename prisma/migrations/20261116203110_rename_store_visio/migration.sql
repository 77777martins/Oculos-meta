-- AlterTable
ALTER TABLE "StoreSettings" ALTER COLUMN "storeName" SET DEFAULT 'Visio Store';

-- Renomeia a loja apenas se ainda estiver com o nome padrão antigo
-- (nunca sobrescreve um nome definido pelo administrador no painel).
UPDATE "StoreSettings" SET "storeName" = 'Visio Store' WHERE "storeName" = 'Óculos Meta Store';
