import { describe, expect, it } from 'vitest';
import {
  backupReminder,
  backupReminderText,
  compareEntries,
  filterForTab,
  formatSigned,
  groupByDate,
  nameWithQuantity,
  netReduction,
  netReductionLabel,
  normalizeQuantity,
  preselectedType,
  saldo,
  saldoStatus,
  suggestions,
  tabSummary,
  totals,
} from './calc';
import type { Entry, EntryType } from './types';

let seq = 0;
function entry(type: EntryType, name: string, quantity = 1, date = '2026-09-29', createdAt?: string): Entry {
  seq++;
  return {
    id: `id-${seq}`,
    type,
    name,
    quantity,
    date,
    createdAt: createdAt ?? `2026-09-29T10:00:${String(seq % 60).padStart(2, '0')}.000Z`,
  };
}

describe('Saldo und Summen', () => {
  it('zählt Mengen, nicht Zeilen; Ersatz zählt nicht', () => {
    const es = [entry('out', 'Kabel', 20), entry('out', 'Tasse', 3), entry('in', 'Hemd', 2), entry('replacement', 'Schuhe', 4)];
    expect(totals(es)).toEqual({ out: 23, in: 2, replacement: 4 });
    expect(saldo(es)).toBe(23 - 4);
    expect(netReduction(es)).toBe(21);
  });

  it('ist 0 ohne Einträge', () => {
    expect(saldo([])).toBe(0);
    expect(netReduction([])).toBe(0);
  });

  it('darf negativ werden', () => {
    expect(saldo([entry('in', 'Lampe', 3), entry('out', 'Kabel')])).toBe(-5);
  });

  it('Ersatz allein verändert nichts', () => {
    expect(saldo([entry('replacement', 'Wasserkocher', 5)])).toBe(0);
  });
});

describe('formatSigned', () => {
  it('nutzt + und typografisches Minus', () => {
    expect(formatSigned(29)).toBe('+29');
    expect(formatSigned(0)).toBe('0');
    expect(formatSigned(-6)).toBe('−6');
    expect(formatSigned(-6)).not.toContain('-');
  });
});

describe('Statustexte 4.1', () => {
  it('Guthaben mit Plural', () => {
    expect(saldoStatus(29, true)).toEqual({
      number: '+29',
      tone: 'positive',
      status: 'Budget: 29',
      subline: 'Reicht für 14 Neuanschaffungen',
    });
  });
  it('N = 1: reicht noch nicht', () => {
    expect(saldoStatus(1, true).subline).toBe('Reicht noch nicht für eine Neuanschaffung');
    expect(saldoStatus(1, true).status).toBe('Budget: 1');
  });
  it('floor(N/2) = 1: Singular', () => {
    expect(saldoStatus(2, true).subline).toBe('Reicht für 1 Neuanschaffung');
    expect(saldoStatus(3, true).subline).toBe('Reicht für 1 Neuanschaffung');
    expect(saldoStatus(4, true).subline).toBe('Reicht für 2 Neuanschaffungen');
  });
  it('ausgeglichen mit und ohne Einträge', () => {
    expect(saldoStatus(0, true)).toEqual({
      number: '0',
      tone: 'neutral',
      status: 'Ausgeglichen',
      subline: 'Nächste Anschaffung braucht zwei Ausgänge',
    });
    expect(saldoStatus(0, false).subline).toBe('Noch keine Einträge');
  });
  it('Rückstand mit Plural und Singular', () => {
    expect(saldoStatus(-6, true)).toEqual({
      number: '−6',
      tone: 'negative',
      status: 'Rückstand: 6',
      subline: '6 weitere Dinge müssen raus',
    });
    expect(saldoStatus(-1, true).subline).toBe('1 weiteres Ding muss raus');
    expect(saldoStatus(-1, true).status).toBe('Rückstand: 1');
  });
  it('Netto-Reduktion: weniger / mehr', () => {
    expect(netReductionLabel(46)).toEqual({ value: '46', label: 'Dinge weniger' });
    expect(netReductionLabel(0)).toEqual({ value: '0', label: 'Dinge weniger' });
    expect(netReductionLabel(-3)).toEqual({ value: '3', label: 'Dinge mehr' });
  });
});

describe('Vorausgewählter Typ 4.2', () => {
  it('Einträge-Tab Rein/Raus gewinnt', () => {
    expect(preselectedType({ screen: 'entries', tab: 'in' }, 'out')).toBe('in');
    expect(preselectedType({ screen: 'entries', tab: 'out' }, 'in')).toBe('out');
    expect(preselectedType({ screen: 'entries', tab: 'out' }, 'replacement')).toBe('out');
  });
  it('Alle, Saldo, Backup → lastUsedType', () => {
    expect(preselectedType({ screen: 'entries', tab: 'all' }, 'replacement')).toBe('replacement');
    expect(preselectedType({ screen: 'saldo' }, 'in')).toBe('in');
    expect(preselectedType({ screen: 'backup' }, 'out')).toBe('out');
  });
});

