-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultStartLabel" TEXT,
ADD COLUMN     "defaultStartLat" DOUBLE PRECISION,
ADD COLUMN     "defaultStartLng" DOUBLE PRECISION,
ADD COLUMN     "diets" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "foodPrefs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "interestTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;
