/**
 * Abbreviate large numbers for compact display.
 * 999 → "999", 1000 → "1k", 1500 → "1.5k", 10000 → "10k", 1000000 → "1M"
 */
export function formatCompact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) {
    const k = n / 1000;
    const formatted = k % 1 === 0 ? String(k) : k.toFixed(1).replace(/\.0$/, '');
    return `${formatted}k`;
  }
  if (n < 1000000) return `${Math.round(n / 1000)}k`;
  const m = n / 1000000;
  return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
}
