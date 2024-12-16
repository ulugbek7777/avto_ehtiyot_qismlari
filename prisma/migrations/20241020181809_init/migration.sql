-- AlterTable
ALTER TABLE "product_sales" ADD COLUMN     "clientId" INTEGER,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'client';

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "product_sales" ADD CONSTRAINT "product_sales_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
