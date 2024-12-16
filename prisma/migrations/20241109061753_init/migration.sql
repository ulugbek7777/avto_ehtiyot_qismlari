/*
  Warnings:

  - You are about to drop the column `saleTarget` on the `product_sales` table. All the data in the column will be lost.
  - Added the required column `warehouseId` to the `client_orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "client_orders" ADD COLUMN     "warehouseId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "product_sales" DROP COLUMN "saleTarget";

-- AddForeignKey
ALTER TABLE "client_orders" ADD CONSTRAINT "client_orders_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
