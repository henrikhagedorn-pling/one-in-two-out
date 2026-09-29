import { useEffect, type ReactNode } from 'react';

export interface ScreenToastData {
  key: number;
  content: ReactNode;
  undo?: () => void;
  duration: number;
}

interface Props {
  data: ScreenToastData;
  onDone: () => void;
}

/** Toast über der Tab-Leiste. Mit „Rückgängig“ zusätzlich ein ablaufender Fortschrittsbalken. */
export function ScreenToast({ data, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, data.duration);
    return () => clearTimeout(t);
  }, [data.duration, onDone]);

  return (
    <div className="screen-toast" role="status">
      <span className="screen-toast__text">{data.content}</span>
      {data.undo && (
        <>
          <button
            type="button"
            className="screen-toast__action"
            onClick={() => {
              data.undo?.();
              onDone();
            }}
          >
            Rückgängig
          </button>
          <div className="screen-toast__progress" style={{ animationDuration: `${data.duration}ms` }} />
        </>
      )}
    </div>
  );
}
