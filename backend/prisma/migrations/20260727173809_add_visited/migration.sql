-- CreateTable
CREATE TABLE "Visited" (
    "userId" INTEGER NOT NULL,
    "itineraryId" INTEGER NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visited_pkey" PRIMARY KEY ("userId","itineraryId")
);

-- CreateIndex
CREATE INDEX "Visited_itineraryId_idx" ON "Visited"("itineraryId");

-- AddForeignKey
ALTER TABLE "Visited" ADD CONSTRAINT "Visited_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visited" ADD CONSTRAINT "Visited_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
