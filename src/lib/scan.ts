export type HeatClass = 'hot' | 'warm' | 'cold';

// Ported verbatim from the legacy app's renderScanResults classification.
export function classifyCount(cnt: number, median: number, maxCount: number): HeatClass {
  if (maxCount > 0 && cnt >= Math.max(1, median + 1) && cnt === maxCount) return 'hot';
  if (maxCount > 0 && cnt > median) return 'hot';
  if (cnt === 0 || cnt < median) return 'cold';
  return 'warm';
}

export function medianOf(counts: number[]): number {
  const sorted = [...counts].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
