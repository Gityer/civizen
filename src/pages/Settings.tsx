import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { loadLanguageOptions, type LanguageCode, type LanguageOption } from '@/lib/i18n.runtime';
import { permissionListHas, permissionListHasAny } from '@/lib/access-control';
import { canViewCiviAgentSettings } from '@/lib/assistant/interaction-log';
import { isOfficialCivizenOrgProfile } from '@/lib/civizen-org-account';
import { APP_VERSION_TAG, ANDROID_VERSION_CODE } from '@/lib/app-release';
import { ensureAuthorizedAppUpdateChannel, getAppUpdateChannel, getAppUpdateChannelExpiresAt, onAppUpdateChannelChange, setAppUpdateChannel, type AppUpdateChannel } from '@/lib/update-channel';
import { cn } from '@/lib/utils';
import { LogOut, ChevronRight, Globe, Palette, Users, KeyRound, ShieldCheck, Fingerprint, Bot, Landmark, LayoutGrid, Lightbulb, Coins, Vote, FlaskConical } from 'lucide-react';
import { type SettingsNavItem, settingsItems } from '@/pages/settings-items';



function canHoverOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}


type PrimarySettingsRow =
  | { kind: 'language' }
  | { kind: 'appearance' }
  | { kind: 'nav'; item: SettingsNavItem };