describe('Vorschläge 4.2', () => {
  const es = [
    ...Array.from({ length: 7 }, () => entry('out', 'Kabel')),
    entry('out', 'Kabelbinder'),
    entry('out', 'kabelbinder'),
    entry('out', 'Kabeltrommel'),
    entry('in', 'Netzkabel'),
    entry('in', 'Netzkabel'),
    entry('in', 'Netzkabel'),
    entry('in', 'Netzkabel'),
    entry('in', 'Netzkabel'),
    entry('in', 'Netzkabel'),
    entry('in', 'Netzkabel'),
    entry('in', 'Netzkabel'),
    entry('out', 'Tasse'),
  ];

  it('leer bei leerer Eingabe', () => {
    expect(suggestions(es, '')).toEqual([]);
    expect(suggestions(es, '  ')).toEqual([]);
  });

  it('Präfix vor Teiltreffer, dann Häufigkeit, case-insensitive dedupliziert', () => {
    const s = suggestions(es, 'kab');
    expect(s.map((x) => [x.name, x.count])).toEqual([
      ['Kabel', 7],
      ['kabelbinder', 2], // Gleichstand der Schreibweisen → zuletzt erfasste
      ['Kabeltrommel', 1],
      ['Netzkabel', 8],
    ]);
    expect(s[0]).toMatchObject({ matchStart: 0, matchLength: 3 });
    expect(s[3]).toMatchObject({ matchStart: 4, matchLength: 3 });
  });

  it('maximal 5', () => {
    const many = ['Aa', 'Ab', 'Ac', 'Ad', 'Ae', 'Af'].map((n) => entry('out', n));
    expect(suggestions(many, 'a')).toHaveLength(5);
  });

  it('zeigt die häufigste Schreibweise', () => {
    const e = [entry('out', 'kaffeetasse'), entry('out', 'Kaffeetasse'), entry('out', 'Kaffeetasse')];
    expect(suggestions(e, 'kaf')).toEqual([{ name: 'Kaffeetasse', count: 3, matchStart: 0, matchLength: 3 }]);
  });
});

describe('Listen 4.3', () => {
  it('sortiert nach Datum, dann createdAt absteigend', () => {
    const a = entry('out', 'A', 1, '2026-09-28', '2026-09-29T08:00:00.000Z');
    const b = entry('out', 'B', 1, '2026-09-29', '2026-09-29T07:00:00.000Z');
    const c = entry('out', 'C', 1, '2026-09-29', '2026-09-29T09:00:00.000Z');
    expect([a, b, c].sort(compareEntries).map((e) => e.name)).toEqual(['C', 'B', 'A']);
    const groups = groupByDate([a, b, c]);
    expect(groups.map((g) => [g.date, g.entries.map((e) => e.name)])).toEqual([
      ['2026-09-29', ['C', 'B']],
      ['2026-09-28', ['A']],
    ]);
  });

  it('filtert Tabs: Rein enthält Ersatz', () => {
    const es = [entry('out', 'A'), entry('in', 'B'), entry('replacement', 'C')];
    expect(filterForTab(es, 'all')).toHaveLength(3);
    expect(filterForTab(es, 'in').map((e) => e.name)).toEqual(['B', 'C']);
    expect(filterForTab(es, 'out').map((e) => e.name)).toEqual(['A']);
  });

  it('Summenzeile je Tab', () => {
    const t = { out: 63, in: 17, replacement: 4 };
    expect(tabSummary(t, 'all')).toEqual([
      { value: 63, label: 'raus' },
      { value: 17, label: 'rein' },
      { value: 4, label: 'Ersatz' },
    ]);
    expect(tabSummary(t, 'in')).toEqual([
      { value: 17, label: 'rein' },
      { value: 4, label: 'Ersatz' },
    ]);
    expect(tabSummary(t, 'out')).toEqual([{ value: 63, label: 'raus' }]);
  });

  it('Menge 1 ohne „× 1“', () => {
    expect(nameWithQuantity('Kabel', 20)).toBe('Kabel × 20');
    expect(nameWithQuantity('Kabel', 1)).toBe('Kabel');
  });
});

describe('Menge normalisieren', () => {
  it.each([
    ['', 1],
    ['0', 1],
    ['-3', 1],
    ['2.5', 1],
    ['abc', 1],
    ['12', 12],
    [' 7 ', 7],
  ])('%j → %i', (raw, expected) => {
    expect(normalizeQuantity(raw)).toBe(expected);
  });
});

describe('Backup-Hinweis 4.1', () => {
  const now = new Date(2026, 8, 29, 12, 0);
  const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 9, 0).toISOString();

  it('nicht ohne Einträge', () => {
    expect(backupReminder([], null, now)).toBeNull();
  });

  it('nie exportiert: Bezug ist ältester createdAt', () => {
    const recent = [entry('out', 'A', 1, '2026-09-20', at(2026, 9, 20))];
    expect(backupReminder(recent, null, now)).toBeNull();
    const old = [entry('out', 'A', 1, '2026-09-28', at(2026, 9, 28)), entry('out', 'B', 1, '2026-09-15', at(2026, 9, 15))];
    const r = backupReminder(old, null, now);
    expect(r).toEqual({ daysSinceExport: null });
    expect(backupReminderText(r!)).toBe('Noch kein Backup');
  });

  it('exportiert: ab 14 Tagen', () => {
    const es = [entry('out', 'A', 1, '2026-01-01', at(2026, 1, 1))];
    expect(backupReminder(es, at(2026, 9, 16), now)).toBeNull();
    const r = backupReminder(es, at(2026, 9, 15), now);
    expect(r).toEqual({ daysSinceExport: 14 });
    expect(backupReminderText(r!)).toBe('Letztes Backup vor 14 Tagen');
    expect(backupReminder(es, at(2026, 9, 6), now)).toEqual({ daysSinceExport: 23 });
  });
});
