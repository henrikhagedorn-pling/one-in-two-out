import { IconPlus, IconScale, IconUpDown } from './Icons';

interface Props {
  active: 'saldo' | 'entries';
  onSaldo: () => void;
  onPlus: () => void;
  onEntries: () => void;
}

export function TabBar({ active, onSaldo, onPlus, onEntries }: Props) {
  return (
    <nav className="tabbar" aria-label="Hauptnavigation">
      <button
        type="button"
        className={`tabbar__item${active === 'saldo' ? ' is-active' : ''}`}
        aria-current={active === 'saldo' ? 'page' : undefined}
        onClick={onSaldo}
      >
        <IconScale />
        <span>Saldo</span>
      </button>
      <button type="button" className="tabbar__plus" aria-label="Neuer Eintrag" onClick={onPlus}>
        <IconPlus />
      </button>
      <button
        type="button"
        className={`tabbar__item${active === 'entries' ? ' is-active' : ''}`}
        aria-current={active === 'entries' ? 'page' : undefined}
        onClick={onEntries}
      >
        <IconUpDown />
        <span>Einträge</span>
      </button>
    </nav>
  );
}
