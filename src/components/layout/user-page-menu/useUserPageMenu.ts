import { useUserPageMenuState } from '@/components/layout/user-page-menu/useUserPageMenuState';
import { useUserPageMenuActions } from '@/components/layout/user-page-menu/useUserPageMenuActions';
import { useBusinessAccessRequests } from '@/components/layout/user-page-menu/useBusinessAccessRequests';
import { type UserPageMenuProps } from '@/components/layout/user-page-menu/user-page-menu-shared';

export function useUserPageMenu({ size }: UserPageMenuProps) {
  const a = useUserPageMenuState({ size });
  const b = useUserPageMenuActions({ ...a });
  const c = useBusinessAccessRequests({
    open: a.open,
    profileId: a.profile?.id,
    linkedAccounts: a.linkedAccounts,
    t: a.t,
  });
  return { ...a, ...b, ...c, size };
}
