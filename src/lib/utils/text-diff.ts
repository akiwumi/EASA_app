export type DiffToken = { text: string; type: "equal" | "insert" | "delete" };

function lcs(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function backtrack(dp: number[][], a: string[], b: string[], i: number, j: number, out: DiffToken[]) {
  if (i === 0 && j === 0) return;
  if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
    backtrack(dp, a, b, i - 1, j - 1, out);
    out.push({ text: a[i - 1], type: "equal" });
  } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
    backtrack(dp, a, b, i, j - 1, out);
    out.push({ text: b[j - 1], type: "insert" });
  } else {
    backtrack(dp, a, b, i - 1, j, out);
    out.push({ text: a[i - 1], type: "delete" });
  }
}

export function diffLines(oldText: string, newText: string): DiffToken[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const dp = lcs(a, b);
  const tokens: DiffToken[] = [];
  backtrack(dp, a, b, a.length, b.length, tokens);
  return tokens;
}

export function hasChanges(tokens: DiffToken[]): boolean {
  return tokens.some((t) => t.type !== "equal");
}
