/*
  Warnings:

  - You are about to drop the column `userId` on the `product_entries` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "product_entries" DROP CONSTRAINT "product_entries_userId_fkey";

-- AlterTable
ALTER TABLE "product_entries" DROP COLUMN "userId";
