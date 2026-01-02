-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "password" TEXT;

-- AlterTable
ALTER TABLE "Teacher" ALTER COLUMN "email" DROP NOT NULL;
