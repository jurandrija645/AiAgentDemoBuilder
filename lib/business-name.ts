/**
 * Legal-entity suffixes, stripped from the end of a business name.
 *
 * These belong on an invoice, not in "Talk to <name>, instantly." Nobody says
 * "call AYR Services Inc." out loud, and the headline reads as boilerplate with
 * it attached. Matched only at the end of the name so a company genuinely
 * called e.g. "Co-op Energy" is untouched.
 */
const LEGAL_SUFFIXES = [
  "incorporated",
  "inc",
  "limited liability company",
  "llc",
  "l\\.l\\.c",
  "limited",
  "ltd",
  "corporation",
  "corp",
  "company",
  "plc",
  "llp",
  "gmbh",
  "mbh",
  "ag",
  "b\\.v",
  "bv",
  "n\\.v",
  "nv",
  "s\\.l",
  "sl",
  "s\\.a",
  "sa",
  "s\\.r\\.l",
  "srl",
  "a/s",
  "aps",
  "oy",
  "pty",
  "pte",
];

// Trailing suffix, optionally preceded by a comma and followed by a period.
const SUFFIX_PATTERN = new RegExp(`[\\s,]+(?:${LEGAL_SUFFIXES.join("|")})\\.?\\s*$`, "i");

/**
 * Tidy a scraped or hand-passed business name for display: drop the legal
 * suffix and collapse whitespace. Runs repeatedly so "Foo Holdings Ltd Inc."
 * loses both.
 */
export function normalizeBusinessName(name: string): string {
  let out = name.replace(/\s+/g, " ").trim();

  let previous: string;
  do {
    previous = out;
    out = out.replace(SUFFIX_PATTERN, "").trim();
  } while (out !== previous && out.length > 0);

  // Never strip a name down to nothing — a company literally called "Ltd"
  // keeps its name.
  return out || name.replace(/\s+/g, " ").trim();
}
