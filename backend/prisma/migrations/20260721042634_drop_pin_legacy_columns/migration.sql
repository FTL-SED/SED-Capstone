-- Drop the unique constraint + FK first, then the columns.
ALTER TABLE "Pin" DROP CONSTRAINT IF EXISTS "Pin_itineraryId_orderInItinerary_key";
ALTER TABLE "Pin" DROP CONSTRAINT IF EXISTS "Pin_itineraryId_fkey";
ALTER TABLE "Pin" DROP COLUMN "itineraryId";
ALTER TABLE "Pin" DROP COLUMN "orderInItinerary";
ALTER TABLE "Pin" DROP COLUMN "startTime";
ALTER TABLE "Pin" DROP COLUMN "endTime";
ALTER TABLE "Pin" DROP COLUMN "travelTimeToNextMinutes";
ALTER TABLE "Pin" DROP COLUMN "distanceToNextMeters";
ALTER TABLE "Pin" DROP COLUMN "tags";
