import { describe, expect, it } from 'vitest';
import { backupFileName, CSV_HEADER, entriesToCsv, parseBackupCsv, parseCsvRecords } from './csv';
import type { Entry } from './types';

const sample: Entry[] = [
  {
    id: '6f1c2b1e-0000-4000-8000-000000000001',
    type: 'out',
    name: 'Kabel',
    quantity: 20,
    date: '2026-09-29',
    createdAt: '2026-09-29T08:12:00.000Z',
  },
  {
    id: '6f1c2b1e-0000-4000-8000-000000000002',
    type: 'in',
    name: 'Bücher; gebraucht',
    quantity: 2,
    date: '2026-09-28',
    createdAt: '2026-09-28T18:00:00.000Z',
  },
  {
    id: '6f1c2b1e-0000-4000-8000-000000000003',
    type: 'replacement',
    name: 'Wasserkocher „Retro" 1,7 l',
    quantity: 1,
    date: '2026-09-25',
    createdAt: '2026-09-29T07:00:00.000Z',
  },
  {
    id: '6f1c2b1e-0000-4000-8000-000000000004',
    type: 'out',
    name: 'Größe "XL" Übergangsjacke',
    quantity: 1,
    date: '2026-07-14',
    createdAt: '2026-07-14T10:00:00.000Z',
  },
];

const byId = (a: Entry, b: Entry) => a.id.localeCompare(b.id);

describe('CSV-Export', () => {
  it('Dateiname', () => {
    expect(backupFileName(new Date(2026, 8, 6))).toBe('1in2out-backup-2026-09-06.csv');
  });

  it('BOM, Kopfzeile, Semikolon, Typ-Mapping', () => {
    const csv = entriesToCsv(sample);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe(CSV_HEADER);
    expect(lines[0]).toBe('id;typ;name;menge;datum;erstellt_am');
    // älteste zuerst
    expect(lines[1]).toBe('6f1c2b1e-0000-4000-8000-000000000004;raus;"Größe ""XL"" Übergangsjacke";1;2026-07-14;2026-07-14T10:00:00.000Z');
    expect(lines).toContain('6f1c2b1e-0000-4000-8000-000000000002;rein;"Bücher; gebraucht";2;2026-09-28;2026-09-28T18:00:00.000Z');
    expect(lines).toContain('6f1c2b1e-0000-4000-8000-000000000001;raus;Kabel;20;2026-09-29;2026-09-29T08:12:00.000Z');
    expect(csv).toContain(';ersatz;');
  });

  it('leerer Bestand: nur Kopfzeile', () => {
    expect(entriesToCsv([])).toBe('﻿' + CSV_HEADER + '\r\n');
  });
});

describe('CSV-Parser', () => {
  it('Escaping mit Anführungszeichen, Semikolon und Zeilenumbruch', () => {
    const recs = parseCsvRecords('a;"b;c";"d ""e"""\r\n"x\ny";z;\n');
    expect(recs).toEqual([
      ['a', 'b;c', 'd "e"'],
      ['x\ny', 'z', ''],
    ]);
  });
});

describe('Round-Trip', () => {
  it('Export → Import ist verlustfrei', () => {
    const result = parseBackupCsv(entriesToCsv(sample));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.total).toBe(4);
    expect([...result.entries].sort(byId)).toEqual([...sample].sort(byId));
    expect(result.stats).toEqual({ out: 2, in: 1, replacement: 1 });
    expect(result.range).toEqual({ from: '2026-07-14', to: '2026-09-29' });
  });

  it('funktioniert ohne BOM, mit LF und mit Komma-Trennzeichen', () => {
    const csv = entriesToCsv(sample).slice(1).replace(/\r\n/g, '\n');
    const r1 = parseBackupCsv(csv);
    expect(r1.ok && r1.entries.length).toBe(4);

    const comma = [
      'id,typ,name,menge,datum,erstellt_am',
      'a1,raus,"Tasse, blau",3,2026-09-01,2026-09-01T10:00:00.000Z',
    ].join('\n');
    const r2 = parseBackupCsv(comma);
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.entries[0].name).toBe('Tasse, blau');
  });

  it('doppelter Export ist stabil', () => {
    const once = entriesToCsv(sample);
    const r = parseBackupCsv(once);
    expect(r.ok && entriesToCsv(r.entries)).toBe(once);
  });
});

