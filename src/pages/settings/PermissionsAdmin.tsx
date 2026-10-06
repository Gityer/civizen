import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDragToScroll } from '@/hooks/useDragToScroll';
import { APP_ROLES, type AppPermission, type AppRole } from '@/lib/access-control';
import { pageRegistry, type PageId, type SectionId } from '@/lib/feature-registry';
import { permissionMetadata, permissionMetadataMap } from '@/lib/permission-metadata';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, supabaseUntyped } from '@/integrations/supabase/untyped';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const UserPageMenu = lazy(() =>
  import('@/components/layout/UserPageMenu').then((module) => ({ default: module.UserPageMenu })),
);

const sectionOrder: SectionId[] = ['home', 'discovery', 'knowledge', 'identity', 'contribution', 'marketplace', 'preferences', 'administration'];
const pageOrder: PageId[] = ['home', 'messaging', 'study', 'features', 'law', 'profile', 'editProfile', 'endorse', 'market', 'settings', 'admin', 'adminRoles', 'adminUsers', 'adminPermissions'];
function getPageLabel(pageId: PageId, t: (key: string, params?: Record<string, string | number>) => string) {
  if (pageId === 'editProfile') return t('settings.editProfile');
  if (pageId === 'admin') return t('features.pages.admin');
  if (pageId === 'adminRoles') return t('settings.adminRoles');
  if (pageId === 'adminUsers') return t('common.users');
  if (pageId === 'adminPermissions') return t('common.permissions');
  return t(pageRegistry[pageId].labelKey);
}