export default function Settings() {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [languageOptions, setLanguageOptions] = useState<readonly LanguageOption[]>([]);
  const [updateChannel, setUpdateChannelState] = useState<AppUpdateChannel>(() => getAppUpdateChannel());
  const [testChannelExpiresAt, setTestChannelExpiresAt] = useState<number | null>(() => getAppUpdateChannelExpiresAt());
  const [updateChannelMenuOpen, setUpdateChannelMenuOpen] = useState(false);
  const updateChannelCloseTimerRef = useRef<number | null>(null);
  const installedReleaseLabel = `${APP_VERSION_TAG} (${ANDROID_VERSION_CODE})`;
  const canAccessAdmin = profile
    ? permissionListHasAny(profile.effective_permissions || [], [
        'role.assign',
        'settings.manage',
        'finance.view',
        'finance.edit',
        'finance.approve',
        'finance.publish',
        'finance.admin',
      ])
    : false;
  const [isCivizenOrgAccount, setIsCivizenOrgAccount] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isOfficialCivizenOrgProfile(profile?.id, { username: profile?.username });
      if (!cancelled) setIsCivizenOrgAccount(ok);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.username]);

  const canUseTestingUpdateChannel = Boolean(
    profile && permissionListHas(profile.effective_permissions || [], 'updates.test'),
  );

  const canManageMarket = Boolean(
    profile && permissionListHasAny(profile.effective_permissions || [], ['market.manage']),
  );

  const showCivicGovernanceHub = Boolean(profile);

  const civicGovernanceItems = showCivicGovernanceHub
    ? [
        {
          icon: Landmark,
          labelKey: 'settings.governanceHub',
          descriptionKey: 'settings.governanceHubDescription',
          path: '/governance',
        },
        {
          icon: Vote,
          labelKey: 'settings.civicVotingTitle',
          descriptionKey: 'settings.civicVotingDescription',
          path: '/governance/voting',
        },
        ...(profile?.role !== 'guest'
          ? [
              {
                icon: Lightbulb,
                labelKey: 'settings.solutionsTitle',
                descriptionKey: 'settings.solutionsDescription',
                path: '/governance/solutions',
              },
              {
                icon: Landmark,
                labelKey: 'settings.governanceWorkspaceTitle',
                descriptionKey: 'settings.governanceWorkspaceDescription',
                path: '/governance/workspace',
              },
            ]
          : []),
      ]
    : [];

  const marketOpsItems = canManageMarket
    ? [
        {
          icon: Coins,
          labelKey: 'settings.lumaCreditsCardTitle',
          descriptionKey: 'settings.lumaCreditsCardDescription',
          path: '/settings/market/luma-credits',
        },
      ]
    : [];

  const canViewAiAgent = canViewCiviAgentSettings(profile?.role);

  const visibleSettingsItems = [
    ...(canViewAiAgent
      ? [
          {
            icon: Bot,
            labelKey: 'settings.aiAgent',
            descriptionKey: 'settings.aiAgentDescription',
            path: '/settings/ai-agent',
          } satisfies SettingsNavItem,
        ]
      : []),
    ...settingsItems.filter((item) => {
      if (item.path === '/settings/social-accounts' && !isCivizenOrgAccount) {
        return false;
      }
      return (
        !item.requiredPermissions ||
        permissionListHasAny(profile?.effective_permissions || [], item.requiredPermissions)
      );
    }),
  ];

  const primaryRowLabel = (row: PrimarySettingsRow): string => {
    if (row.kind === 'language') return t('settings.languageTitle');
    if (row.kind === 'appearance') return t('settings.appearanceTitle');
    return t(row.item.labelKey);
  };

  const primarySettingsRows: PrimarySettingsRow[] = [
    { kind: 'language' as const },
    { kind: 'appearance' as const },
    ...visibleSettingsItems.map((item) => ({ kind: 'nav' as const, item })),
  ].sort((a, b) => primaryRowLabel(a).localeCompare(primaryRowLabel(b), language, { sensitivity: 'base' }));

  const adminItems = canAccessAdmin
    ? [
        {
          icon: Fingerprint,
          labelKey: 'settings.adminRoles',
          descriptionKey: 'settings.adminRolesDescription',
          path: '/settings/admin/roles',
        },
        {
          icon: Users,
          labelKey: 'settings.adminUsers',
          descriptionKey: 'settings.adminUsersDescription',
          path: '/settings/admin/users',
        },
        {
          icon: KeyRound,
          labelKey: 'settings.adminPermissions',
          descriptionKey: 'settings.adminPermissionsDescription',
          path: '/settings/admin/permissions',
        },
        {
          icon: Landmark,
          labelKey: 'settings.adminGovernance',
          descriptionKey: 'settings.adminGovernanceDescription',
          path: '/settings/admin/governance',
        },
        {
          icon: LayoutGrid,
          labelKey: 'settings.adminModules',
          descriptionKey: 'settings.adminModulesDescription',
          path: '/settings/admin/modules',
        },
        {
          icon: Coins,
          labelKey: 'settings.adminFunding',
          descriptionKey: 'settings.adminFundingDescription',
          path: '/settings/admin/funding',
        },
      ]
    : [];

  const handleSignOut = async () => {
    await signOut();
    navigate('/onboarding');
  };

  const handleLanguageChange = async (nextLanguage: string) => {
    await setLanguage(nextLanguage as LanguageCode);
  };

  const handleUpdateChannelChange = (nextChannel: AppUpdateChannel) => {
    setAppUpdateChannel(nextChannel);
    setUpdateChannelState(nextChannel);
    setTestChannelExpiresAt(getAppUpdateChannelExpiresAt());
    setUpdateChannelMenuOpen(false);
  };

  const clearUpdateChannelCloseTimer = () => {
    if (updateChannelCloseTimerRef.current !== null) {
      window.clearTimeout(updateChannelCloseTimerRef.current);
      updateChannelCloseTimerRef.current = null;
    }
  };

  const openUpdateChannelMenu = () => {
    clearUpdateChannelCloseTimer();
    setUpdateChannelMenuOpen(true);
  };

  const scheduleUpdateChannelMenuClose = () => {
    clearUpdateChannelCloseTimer();
    updateChannelCloseTimerRef.current = window.setTimeout(() => setUpdateChannelMenuOpen(false), 160);
  };

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      const options = await loadLanguageOptions();
      if (active) setLanguageOptions(options);
    };

    void loadOptions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (updateChannelCloseTimerRef.current !== null) {
        window.clearTimeout(updateChannelCloseTimerRef.current);
        updateChannelCloseTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const refreshChannelState = () => {
      const channel = ensureAuthorizedAppUpdateChannel(canUseTestingUpdateChannel);
      setUpdateChannelState(channel);
      setTestChannelExpiresAt(getAppUpdateChannelExpiresAt());
    };

    refreshChannelState();
    const unsubscribe = onAppUpdateChannelChange(refreshChannelState);
    const intervalId = window.setInterval(refreshChannelState, 60 * 1000);

    return () => {
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }, [canUseTestingUpdateChannel]);

  const updateChannelLabel =
    updateChannel === 'testing'
      ? t('settings.updateChannelTesting')
      : t('settings.updateChannelRelease');
  const testChannelReturnLabel =
    updateChannel === 'testing' && testChannelExpiresAt
      ? t('settings.updateChannelAutoReturn', {
          time: new Date(testChannelExpiresAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        })
      : t('settings.updateChannelLiveHint');
  const updateChannelOptions: { value: AppUpdateChannel; label: string }[] = [
    { value: 'release', label: t('settings.updateChannelRelease') },
    { value: 'testing', label: t('settings.updateChannelTesting') },
  ];

  return (
    <AppLayout>
      <div className="px-4 py-6 flex flex-col gap-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AppPageHeader title={t('settings.title')} />
        </motion.div>

        {/* Primary settings (alphabetical by title) */}
        <div className="flex flex-col gap-4">
          {primarySettingsRows.map((row, index) => {
            const motionProps = {
              initial: { opacity: 0, x: -10 },
              animate: { opacity: 1, x: 0 },
              transition: { delay: index * 0.05 },
            };

            if (row.kind === 'language') {
              return (
                <motion.div key="language" {...motionProps}>
                  <Card className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">{t('settings.languageTitle')}</h3>
                        <p className="text-sm text-muted-foreground">{t('settings.languageDescription')}</p>
                      </div>
                      <Select value={language} onValueChange={handleLanguageChange}>
                        <SelectTrigger className="w-auto">
                          <SelectValue placeholder={t('settings.languageTitle')} />
                        </SelectTrigger>
                        <SelectContent>
                          {languageOptions.map((option) => (
                            <SelectItem key={option.code} value={option.code}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </Card>
                </motion.div>
              );
            }

            if (row.kind === 'appearance') {
              return (
                <motion.div key="appearance" {...motionProps}>
                  <Card className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <Palette className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">{t('settings.appearanceTitle')}</h3>
                        <p className="text-sm text-muted-foreground">{t('settings.appearanceDescription')}</p>
                      </div>
                      <div className="shrink-0">
                        <ThemeToggle />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            }

            const item = row.item;
            return (
              <motion.div key={item.path} {...motionProps}>
                <Card
                  className="p-4 cursor-pointer hover:shadow-elevated transition-shadow"
                  onClick={() => navigate(item.path)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{t(item.labelKey)}</h3>
                      <p className="text-sm text-muted-foreground">{t(item.descriptionKey)}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {civicGovernanceItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="flex flex-col gap-3"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {t('settings.civicGovernanceTitle')}
              </h2>
              <p className="text-sm text-muted-foreground">{t('settings.civicGovernanceDescription')}</p>
            </div>
            <div className="flex flex-col gap-4">
              {civicGovernanceItems.map((item, index) => (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                >
                  <Card
                    className="p-4 cursor-pointer hover:shadow-elevated transition-shadow"
                    onClick={() => navigate(item.path)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{t(item.labelKey)}</h3>
                        <p className="text-sm text-muted-foreground">{t(item.descriptionKey)}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {marketOpsItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
            className="flex flex-col gap-3"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {t('settings.marketToolsTitle')}
              </h2>
              <p className="text-sm text-muted-foreground">{t('settings.marketToolsDescription')}</p>
            </div>
            <div className="flex flex-col gap-4">
              {marketOpsItems.map((item, index) => (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.44 + index * 0.05 }}
                >
                  <Card
                    className="p-4 cursor-pointer hover:shadow-elevated transition-shadow"
                    onClick={() => navigate(item.path)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{t(item.labelKey)}</h3>
                        <p className="text-sm text-muted-foreground">{t(item.descriptionKey)}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {canAccessAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex flex-col gap-3"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {t('settings.adminTitle')}
              </h2>
              <p className="text-sm text-muted-foreground">{t('settings.adminDescription')}</p>
            </div>

            <div className="flex flex-col gap-4">
              {adminItems.map((item, index) => (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                >
                  <Card
                    className="p-4 cursor-pointer hover:shadow-elevated transition-shadow"
                    onClick={() => navigate(item.path)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{t(item.labelKey)}</h3>
                        <p className="text-sm text-muted-foreground">{t(item.descriptionKey)}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Sign out */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay:
              canAccessAdmin || marketOpsItems.length > 0 || civicGovernanceItems.length > 0 ? 0.65 : 0.55,
          }}
        >
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
            {t('settings.signOut')}
          </Button>
        </motion.div>

        {/* App info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: canAccessAdmin || marketOpsItems.length > 0 ? 0.75 : 0.65 }}
        >
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <h3 className="font-semibold text-foreground">{t('settings.appInfoTitle')}</h3>
                <p className="text-sm font-medium text-foreground">{installedReleaseLabel}</p>
              </div>
              {canUseTestingUpdateChannel && (
                <Popover
                  open={updateChannelMenuOpen}
                  onOpenChange={(next) => {
                    clearUpdateChannelCloseTimer();
                    setUpdateChannelMenuOpen(next);
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`${t('settings.updateChannelTitle')}: ${updateChannelLabel}`}
                      aria-expanded={updateChannelMenuOpen}
                      title={`${t('settings.updateChannelTitle')}: ${updateChannelLabel}`}
                      className={cn(
                        'shrink-0',
                        updateChannel === 'testing' && 'border-primary/50 bg-primary/10 text-primary',
                      )}
                      onMouseEnter={() => {
                        if (canHoverOpen()) openUpdateChannelMenu();
                      }}
                      onMouseLeave={() => {
                        if (canHoverOpen()) scheduleUpdateChannelMenuClose();
                      }}
                    >
                      <FlaskConical className="h-[1.2rem] w-[1.2rem]" aria-hidden />
                      <span className="sr-only">{t('settings.updateChannelTitle')}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={6}
                    className="w-52 p-1"
                    onOpenAutoFocus={(event) => event.preventDefault()}
                    onCloseAutoFocus={(event) => event.preventDefault()}
                    onMouseEnter={() => {
                      if (canHoverOpen()) openUpdateChannelMenu();
                    }}
                    onMouseLeave={() => {
                      if (canHoverOpen()) scheduleUpdateChannelMenuClose();
                    }}
                  >
                    <div
                      className="flex flex-col"
                      role="listbox"
                      aria-label={t('settings.updateChannelTitle')}
                    >
                      {updateChannelOptions.map((option) => {
                        const selected = updateChannel === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={cn(
                              'rounded-md px-2.5 py-1.5 text-left text-sm outline-none transition-colors',
                              selected
                                ? 'bg-primary text-primary-foreground'
                                : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                            )}
                            onClick={() => handleUpdateChannelChange(option.value)}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                      <p className="mt-1 border-t border-border/60 px-2.5 py-2 text-xs text-muted-foreground">
                        {testChannelReturnLabel}
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: canAccessAdmin || marketOpsItems.length > 0 ? 0.8 : 0.7 }}
          className="text-center text-sm text-muted-foreground"
        >
          <p>{t('settings.appInfoLine2')}</p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
