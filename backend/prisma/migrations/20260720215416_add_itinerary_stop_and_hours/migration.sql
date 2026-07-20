-- AlterTable
ALTER TABLE "Pin" ADD COLUMN     "hoursOpen" JSONB;

-- CreateTable
CREATE TABLE "ItineraryStop" (
    "id" SERIAL NOT NULL,
    "pinId" INTEGER NOT NULL,
    "itineraryId" INTEGER NOT NULL,
    "orderInItinerary" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "travelTimeToNextMinutes" INTEGER,
    "distanceToNextMeters" DOUBLE PRECISION,
    "mealType" TEXT,
    "note" TEXT,

    CONSTRAINT "ItineraryStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryStop_itineraryId_orderInItinerary_key" ON "ItineraryStop"("itineraryId", "orderInItinerary");

-- AddForeignKey
ALTER TABLE "ItineraryStop" ADD CONSTRAINT "ItineraryStop_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES "Pin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryStop" ADD CONSTRAINT "ItineraryStop_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
