/** Lowercase, strip everything except letters and digits. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Classic edit distance — how many single-character edits turn a into b. */
function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () =>
    new Array(cols).fill(0)
  );
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/** Splits a normalized string like "mth101" into { letters: "mth", digits: "101" }. */
function splitCode(normalized: string): { letters: string; digits: string } {
  const match = normalized.match(/^([a-z]*)(\d*)/);
  return { letters: match?.[1] ?? "", digits: match?.[2] ?? "" };
}

/**
 * True if `target` is a reasonable match for `query`, tolerating typos
 * and abbreviation differences (e.g. "math101" / "maths101" both match
 * "MTH101"). For course-code-shaped strings, the numeric part must
 * match exactly — "math101" should never match "MTH201".
 */
export function fuzzyMatch(query: string, target: string): boolean {
  const nq = normalize(query);
  const nt = normalize(target);
  if (!nq) return true;
  if (nt.includes(nq) || nq.includes(nt)) return true;

  const q = splitCode(nq);
  const t = splitCode(nt);

  if (q.digits && t.digits) {
    if (q.digits !== t.digits) return false;
    return levenshtein(q.letters, t.letters) <= 2;
  }

  const threshold = Math.max(1, Math.floor(Math.max(nq.length, nt.length) / 4));
  return levenshtein(nq, nt) <= threshold;
}