export default function PermissionsAdmin() {
  const { t } = useLanguage();
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  /** Missing keys default to collapsed so groups open folded until clicked. */
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [collapsedPages, setCollapsedPages] = useState<Record<string, boolean>>({});
  const [rolePermissions, setRolePermissions] = useState<Record<AppRole, AppPermission[]>>(
    Object.fromEntries(APP_ROLES.map((role) => [role, []])) as Record<AppRole, AppPermission[]>,
  );
  const visibleRoles = useMemo(
    () => (profile?.role === 'admin' ? APP_ROLES.filter((role) => role !== 'founder') : APP_ROLES),
    [profile?.role],
  );
  /** Fixed role widths so the strip overflows and can scroll (1fr was eating the gap). */
  const FEATURE_COL = '8.5rem';
  const ROLE_COL = '5rem';
  const matrixMinWidth = useMemo(
    () => `calc(${FEATURE_COL} + (${visibleRoles.length} * ${ROLE_COL}))`,
    [visibleRoles.length],
  );
  const matrixGridTemplate = useMemo(
    () => `${FEATURE_COL} repeat(${visibleRoles.length}, ${ROLE_COL})`,
    [visibleRoles.length],
  );
  const matrixCanvasStyle = useMemo(
    () => ({
      width: matrixMinWidth,
      minWidth: matrixMinWidth,
    }),
    [matrixMinWidth],
  );
  const matrixRowStyle = useMemo(
    () => ({
      gridTemplateColumns: matrixGridTemplate,
      width: matrixMinWidth,
    }),
    [matrixGridTemplate, matrixMinWidth],
  );
  const matrixScrollRef = useRef<HTMLDivElement>(null);
  useDragToScroll(matrixScrollRef);

  useEffect(() => {
    const loadMatrix = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('role_permissions').select('role,permission');

      if (error) {
        console.error('Error loading permission matrix:', error);
        toast.error(t('admin.permissions.loadFailed'));
        setLoading(false);
        return;
      }

      setRolePermissions(
        Object.fromEntries(
          APP_ROLES.map((role) => [
            role,
            (data ?? [])
              .filter((entry) => entry.role === role)
              .map((entry) => entry.permission),
          ]),
        ) as Record<AppRole, AppPermission[]>,
      );
      setLoading(false);
    };

    void loadMatrix();
    // Intentionally omit `t`: toast copy can use the latest render closure without reloading the matrix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupedPermissions = useMemo(() => {
    return sectionOrder
      .map((sectionId) => {
        const pages = pageOrder
          .map((pageId) => {
            const items = permissionMetadata.filter(
              (entry) => entry.section === sectionId && entry.page === pageId,
            );

            if (!items.length) return null;

            return {
              pageId,
              items,
            };
          })
          .filter(Boolean) as Array<{ pageId: PageId; items: typeof permissionMetadata }>;

        if (!pages.length) return null;

        return {
          sectionId,
          pages,
        };
      })
      .filter(Boolean) as Array<{
        sectionId: SectionId;
        pages: Array<{ pageId: PageId; items: typeof permissionMetadata }>;
      }>;
  }, []);

  const nestedPageKeys = useMemo(() => {
    const keys: string[] = [];
    for (const sectionGroup of groupedPermissions) {
      const sectionLabel = t(`admin.permissions.sectionNames.${sectionGroup.sectionId}`);
      for (const pageGroup of sectionGroup.pages) {
        const pageLabel = getPageLabel(pageGroup.pageId, t);
        if (pageLabel.trim().toLowerCase() !== sectionLabel.trim().toLowerCase()) {
          keys.push(`${sectionGroup.sectionId}:${pageGroup.pageId}`);
        }
      }
    }
    return keys;
  }, [groupedPermissions, t]);

  const handleTogglePermission = async (role: AppRole, permission: AppPermission) => {
    if (role === 'system') return;

    const key = `${role}:${permission}`;
    const enabled = (rolePermissions[role] || []).includes(permission);
    setSavingKey(key);

    setRolePermissions((current) => ({
      ...current,
      [role]: enabled
        ? current[role].filter((item) => item !== permission)
        : [...current[role], permission].sort(),
    }));

    const operation = enabled
      ? supabaseUntyped.from('role_permissions').delete().eq('role', role).eq('permission', permission)
      : supabaseUntyped.from('role_permissions').insert({ role, permission });

    const { error } = await operation;

    if (error) {
      console.error('Error updating role permission:', error);
      setRolePermissions((current) => ({
        ...current,
        [role]: enabled
          ? [...current[role], permission].sort()
          : current[role].filter((item) => item !== permission),
      }));
      toast.error(t('admin.permissions.updateFailed'));
      setSavingKey(null);
      return;
    }

    toast.success(
      enabled
        ? t('admin.permissions.permissionDisabled', {
            role: t(`admin.roles.${role}`),
            permission: t(permissionMetadataMap[permission].titleKey),
          })
        : t('admin.permissions.permissionEnabled', {
            role: t(`admin.roles.${role}`),
            permission: t(permissionMetadataMap[permission].titleKey),
          }),
    );
    if (profile?.role === role) {
      await refreshProfile();
    }
    setSavingKey(null);
  };

  const isSectionCollapsed = (sectionId: string) => collapsedSections[sectionId] ?? true;
  const isPageCollapsed = (pageKey: string) => collapsedPages[pageKey] ?? true;

  const allExpanded = useMemo(() => {
    if (!groupedPermissions.length) return false;
    const sectionsOpen = groupedPermissions.every((section) => !(collapsedSections[section.sectionId] ?? true));
    const pagesOpen = nestedPageKeys.every((pageKey) => !(collapsedPages[pageKey] ?? true));
    return sectionsOpen && pagesOpen;
  }, [collapsedPages, collapsedSections, groupedPermissions, nestedPageKeys]);

  const toggleExpandAll = () => {
    const nextCollapsed = allExpanded;
    setCollapsedSections(
      Object.fromEntries(groupedPermissions.map((section) => [section.sectionId, nextCollapsed])),
    );
    setCollapsedPages(Object.fromEntries(nestedPageKeys.map((pageKey) => [pageKey, nextCollapsed])));
  };

  const toggleSectionVisibility = (sectionId: string) => {
    setCollapsedSections((current) => ({
      ...current,
      [sectionId]: !(current[sectionId] ?? true),
    }));
  };

  const togglePageVisibility = (pageKey: string) => {
    setCollapsedPages((current) => ({
      ...current,
      [pageKey]: !(current[pageKey] ?? true),
    }));
  };

  return (
    <AppLayout hideTopChrome>
      <div className="flex h-[calc(100dvh-5rem)] min-w-0 flex-col gap-2 px-2 pt-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="shrink-0">
          <AppPageHeader
            title={
              <>
                <span>{t('admin.permissions.title')}</span>
                <button
                  type="button"
                  onClick={toggleExpandAll}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-expanded={allExpanded}
                  aria-label={allExpanded ? t('admin.permissions.collapseAll') : t('admin.permissions.expandAll')}
                  data-testid="permissions-expand-all"
                >
                  {allExpanded ? (
                    <ChevronDown className="h-5 w-5" aria-hidden />
                  ) : (
                    <ChevronRight className="h-5 w-5" aria-hidden />
                  )}
                </button>
              </>
            }
            showBack
            fallbackPath="/settings"
            padForChrome={false}
            actions={
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 shrink-0 rounded-full border border-border/60 bg-card/60"
                  onClick={() => navigate('/search')}
                  aria-label={t('common.search')}
                  data-testid="permissions-header-search"
                >
                  <Search className="h-4 w-4" />
                </Button>
                <Suspense fallback={<div className="h-10 w-10 shrink-0 rounded-full border border-border/60 bg-card/60" />}>
                  <UserPageMenu />
                </Suspense>
              </>
            }
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="min-h-0 min-w-0 flex-1"
        >
          <Card className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border-border/60 shadow-sm">
            {loading ? (
              <div className="flex flex-1 items-center justify-center gap-2 px-6 py-20 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('common.loading')}</span>
              </div>
            ) : (
              <div
                ref={matrixScrollRef}
                data-testid="permissions-matrix-scroll"
                className="min-h-0 min-w-0 flex-1 cursor-grab overflow-x-auto overflow-y-auto overscroll-contain touch-pan-x touch-pan-y data-[dragging=true]:cursor-grabbing"
              >
                <div
                  data-testid="permissions-matrix-canvas"
                  className="select-none"
                  style={matrixCanvasStyle}
                >
                <div
                  className="sticky top-0 z-20 grid items-center gap-1 border-b border-border/60 bg-card/95 px-2 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80"
                  style={matrixRowStyle}
                  data-testid="permissions-matrix-header"
                >
                  <div className="sticky left-0 z-30 bg-card/95 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-card/80">
                    {t('admin.permissions.featureColumn')}
                  </div>
                  {visibleRoles.map((role) => (
                    <div
                      key={role}
                      title={t(`admin.roles.${role}`)}
                      className="px-0.5 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:text-xs sm:tracking-[0.12em]"
                    >
                      <span className="block truncate">{t(`admin.roles.${role}`)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 p-2">
                  {groupedPermissions.map((sectionGroup) => {
                    const sectionCollapsed = isSectionCollapsed(sectionGroup.sectionId);
                    const sectionLabel = t(`admin.permissions.sectionNames.${sectionGroup.sectionId}`);

                    return (
                      <div key={sectionGroup.sectionId} className="space-y-2">
                        <button
                          type="button"
                          onClick={() => toggleSectionVisibility(sectionGroup.sectionId)}
                          className="sticky left-0 z-10 flex w-max max-w-[min(100%,14rem)] items-center rounded-md bg-card/95 px-1.5 py-1 text-left backdrop-blur supports-[backdrop-filter]:bg-card/80"
                          aria-expanded={!sectionCollapsed}
                          data-testid={`permissions-section-toggle-${sectionGroup.sectionId}`}
                        >
                          <h3
                            className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary"
                            data-testid={`permissions-section-label-${sectionGroup.sectionId}`}
                          >
                            {sectionLabel}
                          </h3>
                        </button>

                        {!sectionCollapsed
                          ? sectionGroup.pages.map((pageGroup) => {
                              const pageLabel = getPageLabel(pageGroup.pageId, t);
                              const showPageLabel =
                                pageLabel.trim().toLowerCase() !== sectionLabel.trim().toLowerCase();
                              const pageKey = `${sectionGroup.sectionId}:${pageGroup.pageId}`;
                              const pageCollapsed = showPageLabel ? isPageCollapsed(pageKey) : false;

                              return (
                                <Card
                                  key={`${sectionGroup.sectionId}-${pageGroup.pageId}`}
                                  className="min-w-full rounded-2xl border-border/60 bg-background/20 shadow-none"
                                >
                                  {showPageLabel ? (
                                    <div className="border-b border-border/60 px-2 py-2">
                                      <button
                                        type="button"
                                        onClick={() => togglePageVisibility(pageKey)}
                                        className="sticky left-0 z-10 flex w-max max-w-[min(100%,14rem)] items-center bg-card px-1 text-left"
                                        aria-expanded={!pageCollapsed}
                                        data-testid={`permissions-page-toggle-${pageKey}`}
                                      >
                                        <h4
                                          className="text-xs font-semibold tracking-wide text-muted-foreground"
                                          data-testid={`permissions-page-label-${pageKey}`}
                                        >
                                          {pageLabel}
                                        </h4>
                                      </button>
                                    </div>
                                  ) : null}

                                  {!pageCollapsed ? (
                                    <div className="divide-y divide-border/60">
                                      {pageGroup.items.map((entry) => (
                                        <div
                                          key={entry.permission}
                                          className="grid items-center gap-1 rounded-xl px-2 py-2 transition-[background-color,box-shadow] hover:bg-background/40 hover:ring-1 hover:ring-primary/20"
                                          style={matrixRowStyle}
                                          data-testid={`permissions-function-row-${entry.permission}`}
                                        >
                                          <div className="sticky left-0 z-10 min-w-0 bg-card px-1 pl-3">
                                            <TooltipProvider delayDuration={120}>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <button
                                                    type="button"
                                                    className="inline-flex max-w-full items-center gap-1 text-left text-sm font-normal text-foreground/90"
                                                  >
                                                    <span className="truncate">{t(entry.titleKey)}</span>
                                                    <CircleHelp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                  </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" align="start" className="max-w-xs text-sm">
                                                  {t(entry.descriptionKey)}
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          </div>
                                          {visibleRoles.map((role) => {
                                            const enabled = (rolePermissions[role] || []).includes(entry.permission);
                                            const key = `${role}:${entry.permission}`;
                                            const isSaving = savingKey === key;
                                            const isReadOnly = role === 'system';
                                            return (
                                              <div key={key} className="flex justify-center">
                                                <button
                                                  type="button"
                                                  disabled={isReadOnly || isSaving}
                                                  onClick={() => handleTogglePermission(role, entry.permission)}
                                                  className={cn(
                                                    'inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
                                                    enabled
                                                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                                                      : 'border-border bg-muted text-muted-foreground',
                                                    !isReadOnly &&
                                                      'hover:border-primary/30 hover:bg-primary/10 hover:text-primary',
                                                    (isReadOnly || isSaving) && 'cursor-not-allowed opacity-70',
                                                  )}
                                                  aria-label={`${t(`admin.roles.${role}`)} ${t(entry.titleKey)}`}
                                                >
                                                  {isSaving ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                  ) : enabled ? (
                                                    <Check className="h-4 w-4" />
                                                  ) : (
                                                    <X className="h-4 w-4" />
                                                  )}
                                                </button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </Card>
                              );
                            })
                          : null}
                      </div>
                    );
                  })}
                </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