describe('Import-Validierung', () => {
  const head = CSV_HEADER + '\n';
  const row = (fields: string[]) => fields.join(';') + '\n';
  const valid = ['a1', 'raus', 'Kabel', '2', '2026-09-01', '2026-09-01T10:00:00.000Z'];

  it('meldet Fehler mit Zeilennummern wie in Numbers', () => {
    const csv =
      head +
      row(valid) +
      row(['a2', 'raus', 'Tasse', 'zwei', '2026-09-01', '2026-09-01T10:00:00.000Z']) +
      row(['a3', 'weg', 'Tasse', '1', '2026-09-01', '2026-09-01T10:00:00.000Z']) +
      row(['a4', 'rein', 'Tasse', '1', '2026-13-02', '2026-09-01T10:00:00.000Z']);
    const r = parseBackupCsv(csv);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.total).toBe(4);
    expect(r.errors).toEqual([
      { line: 3, messages: ['menge „zwei“ ist keine ganze Zahl ≥ 1'] },
      { line: 4, messages: ['typ „weg“ unbekannt – erlaubt: rein, raus, ersatz'] },
      { line: 5, messages: ['datum „2026-13-02“ ist kein gültiges Datum'] },
    ]);
  });

  it('leerer Name, doppelte id, falsche Spaltenzahl', () => {
    const csv =
      head +
      row(valid) +
      row(['a2', 'raus', '  ', '1', '2026-09-01', '2026-09-01T10:00:00.000Z']) +
      row(valid) +
      row(['a5', 'raus', 'Tasse', '1', '2026-09-01']);
    const r = parseBackupCsv(csv);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual([
      { line: 3, messages: ['name ist leer'] },
      { line: 4, messages: ['id „a1“ doppelt (auch in Zeile 2)'] },
      { line: 5, messages: ['falsche Spaltenzahl: 5 statt 6'] },
    ]);
  });

  it('falsche Kopfzeile', () => {
    const r = parseBackupCsv('id;type;name;menge;datum;erstellt_am\n' + row(valid));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0].line).toBe(1);
    expect(r.errors[0].messages[0]).toMatch(/Kopfzeile/);
  });

  it('Menge 0, negativ, Dezimal; ungültiger Zeitstempel; 29. Februar', () => {
    const csv =
      head +
      row(['b1', 'raus', 'A', '0', '2026-09-01', '2026-09-01T10:00:00.000Z']) +
      row(['b2', 'raus', 'A', '-1', '2026-09-01', '2026-09-01T10:00:00.000Z']) +
      row(['b3', 'raus', 'A', '1.5', '2026-02-29', 'gestern']) +
      row(['b4', 'raus', 'A', '1', '2028-02-29', '2028-02-29T10:00:00+01:00']);
    const r = parseBackupCsv(csv);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.map((e) => e.line)).toEqual([2, 3, 4]);
    expect(r.errors[2].messages).toEqual([
      'menge „1.5“ ist keine ganze Zahl ≥ 1',
      'datum „2026-02-29“ ist kein gültiges Datum',
      'erstellt_am „gestern“ ist kein gültiger Zeitstempel',
    ]);
  });

  it('leere Datei und nur Kopfzeile', () => {
    expect(parseBackupCsv('').ok).toBe(false);
    const r = parseBackupCsv('﻿' + CSV_HEADER + '\r\n');
    expect(r).toEqual({ ok: true, total: 0, entries: [], stats: { out: 0, in: 0, replacement: 0 }, range: null });
  });

  it('Leerzeilen am Ende werden ignoriert', () => {
    const r = parseBackupCsv(head + row(valid) + '\n\n');
    expect(r.ok && r.total).toBe(1);
  });
});
