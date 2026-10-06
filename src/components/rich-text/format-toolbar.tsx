import { cn } from '@/lib/utils';

export function FormatToolButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      aria-expanded={pressed}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs text-white/90 hover:bg-white/10',
        pressed ? 'bg-white/15' : '',
      )}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function FormatFlyout({
  id,
  label,
  menu,
  setMenu,
  icon,
  panelClassName,
  placement = 'down',
  openOnHover = true,
  children,
}: {
  id: string;
  label: string;
  menu: string | null;
  setMenu: (id: string | null) => void;
  icon: React.ReactNode;
  panelClassName?: string;
  placement?: 'up' | 'down';
  /** Desktop hover-to-open. Disable when a following click would immediately close the menu. */
  openOnHover?: boolean;
  children: React.ReactNode;
}) {
  const open = menu === id;
  return (
    <div
      className="relative"
      onMouseEnter={openOnHover ? () => setMenu(id) : undefined}
      onMouseLeave={openOnHover ? () => setMenu(null) : undefined}
    >
      <FormatToolButton label={label} pressed={open} onClick={() => setMenu(open ? null : id)}>
        {icon}
      </FormatToolButton>
      {open ? (
        <div className={cn('absolute left-0 z-40', placement === 'up' ? 'bottom-full pb-1' : 'top-full pt-1')}>
          <div className={cn('min-w-38 overflow-hidden rounded-xl bg-zinc-900 py-1 shadow-lg', panelClassName)}>
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FormatMenuItem({
  label,
  onClick,
  style,
  children,
}: {
  label: string;
  onClick: () => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-white/90 hover:bg-white/10"
      style={style}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
