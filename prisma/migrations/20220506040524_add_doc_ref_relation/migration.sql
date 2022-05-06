/*
  Warnings:

  - You are about to drop the column `ref` on the `Doc` table. All the data in the column will be lost.
  - Added the required column `refId` to the `Doc` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Doc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    CONSTRAINT "Doc_refId_fkey" FOREIGN KEY ("refId") REFERENCES "DocGithubRef" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Doc" ("html", "id", "lang", "markdown", "name") SELECT "html", "id", "lang", "markdown", "name" FROM "Doc";
DROP TABLE "Doc";
ALTER TABLE "new_Doc" RENAME TO "Doc";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
