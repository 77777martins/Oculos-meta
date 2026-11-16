-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "boletoLine" VARCHAR(80);

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "boletoDueDays" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "boletoEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Vencimento do boleto entre 1 e 5 dias.
ALTER TABLE "StoreSettings" ADD CONSTRAINT "StoreSettings_boleto_due_days_valid" CHECK ("boletoDueDays" BETWEEN 1 AND 5);
