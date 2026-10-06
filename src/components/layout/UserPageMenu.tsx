import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { type UserPageMenuProps, getInitials } from '@/components/layout/user-page-menu/user-page-menu-shared';
import { useUserPageMenu } from '@/components/layout/user-page-menu/useUserPageMenu';
import { UserPageMenuPanel } from '@/components/layout/user-page-menu/UserPageMenuPanel';
import { UserPageMenuBusinessDialog } from '@/components/layout/user-page-menu/UserPageMenuBusinessDialog';

export function UserPageMenu({ size = 'md' }: UserPageMenuProps = {}) {
  const model = useUserPageMenu({ size });
  const { open, setOpen, profile, t, panelRef, triggerSizeClass, avatarSizeClass } = model;

  return (
    <div className="relative overflow-visible" ref={panelRef}>
      <button
        type="button"
        data-testid="user-page-menu-trigger"
        data-size={size}
        aria-label={t('home.profileMenuButton')}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'inline-flex items-center justify-center rounded-full outline-none ring-offset-background transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-primary',
          triggerSizeClass,
        )}
      >
        <Avatar className={cn('shrink-0 border-border', avatarSizeClass)}>
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className={cn('bg-primary/10 text-primary', size === 'sm' && 'text-[10px]')}>
            {getInitials(profile?.full_name, profile?.username)}
          </AvatarFallback>
        </Avatar>
      </button>

      <UserPageMenuPanel model={model} />

      <UserPageMenuBusinessDialog model={model} />
    </div>
  );
}
