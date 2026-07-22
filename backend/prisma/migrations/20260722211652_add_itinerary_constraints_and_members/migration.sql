-- AlterTable
ALTER TABLE "Itinerary" ADD COLUMN     "dayEnd" TEXT,
ADD COLUMN     "dayStart" TEXT,
ADD COLUMN     "maxBudgetPerPerson" DOUBLE PRECISION,
ADD COLUMN     "meetingPointLat" DOUBLE PRECISION,
ADD COLUMN     "meetingPointLng" DOUBLE PRECISION,
ADD COLUMN     "transport" TEXT,
ADD COLUMN     "travelRadius" DOUBLE PRECISION,
ADD COLUMN     "tripDate" DATE;

-- CreateTable
CREATE TABLE "ItineraryMember" (
    "id" SERIAL NOT NULL,
    "itineraryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startLabel" TEXT,
    "startLat" DOUBLE PRECISION,
    "startLng" DOUBLE PRECISION,
    "interestTags" TEXT[],
    "foodPrefs" TEXT[],
    "diets" TEXT[],

    CONSTRAINT "ItineraryMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItineraryMember_itineraryId_idx" ON "ItineraryMember"("itineraryId");

-- AddForeignKey
ALTER TABLE "ItineraryMember" ADD CONSTRAINT "ItineraryMember_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
