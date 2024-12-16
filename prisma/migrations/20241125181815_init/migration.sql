/*
  Warnings:

  - Added the required column `confirmed` to the `client_orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "client_orders" ADD COLUMN     "confirmed" BOOLEAN NOT NULL;
