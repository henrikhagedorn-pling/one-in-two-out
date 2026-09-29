import { describe, expect, it } from 'vitest';
import { formatDateField, formatDaysAgo, formatGroupHeading, formatRange, isValidISODate, todayISO } from './dates';

const now = new Date(2026, 8, 29, 14, 30); // Di, 29. Sep. 2026

describe('Datumsformate', () => {
  it('Datumsfeld im Sheet', () => {
    expect(formatDateField('2026-09-29', now)).toBe('Heute, 29. Sep.');
    expect(formatDateField('2026-09-28', now)).toBe('Gestern, 28. Sep.');
    expect(formatDateField('2026-09-25', now)).toBe('Fr, 25. Sep. 2026');
  });

  it('Gruppenüberschriften', () => {
    expect(formatGroupHeading('2026-09-29', now)).toBe('Heute');
    expect(formatGroupHeading('2026-09-28', now)).toBe('Gestern');
    expect(formatGroupHeading('2026-09-25', now)).toBe('Freitag, 25. September');
    expect(formatGroupHeading('2025-12-24', now)).toBe('Mittwoch, 24. Dezember 2025');
  });

  it('relative Tage', () => {
    expect(formatDaysAgo(0)).toBe('heute');
    expect(formatDaysAgo(1)).toBe('gestern');
    expect(formatDaysAgo(23)).toBe('vor 23 Tagen');
  });

  it('Zeitraum', () => {
    expect(formatRange('2026-07-14', '2026-09-06')).toBe('14. Juli – 6. Sep. 2026');
    expect(formatRange('2025-12-01', '2026-01-06')).toBe('1. Dez. 2025 – 6. Jan. 2026');
  });

  it('heute lokal und Datumsprüfung', () => {
    expect(todayISO(now)).toBe('2026-09-29');
    expect(isValidISODate('2026-02-28')).toBe(true);
    expect(isValidISODate('2026-02-29')).toBe(false);
    expect(isValidISODate('2028-02-29')).toBe(true);
    expect(isValidISODate('2026-13-02')).toBe(false);
    expect(isValidISODate('29.09.2026')).toBe(false);
  });
});
