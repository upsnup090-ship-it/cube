import { customAlphabet } from "nanoid";

/**
 * Public game code — what users see and share in Telegram.
 *
 * Design choices:
 *
 * - Length 8 → ~31^8 ≈ 8.5e11 unique codes. With Prisma's UNIQUE constraint
 *   the birthday-collision rate becomes negligible until you have hundreds
 *   of millions of active codes. Compare to the previous Date.now()+4-char
 *   suffix scheme which gave only ~36^4 ≈ 1.7M variants per millisecond
 *   and caused a real collision risk under load.
 *
 * - Alphabet excludes ambiguous characters (`0/O`, `1/I/L`) so users can
 *   read codes aloud or type them from screenshots without confusion.
 *
 * - Prefix `G` (for "Game") is preserved from the previous format so any
 *   existing UX/QA materials referring to G-codes stay valid.
 */

const SAFE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;

const generate = customAlphabet(SAFE_ALPHABET, CODE_LENGTH);

export function createPublicCode(): string {
  return `G${generate()}`;
}

/**
 * Run an async operation that creates a row keyed by a freshly-generated
 * `publicCode`. If the unique constraint fires (Prisma error code `P2002`),
 * regenerate and try again up to `maxAttempts` times.
 *
 * Used by `GameService.createGame` so that an extremely unlikely collision
 * does not surface as an error to the caller.
 */
export async function withPublicCodeRetry<T>(
  attempt: (publicCode: string) => Promise<T>,
  maxAttempts = 5,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await attempt(createPublicCode());
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      lastError = error;
    }
  }
  throw new Error(
    `Failed to generate unique publicCode after ${maxAttempts} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: string };
  return candidate.code === "P2002";
}
