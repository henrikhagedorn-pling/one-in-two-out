// Datumshilfen. Alle Kalendertage in lokaler Zeit, Format YYYY-MM-DD.

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/** Prüft YYYY-MM-DD strikt (inkl. Monatslänge, Schaltjahr). */
export function isValidISODate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1) return false;
  return d <= new Date(y, mo, 0).getDate();
}

/** YYYY-MM-DD → lokales Date (Mitternacht). */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Ganze Kalendertage von `from` bis `to` (lokal). */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

// Neuere ICU-Versionen kürzen September als „Sept.“, Safari als „Sep.“. Spec: „Sep.“
const fmt = (opts: Intl.DateTimeFormatOptions) => {
  const f = new Intl.DateTimeFormat('de-DE', opts);
  return { format: (d: Date) => f.format(d).replace('Sept.', 'Sep.') };
};
const fDayShortMonth = fmt({ day: 'numeric', month: 'short' });
const fWeekdayShortFull = fmt({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fWeekdayLong = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const fWeekdayLongYear = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fLongDate = fmt({ day: 'numeric', month: 'long', year: 'numeric' });
const fShortDate = fmt({ day: 'numeric', month: 'short', year: 'numeric' });

// Intl liefert „Fr.“ für Wochentage; im Design steht „Fr“.
const stripWeekdayDot = (s: string) => s.replace(/^(\p{L}{2})\.,/u, '$1,');

/** Datumsfeld im Eingabe-Sheet: „Heute, 29. Sep.“, „Gestern, 28. Sep.“, sonst „Fr, 25. Sep. 2026“. */
export function formatDateField(iso: string, now: Date = new Date()): string {
  const d = parseISODate(iso);
  const diff = daysBetween(d, now);
  if (diff === 0) return `Heute, ${fDayShortMonth.format(d)}`;
  if (diff === 1) return `Gestern, ${fDayShortMonth.format(d)}`;
  return stripWeekdayDot(fWeekdayShortFull.format(d));
}

/** Gruppenüberschrift in Listen: „Heute“, „Gestern“, „Freitag, 25. September“ (Jahr nur, wenn nicht laufendes Jahr). Uppercase macht CSS. */
export function formatGroupHeading(iso: string, now: Date = new Date()): string {
  const d = parseISODate(iso);
  const diff = daysBetween(d, now);
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Gestern';
  return d.getFullYear() === now.getFullYear() ? fWeekdayLong.format(d) : fWeekdayLongYear.format(d);
}

/** „6. September 2026“ */
export function formatLongDate(d: Date): string {
  return fLongDate.format(d);
}

/** Relative Angabe für das letzte Backup: „heute“, „gestern“, „vor 23 Tagen“. */
export function formatDaysAgo(days: number): string {
  if (days <= 0) return 'heute';
  if (days === 1) return 'gestern';
  return `vor ${days} Tagen`;
}

/** Zeitraum für die Import-Prüfung: „14. Juli – 6. Sep. 2026“. */
export function formatRange(fromIso: string, toIso: string): string {
  const a = parseISODate(fromIso);
  const b = parseISODate(toIso);
  if (fromIso === toIso) return fShortDate.format(b);
  const left = a.getFullYear() === b.getFullYear() ? fDayShortMonth.format(a) : fShortDate.format(a);
  return `${left} – ${fShortDate.format(b)}`;
}
