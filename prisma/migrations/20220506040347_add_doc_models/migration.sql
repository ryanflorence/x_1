-- CreateTable
CREATE TABLE "Doc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "html" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "DocGithubRef" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "lastDoc" TEXT
);
