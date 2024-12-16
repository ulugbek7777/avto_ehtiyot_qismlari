/*
  Warnings:

  - You are about to drop the `_ClientOrderProductSales` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ClientOrderProductSales" DROP CONSTRAINT "_ClientOrderProductSales_A_fkey";

-- DropForeignKey
ALTER TABLE "_ClientOrderProductSales" DROP CONSTRAINT "_ClientOrderProductSales_B_fkey";

-- AlterTable
ALTER TABLE "product_sales" ADD COLUMN     "clientOrderId" INTEGER;

-- DropTable
DROP TABLE "_ClientOrderProductSales";

-- AddForeignKey
ALTER TABLE "product_sales" ADD CONSTRAINT "product_sales_clientOrderId_fkey" FOREIGN KEY ("clientOrderId") REFERENCES "client_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
