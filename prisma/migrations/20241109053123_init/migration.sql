/*
  Warnings:

  - You are about to drop the column `clientId` on the `product_sales` table. All the data in the column will be lost.
  - You are about to drop the column `salePrice` on the `product_sales` table. All the data in the column will be lost.
  - Added the required column `type` to the `product_sales` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "product_sales" DROP CONSTRAINT "product_sales_clientId_fkey";

-- AlterTable
ALTER TABLE "product_sales" DROP COLUMN "clientId",
DROP COLUMN "salePrice",
ADD COLUMN     "saleTarget" TEXT NOT NULL DEFAULT 'client',
ADD COLUMN     "type" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'open';

-- CreateTable
CREATE TABLE "client_orders" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "productSaleId" INTEGER NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',

    CONSTRAINT "client_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_payments" (
    "id" SERIAL NOT NULL,
    "clientOrderId" INTEGER NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,

    CONSTRAINT "client_payments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "client_orders" ADD CONSTRAINT "client_orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_orders" ADD CONSTRAINT "client_orders_productSaleId_fkey" FOREIGN KEY ("productSaleId") REFERENCES "product_sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_clientOrderId_fkey" FOREIGN KEY ("clientOrderId") REFERENCES "client_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
