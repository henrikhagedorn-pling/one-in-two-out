import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  label: string;
  onClosed: () => void;
  /** Kopfzeile (Teil der Swipe-down-Fläche). Render-Props erhalten `close`, das mit Animation schließt. */
  header: (close: () => void) => ReactNode;
  children: (close: () => void) => ReactNode;
  className?: string;
}

const ANIMATION_MS = 280;
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.6; // px/ms

/**
 * Bottom-Sheet mit Griff. Schließen per Button (close), Scrim-Tap, Escape oder Swipe-down
 * auf Griff und Kopfzeile.
 */
export function Sheet({ label, onClosed, header, children, className }: Props) {
  const [phase, setPhase] = useState<'enter' | 'open' | 'closing'>('enter');
  const [dragY, setDragY] = useState(0);
  const drag = useRef<{ startY: number; lastY: number; lastT: number; v: number; id: number } | null>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('open')));
    return () => cancelAnimationFrame(raf);
  }, []);

  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    (document.activeElement as HTMLElement | null)?.blur?.();
    setPhase('closing');
    setDragY(0);
    setTimeout(onClosed, ANIMATION_MS);
  }, [onClosed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || phase !== 'open') return;
    // Buttons in der Kopfzeile nicht als Drag behandeln
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { startY: e.clientY, lastY: e.clientY, lastT: e.timeStamp, v: 0, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    setDragY(Math.max(0, e.clientY - d.startY));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const dist = e.clientY - d.startY;
    if (dist > DISMISS_DISTANCE || (dist > 30 && d.v > DISMISS_VELOCITY)) close();
    else setDragY(0);
  };

  const dragging = drag.current !== null && dragY > 0;
  const style =
    phase === 'open' && dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: dragging ? 'none' : undefined } : undefined;

  return (
    <div className={`sheet-layer sheet-layer--${phase}`}>
      <div className="sheet-scrim" onClick={close} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={label} className={`sheet${className ? ` ${className}` : ''}`} style={style}>
        <div
          className="sheet__drag-area"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="sheet__grip" aria-hidden="true">
            <div />
          </div>
          {header(close)}
        </div>
        {children(close)}
      </div>
    </div>
  );
}

interface HeaderProps {
  left: ReactNode;
  title: string;
  right?: ReactNode;
}

export function SheetHeader({ left, title, right }: HeaderProps) {
  return (
    <div className="sheet__header">
      <div className="sheet__header-left">{left}</div>
      <div className="sheet__title">{title}</div>
      <div className="sheet__header-right">{right}</div>
    </div>
  );
}
