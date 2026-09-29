import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconEdit, IconTrash } from './Icons';

const ACTION_WIDTH = 88;
const OPEN_OFFSET = ACTION_WIDTH * 2;
const LOCK_THRESHOLD = 10;

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * Zeile mit Swipe-nach-links-Aktionen (Bearbeiten, Löschen).
 * Richtung wird nach ca. 10 px festgelegt: horizontal öffnet, vertikal scrollt (touch-action: pan-y).
 */
export function SwipeRow({ isOpen, onOpenChange, onEdit, onDelete, className, children }: Props) {
  const [dx, setDx] = useState<number | null>(null);
  const g = useRef<{ x: number; y: number; id: number; lock: 'h' | 'v' | null; base: number } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);

  // Tap außerhalb schließt die offene Zeile
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: PointerEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [isOpen, onOpenChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    g.current = { x: e.clientX, y: e.clientY, id: e.pointerId, lock: null, base: isOpen ? -OPEN_OFFSET : 0 };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s || s.id !== e.pointerId) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (!s.lock) {
      if (Math.abs(mx) < LOCK_THRESHOLD && Math.abs(my) < LOCK_THRESHOLD) return;
      s.lock = Math.abs(mx) > Math.abs(my) ? 'h' : 'v';
      if (s.lock === 'h') {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        if (!isOpen) onOpenChange(true); // andere offene Zeile schließen
      }
    }
    if (s.lock !== 'h') return;
    let next = s.base + mx;
    // Gummiband über die Aktionen hinaus
    if (next < -OPEN_OFFSET) next = -OPEN_OFFSET + (next + OPEN_OFFSET) / 3;
    if (next > 0) next = 0;
    setDx(next);
  };

  const end = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s || s.id !== e.pointerId) return;
    g.current = null;
    if (s.lock === 'h') {
      suppressClick.current = true;
      const pos = dx ?? s.base;
      onOpenChange(pos < -OPEN_OFFSET / 3);
    } else if (s.lock === null && isOpen) {
      // Tap auf die offene Zeile schließt sie
      suppressClick.current = true;
      onOpenChange(false);
    }
    setDx(null);
  };

  const offset = dx ?? (isOpen ? -OPEN_OFFSET : 0);
  const shifted = offset !== 0;

  return (
    <div ref={rowRef} className={`swipe-row${shifted ? ' is-shifted' : ''}`}>
      <div className="swipe-row__actions" aria-hidden={!isOpen}>
        <button type="button" className="swipe-row__action swipe-row__action--edit" tabIndex={isOpen ? 0 : -1} onClick={onEdit}>
          <IconEdit size={20} />
          <span>Bearbeiten</span>
        </button>
        <button
          type="button"
          className="swipe-row__action swipe-row__action--delete"
          tabIndex={isOpen ? 0 : -1}
          onClick={onDelete}
        >
          <IconTrash size={20} />
          <span>Löschen</span>
        </button>
      </div>
      <div
        className={`swipe-row__content${className ? ` ${className}` : ''}`}
        // Name bleibt stehen (wie im Mockup), nur die rechte Seite rückt nach links
        style={{
          transform: `translateX(${offset}px)`,
          paddingLeft: `calc(var(--gutter) + ${-offset}px)`,
          transition: dx !== null ? 'none' : undefined,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            suppressClick.current = false;
            e.stopPropagation();
            e.preventDefault();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
