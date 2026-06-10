/*
  Warnings:

  - You are about to drop the column `storagePath` on the `DocumentVersion` table. All the data in the column will be lost.
  - Added the required column `data` to the `DocumentVersion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DocumentVersion" DROP COLUMN "storagePath",
ADD COLUMN     "data" BYTEA NOT NULL;

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);
