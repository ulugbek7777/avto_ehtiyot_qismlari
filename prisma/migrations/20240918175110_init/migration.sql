-- CreateTable
CREATE TABLE "warehouses" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserWarehouses" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_name_key" ON "warehouses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_UserWarehouses_AB_unique" ON "_UserWarehouses"("A", "B");

-- CreateIndex
CREATE INDEX "_UserWarehouses_B_index" ON "_UserWarehouses"("B");

-- AddForeignKey
ALTER TABLE "_UserWarehouses" ADD CONSTRAINT "_UserWarehouses_A_fkey" FOREIGN KEY ("A") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserWarehouses" ADD CONSTRAINT "_UserWarehouses_B_fkey" FOREIGN KEY ("B") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
