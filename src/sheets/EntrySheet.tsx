import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { IconCalendar, IconCheck, IconMinus, IconPlus } from '../components/Icons';
import {
  formatSigned,
  nameWithQuantity,
  normalizeQuantity,
  PLACEHOLDER,
  saldo,
  saldoDelta,
  suggestions,
  TYPE_LABEL,
  type Suggestion,
} from '../lib/calc';
import { formatDateField, todayISO } from '../lib/dates';
import type { Entry, EntryType } from '../lib/types';
import { Sheet, SheetHeader } from './Sheet';

export const NAME_INPUT_ID = 'entry-name';

type Props = {
  initialType: EntryType;
  entries: Entry[];
  onClosed: () => void;
} & ({ mode: 'new'; onSave: (entry: Entry) => void } | { mode: 'edit'; entry: Entry; onSave: (entry: Entry) => void });

interface SavedToast {
  key: number;
  name: string;
  quantity: number;
  type: EntryType;
  saldoAfter: number;
}

const TYPES: EntryType[] = ['in', 'out', 'replacement'];
const TOAST_VERB: Record<EntryType, string> = { in: 'rein', out: 'raus', replacement: 'als Ersatz' };

const toneClass = (n: number) => (n > 0 ? 'tone-positive' : n < 0 ? 'tone-negative' : 'tone-neutral');

