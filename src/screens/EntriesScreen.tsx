import { useCallback, useMemo, useState } from 'react';
import { IconIn, IconOut, IconSwap } from '../components/Icons';
import { SwipeRow } from '../components/SwipeRow';
import { filterForTab, groupByDate, tabSummary, totals } from '../lib/calc';
import { formatGroupHeading } from '../lib/dates';
import type { EntriesTab, Entry } from '../lib/types';

interface Props {
  entries: Entry[];
  tab: EntriesTab;
  onTabChange: (tab: EntriesTab) => void;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}

const TABS: { id: EntriesTab; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'in', label: 'Rein' },
  { id: 'out', label: 'Raus' },
];

const EMPTY: Record<EntriesTab, string> = {
  all: 'Noch keine Einträge.',
  in: 'Noch keine Eingänge.',
  out: 'Noch keine Ausgänge.',
};

function TypeIcon({ type }: { type: Entry['type'] }) {
  if (type === 'out') return <IconOut size={20} role="img" aria-label="Raus" className="entry-icon tone-positive" />;
  if (type === 'in') return <IconIn size={20} role="img" aria-label="Rein" className="entry-icon tone-negative" />;
  return <IconSwap size={20} role="img" aria-label="Ersatz" className="entry-icon muted" />;
}

const TYPE_LINE: Record<Entry['type'], string> = { out: 'Raus', in: 'Rein', replacement: 'Ersatz · saldo-neutral' };

export function EntriesScreen({ entries, tab, onTabChange, onEdit, onDelete }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const t = useMemo(() => totals(entries), [entries]);
  const groups = useMemo(() => groupByDate(filterForTab(entries, tab)), [entries, tab]);
  const summary = tabSummary(t, tab);

  const selectTab = (id: EntriesTab) => {
    setOpenId(null);
    onTabChange(id);
  };

  const onTabKey = (e: React.KeyboardEvent, idx: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = TABS[(idx + d + TABS.length) % TABS.length];
    selectTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <div className="screen entries">
      <div className="entries__head">
        <div className="overline">Einträge</div>
        <div className="entries__tabs" role="tablist" aria-label="Filter">
          {TABS.map((x, i) => (
            <button
              key={x.id}
              id={`tab-${x.id}`}
              type="button"
              role="tab"
              aria-selected={tab === x.id}
              aria-controls="entries-panel"
              tabIndex={tab === x.id ? 0 : -1}
              className={`entries__tab${tab === x.id ? ' is-active' : ''}`}
              onClick={() => selectTab(x.id)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {x.label}
            </button>
          ))}
        </div>
        <div className="entries__summary">
          {summary.map((s, i) => (
            <span key={s.label}>
              {i > 0 && ' · '}
              <b>{s.value}</b> {s.label}
            </span>
          ))}
        </div>
      </div>

      <div id="entries-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="entries__list">
        {groups.length === 0 ? (
          <p className="entries__empty">{EMPTY[tab]}</p>
        ) : (
          groups.map((g) => (
            <section key={g.date} className="entries__group">
              <h2 className="entries__group-heading">{formatGroupHeading(g.date)}</h2>
              {g.entries.map((e) => (
                <Row
                  key={e.id}
                  entry={e}
                  tab={tab}
                  isOpen={openId === e.id}
                  setOpenId={setOpenId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}

interface RowProps {
  entry: Entry;
  tab: EntriesTab;
  isOpen: boolean;
  setOpenId: (fn: (id: string | null) => string | null) => void;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}

function Row({ entry, tab, isOpen, setOpenId, onEdit, onDelete }: RowProps) {
  const onOpenChange = useCallback(
    (open: boolean) => setOpenId((cur) => (open ? entry.id : cur === entry.id ? null : cur)),
    [entry.id, setOpenId],
  );
  const qty = entry.quantity > 1 ? <span className="entry-row__qty num">× {entry.quantity}</span> : null;

  return (
    <SwipeRow
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className={tab === 'all' ? 'entry-row entry-row--all' : 'entry-row'}
      onEdit={() => {
        onOpenChange(false);
        onEdit(entry);
      }}
      onDelete={() => {
        onOpenChange(false);
        onDelete(entry);
      }}
    >
      {tab === 'all' ? (
        <>
          <TypeIcon type={entry.type} />
          <span className="entry-row__text">
            <span className="entry-row__name">{entry.name}</span>
            <span className="entry-row__type">{TYPE_LINE[entry.type]}</span>
          </span>
          {qty}
        </>
      ) : (
        <>
          <span className="entry-row__name entry-row__name--grow">
            <span className="entry-row__name-text">{entry.name}</span>
            {entry.type === 'replacement' && <span className="badge">Ersatz</span>}
          </span>
          {qty}
        </>
      )}
    </SwipeRow>
  );
}
