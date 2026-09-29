import { daysBetween } from './dates';
import type { Entry, EntriesTab, EntryType } from './types';

// ---------- Summen (Abschnitt 3) ----------

export interface Totals {
  in: number;
  out: number;
  replacement: number;
}

export function totals(entries: readonly Entry[]): Totals {
  const t: Totals = { in: 0, out: 0, replacement: 0 };
  for (const e of entries) t[e.type] += e.quantity;
  return t;
}

/** Σ out − 2 × Σ in (Ersatz zählt nicht) */
export function saldo(entries: readonly Entry[]): number {
  const t = totals(entries);
  return t.out - 2 * t.in;
}

/** Σ out − Σ in (Ersatz zählt nicht) */
export function netReduction(entries: readonly Entry[]): number {
  const t = totals(entries);
  return t.out - t.in;
}

/** Saldo-Beitrag eines einzelnen Eintrags. */
export function saldoDelta(type: EntryType, quantity: number): number {
  if (type === 'out') return quantity;
  if (type === 'in') return -2 * quantity;
  return 0;
}

// ---------- Zahlen ----------

export const MINUS = '−';

/** Saldo-Darstellung: „+29“, „0“, „−6“ (typografisches Minus). */
export function formatSigned(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `${MINUS}${Math.abs(n)}`;
  return '0';
}

// ---------- Status-Texte Saldo (4.1) ----------

export type SaldoTone = 'positive' | 'negative' | 'neutral';

export interface SaldoStatus {
  number: string;
  tone: SaldoTone;
  status: string;
  subline: string;
}

export function saldoStatus(value: number, hasEntries: boolean): SaldoStatus {
  if (value > 0) {
    const n = Math.floor(value / 2);
    const subline =
      n === 0
        ? 'Reicht noch nicht für eine Neuanschaffung'
        : n === 1
          ? 'Reicht für 1 Neuanschaffung'
          : `Reicht für ${n} Neuanschaffungen`;
    return { number: formatSigned(value), tone: 'positive', status: `Budget: ${value}`, subline };
  }
  if (value < 0) {
    const n = Math.abs(value);
    const subline = n === 1 ? '1 weiteres Ding muss raus' : `${n} weitere Dinge müssen raus`;
    return { number: formatSigned(value), tone: 'negative', status: `Rückstand: ${n}`, subline };
  }
  return {
    number: '0',
    tone: 'neutral',
    status: 'Ausgeglichen',
    subline: hasEntries ? 'Nächste Anschaffung braucht zwei Ausgänge' : 'Noch keine Einträge',
  };
}

/** Netto-Reduktion: Wert + „Dinge weniger“, bei negativem Wert Betrag + „Dinge mehr“. */
export function netReductionLabel(value: number): { value: string; label: string } {
  if (value < 0) return { value: String(Math.abs(value)), label: 'Dinge mehr' };
  return { value: String(value), label: 'Dinge weniger' };
}

// ---------- Vorausgewählter Typ (4.2) ----------

export type SheetOrigin = { screen: 'saldo' } | { screen: 'backup' } | { screen: 'entries'; tab: EntriesTab };

export function preselectedType(origin: SheetOrigin, lastUsedType: EntryType): EntryType {
  if (origin.screen === 'entries') {
    if (origin.tab === 'in') return 'in';
    if (origin.tab === 'out') return 'out';
  }
  return lastUsedType;
}

// ---------- Vorschläge (4.2) ----------

export interface Suggestion {
  name: string;
  count: number;
  /** Position des Treffers im Namen, für Fettung */
  matchStart: number;
  matchLength: number;
}

/**
 * Vorschläge ab dem ersten Zeichen. Namen case-insensitive dedupliziert,
 * Präfix-Treffer vor Teiltreffern, darin nach Häufigkeit absteigend. Max. 5.
 * Angezeigte Schreibweise: die häufigste, bei Gleichstand die zuletzt erfasste.
 * Häufigkeit = Anzahl Einträge (nicht Menge).
 */
