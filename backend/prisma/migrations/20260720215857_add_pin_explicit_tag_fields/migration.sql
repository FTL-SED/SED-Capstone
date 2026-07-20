-- AlterTable
ALTER TABLE "Pin" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'activity',
ADD COLUMN     "cuisines" TEXT[],
ADD COLUMN     "diets" TEXT[],
ADD COLUMN     "interests" TEXT[];
