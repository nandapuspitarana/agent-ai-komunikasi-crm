/*
  Warnings:

  - You are about to drop the column `edges` on the `Flow` table. All the data in the column will be lost.
  - You are about to drop the column `nodes` on the `Flow` table. All the data in the column will be lost.
  - You are about to drop the `ChatbotCentre` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatbotCity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatbotJourneySession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatbotPricing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatbotService` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JourneyLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JourneySubmission` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChatbotCentre" DROP CONSTRAINT "ChatbotCentre_cityId_fkey";

-- DropForeignKey
ALTER TABLE "ChatbotCity" DROP CONSTRAINT "ChatbotCity_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ChatbotJourneySession" DROP CONSTRAINT "ChatbotJourneySession_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ChatbotPricing" DROP CONSTRAINT "ChatbotPricing_centreId_fkey";

-- DropForeignKey
ALTER TABLE "ChatbotService" DROP CONSTRAINT "ChatbotService_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "JourneyLog" DROP CONSTRAINT "JourneyLog_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "JourneySubmission" DROP CONSTRAINT "JourneySubmission_sessionId_fkey";

-- AlterTable
ALTER TABLE "Flow" DROP COLUMN "edges",
DROP COLUMN "nodes",
ADD COLUMN     "config" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}';

-- DropTable
DROP TABLE "ChatbotCentre";

-- DropTable
DROP TABLE "ChatbotCity";

-- DropTable
DROP TABLE "ChatbotJourneySession";

-- DropTable
DROP TABLE "ChatbotPricing";

-- DropTable
DROP TABLE "ChatbotService";

-- DropTable
DROP TABLE "JourneyLog";

-- DropTable
DROP TABLE "JourneySubmission";

-- CreateTable
CREATE TABLE "Intent" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trainingPhrases" TEXT[],
    "responseType" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "options" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Intent_flowId_idx" ON "Intent"("flowId");

-- CreateIndex
CREATE INDEX "Flow_tenantId_idx" ON "Flow"("tenantId");

-- AddForeignKey
ALTER TABLE "Intent" ADD CONSTRAINT "Intent_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
