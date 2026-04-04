import { formatCompact } from '@/lib/formatNumber';

describe('formatCompact', () => {
  it('returns raw number under 1000', () => {
    expect(formatCompact(0)).toBe('0');
    expect(formatCompact(1)).toBe('1');
    expect(formatCompact(519)).toBe('519');
    expect(formatCompact(999)).toBe('999');
  });

  it('formats thousands with decimal', () => {
    expect(formatCompact(1000)).toBe('1k');
    expect(formatCompact(1500)).toBe('1.5k');
    expect(formatCompact(2300)).toBe('2.3k');
    expect(formatCompact(5000)).toBe('5k');
    expect(formatCompact(9999)).toBe('10k');
  });

  it('formats tens of thousands', () => {
    expect(formatCompact(10000)).toBe('10k');
    expect(formatCompact(25000)).toBe('25k');
    expect(formatCompact(999999)).toBe('1000k');
  });

  it('formats millions', () => {
    expect(formatCompact(1000000)).toBe('1M');
    expect(formatCompact(1500000)).toBe('1.5M');
    expect(formatCompact(10000000)).toBe('10M');
  });
});
