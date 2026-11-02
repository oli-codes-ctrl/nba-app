/**
 * Accent-insensitive search key. Must match fold_name() in
 * pipeline/hoops_pipeline/aggregate.py, which produces `searchName`.
 */
const EXTRA_FOLDS: Record<string, string> = {
  đ: 'd', Đ: 'D', ø: 'o', Ø: 'O', ł: 'l', Ł: 'L', ß: 'ss', æ: 'ae', Æ: 'AE', ı: 'i',
};

export function fold(text: string): string {
  const mapped = Array.from(text, (ch) => EXTRA_FOLDS[ch] ?? ch).join('');
  return mapped
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}
