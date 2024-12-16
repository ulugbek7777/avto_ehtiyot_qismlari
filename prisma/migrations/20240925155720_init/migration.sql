/*
  Warnings:

  - You are about to drop the column `brandId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `itemId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `modelId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `purchasePrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `wholesalePrice` on the `products` table. All the data in the column will be lost.
  - Added the required column `itemModelBrandRelationId` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_brandId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_itemId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_modelId_fkey";

-- DropIndex
DROP INDEX "products_itemId_brandId_modelId_warehouseId_key";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "brandId",
DROP COLUMN "itemId",
DROP COLUMN "modelId",
DROP COLUMN "price",
DROP COLUMN "purchasePrice",
DROP COLUMN "wholesalePrice",
ADD COLUMN     "itemModelBrandRelationId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "item_model_brand_relation" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "brandId" INTEGER NOT NULL,
    "modelId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "wholesalePrice" DOUBLE PRECISION NOT NULL,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_model_brand_relation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "item_model_brand_relation" ADD CONSTRAINT "item_model_brand_relation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_model_brand_relation" ADD CONSTRAINT "item_model_brand_relation_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_model_brand_relation" ADD CONSTRAINT "item_model_brand_relation_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_itemModelBrandRelationId_fkey" FOREIGN KEY ("itemModelBrandRelationId") REFERENCES "item_model_brand_relation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