export function EntrySheet(props: Props) {
  const { mode, initialType, entries, onClosed } = props;
  const original = mode === 'edit' ? props.entry : null;

  const [type, setType] = useState<EntryType>(initialType);
  const [name, setName] = useState(original?.name ?? '');
  const [qtyText, setQtyText] = useState(String(original?.quantity ?? 1));
  const [date, setDate] = useState(original?.date ?? todayISO());
  const [toast, setToast] = useState<SavedToast | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const toastSeq = useRef(0);

  const quantity = normalizeQuantity(qtyText);
  const canSave = name.trim().length > 0;

  // Fallback für Desktop: Fokus beim Öffnen (iOS fokussiert bereits synchron in der Tap-Geste)
  useEffect(() => {
    if (mode === 'new' && document.activeElement !== nameRef.current) nameRef.current?.focus({ preventScroll: true });
  }, [mode]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const current = saldo(entries);
  const after = current - (original ? saldoDelta(original.type, original.quantity) : 0) + saldoDelta(type, quantity);

  const chips: Suggestion[] = useMemo(
    () => (mode === 'new' ? suggestions(entries, name) : []),
    [mode, entries, name],
  );

  const save = (close: () => void) => {
    if (!canSave) return;
    const trimmed = name.trim();
    if (mode === 'edit' && original) {
      props.onSave({ ...original, type, name: trimmed, quantity, date });
      close();
      return;
    }
    const entry: Entry = {
      id: crypto.randomUUID(),
      type,
      name: trimmed,
      quantity,
      date,
      createdAt: new Date().toISOString(),
    };
    props.onSave(entry);
    toastSeq.current += 1;
    setToast({ key: toastSeq.current, name: trimmed, quantity, type, saldoAfter: after });
    // zurücksetzen: Name leer, Menge 1, Typ und Datum bleiben
    setName('');
    setQtyText('1');
    nameRef.current?.focus({ preventScroll: true });
  };

  // Buttons sollen den Fokus nicht aus dem Namensfeld nehmen (Tastatur bleibt offen)
  const keepFocus = (e: React.PointerEvent | React.MouseEvent) => e.preventDefault();

  const onQtyBlur = () => setQtyText(String(normalizeQuantity(qtyText)));
  const step = (d: number) => setQtyText(String(Math.max(1, quantity + d)));

  const openDatePicker = () => {
    const el = dateRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
    }
  };

  const title = mode === 'edit' ? 'Bearbeiten' : 'Neuer Eintrag';

  return (
    <Sheet
      label={mode === 'edit' ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
      onClosed={onClosed}
      header={(close) => (
        <SheetHeader
          left={
            <button type="button" className="sheet__text-button" onClick={close}>
              {mode === 'edit' ? 'Abbrechen' : 'Schließen'}
            </button>
          }
          title={title}
          right={
            <button
              type="button"
              className="sheet__text-button sheet__text-button--primary"
              disabled={!canSave}
              onPointerDown={keepFocus}
              onMouseDown={keepFocus}
              onClick={() => save(close)}
            >
              Speichern
            </button>
          }
        />
      )}
    >
      {(close) => (
        <form
          className="entry-form"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            save(close);
          }}
          autoComplete="off"
        >
          <div className="segmented" role="radiogroup" aria-label="Typ">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                className={`segmented__item${type === t ? ' is-selected' : ''}`}
                onPointerDown={keepFocus}
                onMouseDown={keepFocus}
                onClick={() => setType(t)}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          <label htmlFor={NAME_INPUT_ID} className="visually-hidden">
            Gegenstand
          </label>
          <input
            id={NAME_INPUT_ID}
            ref={nameRef}
            className="entry-form__name"
            type="text"
            value={name}
            placeholder={PLACEHOLDER[type]}
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck={false}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              // Enter / „Fertig“ speichert
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                save(close);
              }
            }}
          />

          {chips.length > 0 && (
            <div className="chips" aria-label="Vorschläge">
              {chips.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className="chip"
                  onPointerDown={keepFocus}
                  onMouseDown={keepFocus}
                  onClick={() => {
                    setName(c.name);
                    nameRef.current?.focus({ preventScroll: true });
                  }}
                >
                  <span>
                    {c.name.slice(0, c.matchStart)}
                    <b>{c.name.slice(c.matchStart, c.matchStart + c.matchLength)}</b>
                    {c.name.slice(c.matchStart + c.matchLength)}
                  </span>
                  <span className="chip__count">{c.count}×</span>
                </button>
              ))}
            </div>
          )}

          <div className="form-row form-row--qty">
            <label htmlFor="entry-qty" className="form-row__label">
              Menge
            </label>
            <div className="stepper">
              <button
                type="button"
                className="stepper__button"
                aria-label="Weniger"
                disabled={quantity <= 1}
                onPointerDown={keepFocus}
                onMouseDown={keepFocus}
                onClick={() => step(-1)}
              >
                <IconMinus size={18} />
              </button>
              <input
                id="entry-qty"
                className="stepper__value num"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={qtyText}
                onChange={(e) => setQtyText(e.target.value.replace(/[^\d]/g, ''))}
                onFocus={(e) => e.target.select()}
                onBlur={onQtyBlur}
              />
              <button
                type="button"
                className="stepper__button"
                aria-label="Mehr"
                onPointerDown={keepFocus}
                onMouseDown={keepFocus}
                onClick={() => step(1)}
              >
                <IconPlus size={18} />
              </button>
            </div>
          </div>

          <div className="form-row form-row--date">
            <span className="form-row__label" aria-hidden="true">
              Datum
            </span>
            <div className="date-field">
              <span className="date-field__display" aria-hidden="true">
                <span>{formatDateField(date)}</span>
                <IconCalendar size={20} className="date-field__icon" />
              </span>
              <input
                ref={dateRef}
                className="date-field__input"
                type="date"
                aria-label={`Datum: ${formatDateField(date)}`}
                value={date}
                max={todayISO()}
                onClick={openDatePicker}
                onChange={(e) => {
                  if (e.target.value) setDate(e.target.value);
                }}
              />
            </div>
          </div>

          <div className="saldo-preview">
            <span className="saldo-preview__label">Saldo nach Speichern</span>
            {type === 'replacement' && after === current ? (
              <span className="saldo-preview__value">
                <b className={toneClass(after)}>{formatSigned(after)}</b>
                <span className="muted"> · Ersatz ist neutral</span>
              </span>
            ) : (
              <span className="saldo-preview__value">
                <span className="muted">{formatSigned(current)} → </span>
                <b className={toneClass(after)}>{formatSigned(after)}</b>
              </span>
            )}
          </div>

          <div className="sheet-toast-slot" aria-live="polite">
            {toast && (
              <div key={toast.key} className="sheet-toast" role="status">
                <IconCheck size={18} className="sheet-toast__check" />
                <span>
                  <b>{nameWithQuantity(toast.name, toast.quantity)}</b> {TOAST_VERB[toast.type]} · Saldo jetzt{' '}
                  <b className={toast.saldoAfter < 0 ? 'toast-negative' : 'toast-positive'}>{formatSigned(toast.saldoAfter)}</b>
                </span>
              </div>
            )}
          </div>
        </form>
      )}
    </Sheet>
  );
}
