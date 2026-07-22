-- DropIndex
DROP INDEX "Itinerary_isPublic_idx";

-- CreateIndex
CREATE INDEX "Itinerary_isPublic_createdAt_idx" ON "Itinerary"("isPublic", "createdAt");

-- CreateIndex
CREATE INDEX "Itinerary_userId_idx" ON "Itinerary"("userId");

-- CreateIndex
CREATE INDEX "ItineraryStop_pinId_idx" ON "ItineraryStop"("pinId");

-- CreateIndex
CREATE INDEX "Like_itineraryId_idx" ON "Like"("itineraryId");
