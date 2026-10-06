import { useUserPageMenuState } from '@/components/layout/user-page-menu/useUserPageMenuState';
import { useUserPageMenuActions } from '@/components/layout/user-page-menu/useUserPageMenuActions';
import { type UserPageMenuProps } from '@/components/layout/user-page-menu/user-page-menu-shared';

export function useUserPageMenu({ size }: UserPageMenuProps) {
  const a = useUserPageMenuState({ size });
  const b = useUserPageMenuActions({ ...a });
  return { ...a, ...b, size };
}
