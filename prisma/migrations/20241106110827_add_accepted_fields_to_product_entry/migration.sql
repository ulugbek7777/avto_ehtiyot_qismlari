-- AlterTable
ALTER TABLE "product_entries" ADD COLUMN     "acceptedById" INTEGER,
ADD COLUMN     "acceptedDate" TIMESTAMP(3),
ADD COLUMN     "userId" INTEGER;

-- AddForeignKey
ALTER TABLE "product_entries" ADD CONSTRAINT "product_entries_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_entries" ADD CONSTRAINT "product_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
