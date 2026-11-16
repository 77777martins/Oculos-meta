-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingProvider" VARCHAR(20),
ADD COLUMN     "shippingQuote" JSONB,
ADD COLUMN     "shippingServiceId" INTEGER;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "providerOrderId" VARCHAR(64),
ADD COLUMN     "providerStatus" VARCHAR(30);

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "melhorEnvioEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "packageHeightCm" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "packageLengthCm" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "packageWidthCm" INTEGER NOT NULL DEFAULT 16,
ADD COLUMN     "shippingOriginZip" CHAR(8);

-- CreateTable
CREATE TABLE "IntegrationCredential" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "environment" VARCHAR(20) NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" VARCHAR(500),
    "connectedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationCredential_provider_key" ON "IntegrationCredential"("provider");

-- Embalagem com dimensões válidas e CEP de origem com 8 dígitos.
ALTER TABLE "StoreSettings"
  ADD CONSTRAINT "StoreSettings_package_dims_valid" CHECK ("packageHeightCm" BETWEEN 1 AND 200 AND "packageWidthCm" BETWEEN 1 AND 200 AND "packageLengthCm" BETWEEN 1 AND 200),
  ADD CONSTRAINT "StoreSettings_origin_zip_format" CHECK ("shippingOriginZip" IS NULL OR "shippingOriginZip" ~ '^[0-9]{8}$');

CREATE INDEX "Shipment_sync_idx" ON "Shipment" ("status", "lastSyncedAt");
