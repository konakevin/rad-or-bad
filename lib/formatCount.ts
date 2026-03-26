/**
 * Formats a vote/count number for compact display.
 *
 * Examples:
 *   834      → "834"
 *   1,234    → "1.2k"
 *   9,950    → "10k"
 *   10,600   → "11k"
 *   234,000  → "234k"
 *   1,200,000 → "1.2m"
 *   10,000,000 → "10m"
 */
export function formatCount(n: number): string {
  if (n < 1_000) return String(n);

  if (n < 1_000_000) {
    const k = n / 1_000;
    // 1k–9.9k: 1 decimal; 10k+: whole number
    const formatted = k >= 10 ? String(Math.round(k)) : (Math.round(n / 100) / 10).toFixed(1).replace(/\.0$/, '');
    return `${formatted}k`;
  }

  const m = n / 1_000_000;
  // 1m–9.9m: 1 decimal; 10m+: whole number
  const formatted = m >= 10 ? String(Math.round(m)) : (Math.round(n / 100_000) / 10).toFixed(1).replace(/\.0$/, '');
  return `${formatted}m`;
}
