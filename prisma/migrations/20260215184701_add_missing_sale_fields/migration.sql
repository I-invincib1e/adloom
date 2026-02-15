-- CreateTable
CREATE TABLE "Timer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "textTemplate" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offerTitle" TEXT NOT NULL,
    "couponCode" TEXT NOT NULL,
    "description" TEXT,
    "style" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CouponProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "couponId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    CONSTRAINT "CouponProduct_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "overrideCents" BOOLEAN NOT NULL DEFAULT false,
    "discountStrategy" TEXT NOT NULL DEFAULT 'COMPARE_AT',
    "excludeDrafts" BOOLEAN NOT NULL DEFAULT false,
    "excludeOnSale" BOOLEAN NOT NULL DEFAULT false,
    "allowOverride" BOOLEAN NOT NULL DEFAULT false,
    "deactivationStrategy" TEXT NOT NULL DEFAULT 'RESTORE',
    "timerId" TEXT,
    "tagsToAdd" TEXT,
    "tagsToRemove" TEXT,
    CONSTRAINT "Sale_timerId_fkey" FOREIGN KEY ("timerId") REFERENCES "Timer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("createdAt", "discountType", "endTime", "id", "startTime", "status", "title", "updatedAt", "value") SELECT "createdAt", "discountType", "endTime", "id", "startTime", "status", "title", "updatedAt", "value" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
