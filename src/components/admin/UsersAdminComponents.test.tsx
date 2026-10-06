import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { UsersAdminCreateUserDialog } from '@/components/admin/UsersAdminCreateUserDialog';
import { UsersAdminOverview } from '@/components/admin/UsersAdminOverview';
import { UsersAdminMobileList } from '@/components/admin/UsersAdminMobileList';
import { UsersAdminDesktopTable } from '@/components/admin/UsersAdminDesktopTable';
import { manageableRoles, type ProfileRow } from '@/lib/users-admin';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('@/contexts/LanguageContext', async () => {
  const { baseTranslations, translateMessage } = await import('@/lib/i18n');

  return {
    useLanguage: () => ({
      language: 'en',
      setLanguage: async () => {},
      t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
      getNode: (key: string) => key,
      languageOptions: [{ code: 'en', label: 'English' }],
      isLoadingLanguage: false,
    }),
  };
});

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SelectValue: () => <span>value</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () =>
        ({ children, ...props }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) => {
          const { initial: _i, animate: _a, transition: _t, ...rest } = props;
          return <div {...(rest as React.HTMLAttributes<HTMLElement>)}>{children}</div>;
        },
    },
  ),
}));

const t = (key: string) => key;

const sampleUser = {
  id: 'p1',
  user_id: 'u1',
  username: 'ada',
  full_name: 'Ada Lovelace',
  avatar_url: 'https://example.com/ada.png',
  country: 'United Kingdom',
  country_code: 'GB',
  language_code: 'en',
  official_id: null,
  social_security_number: null,
  is_verified: true,
  is_admin: false,
  citizenship_status: 'citizen',
  citizenship_accepted_at: null,
  citizenship_acceptance_mode: null,
  citizenship_review_cleared_at: null,
  is_active_citizen: true,
  active_citizen_since: null,
  is_governance_eligible: true,
  governance_eligible_at: null,
  experience_level: 'mid',
  role: 'member',
  custom_permissions: [],
  granted_permissions: [],
  denied_permissions: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_active_at: new Date().toISOString(),
} as ProfileRow;

const sampleOrg = {
  ...sampleUser,
  id: 'p-org',
  user_id: 'u-org',
  username: 'biz_arts',
  full_name: 'Arts and Culture',
  avatar_url: 'https://example.com/arts.png',
  role: 'certified',
  is_verified: false,
} as ProfileRow;

function wrap(node: React.ReactNode) {
  return (
    <MemoryRouter>
      <TooltipProvider>{node}</TooltipProvider>
    </MemoryRouter>
  );
}

describe('UsersAdmin components', () => {
  it('renders create-user dialog with role select from manageableRoles', () => {
    render(
      wrap(
        <UsersAdminCreateUserDialog
          creatingUser={false}
          form={{ fullName: '', username: '', email: 'a@b.c', password: 'secret', role: 'member' }}
          manageableRoles={manageableRoles}
          open
          t={t}
          onCreate={() => {}}
          onOpenChange={() => {}}
          onUpdateForm={() => {}}
        />,
      ),
    );

    expect(screen.getByText('admin.users.createUserTitle')).toBeInTheDocument();
    expect(screen.getByText('common.role')).toBeInTheDocument();
  });

  it('renders overview search chrome', () => {
    render(
      wrap(
        <UsersAdminOverview
          search=""
          stats={{ total: 1, admins: 0, staff: 0 }}
          t={t}
          onSearchChange={() => {}}
        />,
      ),
    );

    expect(screen.getByText('admin.users.title')).toBeInTheDocument();
    expect(screen.getByTestId('app-page-header-back')).toBeInTheDocument();
    expect(screen.queryByText('admin.users.createUser')).not.toBeInTheDocument();
  });

  it('renders desktop table role controls without crashing', () => {
    render(
      wrap(
        <UsersAdminDesktopTable
          canLoginAsFromAdmin={false}
          levelSavingUserId={null}
          overrideSavingUserId={null}
          profileUserId="u0"
          roleSavingUserId={null}
          selectedUserId={null}
          switchingUserId={null}
          t={t}
          verificationCasesByProfile={{}}
          visibleGroups={[
            {
              owner: sampleUser,
              organizations: [{ profile: sampleOrg, organizationName: 'Arts and Culture' }],
            },
          ]}
          formatDate={() => 'today'}
          formatRelativeTime={() => 'now'}
          getActivityTimestamp={() => new Date().toISOString()}
          isUserOnline={() => true}
          onExperienceLevelChange={() => {}}
          onLoginAsUser={() => {}}
          onRoleChange={() => {}}
          onSelectUser={() => {}}
          onVerificationToggle={() => {}}
        />,
      ),
    );

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Arts and Culture')).toBeInTheDocument();
  });

  it('renders mobile list role controls without crashing', () => {
    render(
      wrap(
        <UsersAdminMobileList
          canLoginAsFromAdmin={false}
          levelSavingUserId={null}
          overrideSavingUserId={null}
          profileUserId="u0"
          roleSavingUserId={null}
          selectedUserId={null}
          switchingUserId={null}
          t={t}
          verificationCasesByProfile={{}}
          visibleGroups={[
            {
              owner: sampleUser,
              organizations: [{ profile: sampleOrg, organizationName: 'Arts and Culture' }],
            },
          ]}
          formatDate={() => 'today'}
          formatRelativeTime={() => 'now'}
          getActivityTimestamp={() => new Date().toISOString()}
          isUserOnline={() => true}
          onExperienceLevelChange={() => {}}
          onLoginAsUser={() => {}}
          onRoleChange={() => {}}
          onSelectUser={() => {}}
          onToggleSelectedUser={() => {}}
          onVerificationToggle={() => {}}
        />,
      ),
    );

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Arts and Culture')).toBeInTheDocument();
    expect(screen.queryByText('@ada')).not.toBeInTheDocument();
    expect(screen.getByLabelText('@ada')).toBeInTheDocument();
    expect(screen.getByLabelText('@biz_arts')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Mid').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('admin.users.userIsVerified')).toBeInTheDocument();
    expect(screen.getByLabelText('admin.users.userIsUnverified')).toBeInTheDocument();
  });
});
