import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { deleteEntry, loadAll, putEntry, replaceAllEntries, setMeta } from './db';
import type { Entry } from './types';

const e = (id: string): Entry => ({
  id,
  type: 'out',
  name: `Ding ${id}`,
  quantity: 1,
  date: '2026-09-29',
  createdAt: '2026-09-29T10:00:00.000Z',
});

describe('IndexedDB-Speicher', () => {
  it('Defaults, Speichern, Löschen, Ersetzen', async () => {
    expect(await loadAll()).toEqual({ entries: [], meta: { lastExportAt: null, lastUsedType: 'out' } });

    await putEntry(e('a'));
    await putEntry(e('b'));
    await deleteEntry('a');
    await setMeta('lastUsedType', 'in');
    await setMeta('lastExportAt', '2026-09-29T10:00:00.000Z');
    let s = await loadAll();
    expect(s.entries.map((x) => x.id)).toEqual(['b']);
    expect(s.meta).toEqual({ lastExportAt: '2026-09-29T10:00:00.000Z', lastUsedType: 'in' });

    await replaceAllEntries([e('x'), e('y')]);
    s = await loadAll();
    expect(s.entries.map((x) => x.id).sort()).toEqual(['x', 'y']);
  });
});
