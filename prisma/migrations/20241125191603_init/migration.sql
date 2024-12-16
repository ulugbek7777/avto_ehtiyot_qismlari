/*
  Warnings:

  - You are about to drop the column `clientOrderId` on the `product_sales` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "product_sales" DROP CONSTRAINT "product_sales_clientOrderId_fkey";

-- AlterTable
ALTER TABLE "product_sales" DROP COLUMN "clientOrderId";

-- CreateTable
CREATE TABLE "_ClientOrderProductSales" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ClientOrderProductSales_AB_unique" ON "_ClientOrderProductSales"("A", "B");

-- CreateIndex
CREATE INDEX "_ClientOrderProductSales_B_index" ON "_ClientOrderProductSales"("B");

-- AddForeignKey
ALTER TABLE "_ClientOrderProductSales" ADD CONSTRAINT "_ClientOrderProductSales_A_fkey" FOREIGN KEY ("A") REFERENCES "client_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClientOrderProductSales" ADD CONSTRAINT "_ClientOrderProductSales_B_fkey" FOREIGN KEY ("B") REFERENCES "product_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
