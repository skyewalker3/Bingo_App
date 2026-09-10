export const LETTERS = ['B', 'I', 'N', 'G', 'O'] as const;
export const RANGES: [number, number][] = [
  [1, 15],
  [16, 30],
  [31, 45],
  [46, 60],
  [61, 75],
];
export const COL_CLASSES = ['col-b', 'col-i', 'col-n', 'col-g', 'col-o'] as const;

export function letterFor(n: number): string {
  for (let i = 0; i < RANGES.length; i++) {
    const [start, end] = RANGES[i];
    if (n >= start && n <= end) return LETTERS[i];
  }
  return '';
}
