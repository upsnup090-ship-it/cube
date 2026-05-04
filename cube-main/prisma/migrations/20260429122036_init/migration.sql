/*
  Warnings:

  - You are about to alter the column `betAmount` on the `Game` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `escrowLockedAmount` on the `GamePlayer` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `amount` on the `LedgerEntry` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `responsibleLimitPerDay` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `availableBalance` on the `Wallet` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `lockedBalance` on the `Wallet` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - Made the column `idempotencyKey` on table `LedgerEntry` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AuditLog" ("action", "actorId", "actorType", "createdAt", "id", "metadata", "resourceId", "resourceType") SELECT "action", "actorId", "actorType", "createdAt", "id", "metadata", "resourceId", "resourceType" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_resourceType_idx" ON "AuditLog"("resourceType");
CREATE INDEX "AuditLog_resourceId_idx" ON "AuditLog"("resourceId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE TABLE "new_DiceRoll" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "rollRound" INTEGER NOT NULL,
    "telegramChatId" TEXT,
    "telegramMessageId" TEXT,
    "diceEmoji" TEXT NOT NULL DEFAULT '🎲',
    "diceValue" INTEGER NOT NULL,
    "diceCount" INTEGER NOT NULL,
    "totalValue" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "rawPayload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiceRoll_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DiceRoll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DiceRoll" ("createdAt", "diceCount", "diceEmoji", "diceValue", "gameId", "id", "rawPayload", "rollRound", "source", "telegramChatId", "telegramMessageId", "totalValue", "userId") SELECT "createdAt", "diceCount", "diceEmoji", "diceValue", "gameId", "id", "rawPayload", "rollRound", "source", "telegramChatId", "telegramMessageId", "totalValue", "userId" FROM "DiceRoll";
DROP TABLE "DiceRoll";
ALTER TABLE "new_DiceRoll" RENAME TO "DiceRoll";
CREATE INDEX "DiceRoll_gameId_idx" ON "DiceRoll"("gameId");
CREATE INDEX "DiceRoll_userId_idx" ON "DiceRoll"("userId");
CREATE INDEX "DiceRoll_createdAt_idx" ON "DiceRoll"("createdAt");
CREATE TABLE "new_Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publicCode" TEXT NOT NULL,
    "creatorUserId" INTEGER NOT NULL,
    "opponentUserId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'created',
    "betAmount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COIN',
    "diceCount" INTEGER NOT NULL,
    "winnerUserId" INTEGER,
    "loserUserId" INTEGER,
    "resultReason" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "settledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Game_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Game_opponentUserId_fkey" FOREIGN KEY ("opponentUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Game" ("betAmount", "createdAt", "creatorUserId", "currency", "diceCount", "expiresAt", "id", "loserUserId", "opponentUserId", "publicCode", "resultReason", "settledAt", "status", "updatedAt", "winnerUserId") SELECT "betAmount", "createdAt", "creatorUserId", "currency", "diceCount", "expiresAt", "id", "loserUserId", "opponentUserId", "publicCode", "resultReason", "settledAt", "status", "updatedAt", "winnerUserId" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE UNIQUE INDEX "Game_publicCode_key" ON "Game"("publicCode");
CREATE INDEX "Game_creatorUserId_idx" ON "Game"("creatorUserId");
CREATE INDEX "Game_opponentUserId_idx" ON "Game"("opponentUserId");
CREATE INDEX "Game_status_idx" ON "Game"("status");
CREATE INDEX "Game_createdAt_idx" ON "Game"("createdAt");
CREATE TABLE "new_GamePlayer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "escrowLockedAmount" BIGINT NOT NULL DEFAULT 0,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" DATETIME,
    CONSTRAINT "GamePlayer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GamePlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GamePlayer" ("cancelledAt", "escrowLockedAmount", "gameId", "id", "joinedAt", "role", "userId") SELECT "cancelledAt", "escrowLockedAmount", "gameId", "id", "joinedAt", "role", "userId" FROM "GamePlayer";
DROP TABLE "GamePlayer";
ALTER TABLE "new_GamePlayer" RENAME TO "GamePlayer";
CREATE INDEX "GamePlayer_gameId_idx" ON "GamePlayer"("gameId");
CREATE INDEX "GamePlayer_userId_idx" ON "GamePlayer"("userId");
CREATE UNIQUE INDEX "GamePlayer_gameId_userId_key" ON "GamePlayer"("gameId", "userId");
CREATE TABLE "new_IdempotencyKey" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "operation" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "responseSnapshot" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_IdempotencyKey" ("createdAt", "key", "operation", "resourceId", "resourceType", "responseSnapshot") SELECT "createdAt", "key", "operation", "resourceId", "resourceType", "responseSnapshot" FROM "IdempotencyKey";
DROP TABLE "IdempotencyKey";
ALTER TABLE "new_IdempotencyKey" RENAME TO "IdempotencyKey";
CREATE INDEX "IdempotencyKey_resourceId_idx" ON "IdempotencyKey"("resourceId");
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");
CREATE TABLE "new_LedgerEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transactionId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "walletId" INTEGER NOT NULL,
    "gameId" INTEGER,
    "entryType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COIN',
    "idempotencyKey" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LedgerEntry_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LedgerEntry" ("amount", "createdAt", "currency", "direction", "entryType", "gameId", "id", "idempotencyKey", "metadata", "transactionId", "userId", "walletId") SELECT "amount", "createdAt", "currency", "direction", "entryType", "gameId", "id", "idempotencyKey", "metadata", "transactionId", "userId", "walletId" FROM "LedgerEntry";
DROP TABLE "LedgerEntry";
ALTER TABLE "new_LedgerEntry" RENAME TO "LedgerEntry";
CREATE UNIQUE INDEX "LedgerEntry_idempotencyKey_key" ON "LedgerEntry"("idempotencyKey");
CREATE INDEX "LedgerEntry_userId_idx" ON "LedgerEntry"("userId");
CREATE INDEX "LedgerEntry_walletId_idx" ON "LedgerEntry"("walletId");
CREATE INDEX "LedgerEntry_gameId_idx" ON "LedgerEntry"("gameId");
CREATE INDEX "LedgerEntry_transactionId_idx" ON "LedgerEntry"("transactionId");
CREATE INDEX "LedgerEntry_idempotencyKey_idx" ON "LedgerEntry"("idempotencyKey");
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegramUserId" TEXT NOT NULL,
    "username" TEXT,
    "displayName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "regionCode" TEXT,
    "ageConfirmed" BOOLEAN DEFAULT false,
    "responsibleLimitPerDay" BIGINT DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("ageConfirmed", "createdAt", "displayName", "id", "regionCode", "responsibleLimitPerDay", "status", "telegramUserId", "updatedAt", "username") SELECT "ageConfirmed", "createdAt", "displayName", "id", "regionCode", "responsibleLimitPerDay", "status", "telegramUserId", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_telegramUserId_key" ON "User"("telegramUserId");
CREATE INDEX "User_telegramUserId_idx" ON "User"("telegramUserId");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE TABLE "new_Wallet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COIN',
    "availableBalance" BIGINT NOT NULL DEFAULT 0,
    "lockedBalance" BIGINT NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Wallet" ("availableBalance", "createdAt", "currency", "id", "lockedBalance", "updatedAt", "userId", "version") SELECT "availableBalance", "createdAt", "currency", "id", "lockedBalance", "updatedAt", "userId", "version" FROM "Wallet";
DROP TABLE "Wallet";
ALTER TABLE "new_Wallet" RENAME TO "Wallet";
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
