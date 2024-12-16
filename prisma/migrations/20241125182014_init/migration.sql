/*
  Warnings:

  - Added the required column `type` to the `client_orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "client_orders" ADD COLUMN     "type" TEXT NOT NULL;
