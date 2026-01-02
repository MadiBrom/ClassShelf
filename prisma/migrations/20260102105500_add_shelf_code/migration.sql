/*
  Warnings:

  - A unique constraint covering the columns `[shelfCode]` on the table `Teacher` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `shelfCode` to the `Teacher` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "shelfCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_shelfCode_key" ON "Teacher"("shelfCode");