export function suggestions(entries: readonly Entry[], query: string, limit = 5): Suggestion[] {
  const q = query.trim().toLocaleLowerCase('de-DE');
  if (!q) return [];

  interface Group {
    count: number;
    variants: Map<string, { count: number; latest: string }>;
  }
  const groups = new Map<string, Group>();
  for (const e of entries) {
    const key = e.name.toLocaleLowerCase('de-DE');
    let g = groups.get(key);
    if (!g) {
      g = { count: 0, variants: new Map() };
      groups.set(key, g);
    }
    g.count++;
    const v = g.variants.get(e.name);
    if (!v) g.variants.set(e.name, { count: 1, latest: e.createdAt });
    else {
      v.count++;
      if (e.createdAt > v.latest) v.latest = e.createdAt;
    }
  }

  const result: (Suggestion & { prefix: boolean })[] = [];
  for (const [key, g] of groups) {
    const idx = key.indexOf(q);
    if (idx < 0) continue;
    let best = '';
    let bestCount = -1;
    let bestLatest = '';
    for (const [name, v] of g.variants) {
      if (v.count > bestCount || (v.count === bestCount && v.latest > bestLatest)) {
        best = name;
        bestCount = v.count;
        bestLatest = v.latest;
      }
    }
    result.push({ name: best, count: g.count, matchStart: idx, matchLength: q.length, prefix: idx === 0 });
  }

  result.sort((a, b) => {
    if (a.prefix !== b.prefix) return a.prefix ? -1 : 1;
    if (a.count !== b.count) return b.count - a.count;
    return a.name.localeCompare(b.name, 'de-DE');
  });

  return result.slice(0, limit).map(({ prefix: _prefix, ...s }) => s);
}

// ---------- Sortierung und Gruppierung (4.3) ----------

/** neueste zuerst: date absteigend, bei gleichem Datum createdAt absteigend */
export function compareEntries(a: Entry, b: Entry): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return 0;
}

export function filterForTab(entries: readonly Entry[], tab: EntriesTab): Entry[] {
  if (tab === 'in') return entries.filter((e) => e.type === 'in' || e.type === 'replacement');
  if (tab === 'out') return entries.filter((e) => e.type === 'out');
  return [...entries];
}

export interface DateGroup {
  date: string;
  entries: Entry[];
}

export function groupByDate(entries: readonly Entry[]): DateGroup[] {
  const sorted = [...entries].sort(compareEntries);
  const groups: DateGroup[] = [];
  for (const e of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) last.entries.push(e);
    else groups.push({ date: e.date, entries: [e] });
  }
  return groups;
}

// ---------- Backup-Hinweis (4.1) ----------

export const BACKUP_REMINDER_DAYS = 14;

/**
 * Bezugszeitpunkt: lastExportAt, sonst createdAt des ältesten Eintrags.
 * Gibt die Tage seit Bezug zurück, wenn der Hinweis erscheinen soll, sonst null.
 */
export function backupReminder(
  entries: readonly Entry[],
  lastExportAt: string | null,
  now: Date = new Date(),
): { daysSinceExport: number | null } | null {
  if (entries.length === 0) return null;
  let ref: string;
  if (lastExportAt) ref = lastExportAt;
  else {
    ref = entries[0].createdAt;
    for (const e of entries) if (e.createdAt < ref) ref = e.createdAt;
  }
  const days = daysBetween(new Date(ref), now);
  if (days < BACKUP_REMINDER_DAYS) return null;
  return { daysSinceExport: lastExportAt ? days : null };
}

export function backupReminderText(r: { daysSinceExport: number | null }): string {
  return r.daysSinceExport === null ? 'Noch kein Backup' : `Letztes Backup vor ${r.daysSinceExport} Tagen`;
}

// ---------- Texte ----------

export const TYPE_LABEL: Record<EntryType, string> = { in: 'Rein', out: 'Raus', replacement: 'Ersatz' };
export const TYPE_VERB: Record<EntryType, string> = { in: 'rein', out: 'raus', replacement: 'Ersatz' };
export const PLACEHOLDER: Record<EntryType, string> = {
  in: 'Was kommt rein?',
  out: 'Was geht raus?',
  replacement: 'Was wird ersetzt?',
};

/** „Kabel × 20“, bei Menge 1 nur „Kabel“. */
export function nameWithQuantity(name: string, quantity: number): string {
  return quantity === 1 ? name : `${name} × ${quantity}`;
}

/** Summenzeile unter den Einträge-Tabs */
export function tabSummary(t: Totals, tab: EntriesTab): { value: number; label: string }[] {
  if (tab === 'in')
    return [
      { value: t.in, label: 'rein' },
      { value: t.replacement, label: 'Ersatz' },
    ];
  if (tab === 'out') return [{ value: t.out, label: 'raus' }];
  return [
    { value: t.out, label: 'raus' },
    { value: t.in, label: 'rein' },
    { value: t.replacement, label: 'Ersatz' },
  ];
}

/** Menge aus Freitext normalisieren: ungültig (leer, < 1, keine Ganzzahl) → 1 */
export function normalizeQuantity(raw: string): number {
  const s = raw.trim();
  if (!/^\d+$/.test(s)) return 1;
  const n = Number(s);
  return Number.isSafeInteger(n) && n >= 1 ? n : 1;
}

export function daysSince(iso: string, now: Date = new Date()): number {
  return daysBetween(new Date(iso), now);
}

