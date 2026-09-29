export type EntryType = 'in' | 'out' | 'replacement';

export interface Entry {
  id: string;
  type: EntryType;
  /** getrimmt, nicht leer */
  name: string;
  /** Integer ≥ 1 */
  quantity: number;
  /** YYYY-MM-DD (lokale Zeit) */
  date: string;
  /** ISO-Timestamp, für stabile Sortierung */
  createdAt: string;
}

export interface Meta {
  lastExportAt: string | null;
  lastUsedType: EntryType;
}

export const DEFAULT_META: Meta = {
  lastExportAt: null,
  lastUsedType: 'out',
};

export type EntriesTab = 'all' | 'in' | 'out';
