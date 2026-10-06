import { motion } from 'framer-motion';
import { Search, Shield, Users } from 'lucide-react';

import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type UsersAdminOverviewProps = {
  search: string;
  stats: {
    total: number;
    admins: number;
    staff: number;
  };
  t: (key: string) => string;
  onSearchChange: (value: string) => void;
};

export function UsersAdminOverview({
  search,
  stats,
  t,
  onSearchChange,
}: UsersAdminOverviewProps) {
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <AppPageHeader title={t('admin.users.title')} showBack fallbackPath="/settings" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-2 overflow-x-auto scrollbar-none [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden"
      >
        <Card className="min-w-0 rounded-2xl border-border/60 p-2.5 shadow-sm sm:rounded-3xl sm:p-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="shrink-0 rounded-xl bg-primary/10 p-2 text-primary sm:rounded-2xl sm:p-3">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] leading-tight text-muted-foreground sm:text-sm">
                {t('admin.users.totalUsers')}
              </p>
              <p className="text-lg font-semibold text-foreground sm:text-2xl">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="min-w-0 rounded-2xl border-border/60 p-2.5 shadow-sm sm:rounded-3xl sm:p-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="shrink-0 rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-300 sm:rounded-2xl sm:p-3">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] leading-tight text-muted-foreground sm:text-sm">
                {t('admin.users.admins')}
              </p>
              <p className="text-lg font-semibold text-foreground sm:text-2xl">{stats.admins}</p>
            </div>
          </div>
        </Card>
        <Card className="min-w-0 rounded-2xl border-border/60 p-2.5 shadow-sm sm:rounded-3xl sm:p-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="shrink-0 rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-300 sm:rounded-2xl sm:p-3">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] leading-tight text-muted-foreground sm:text-sm">
                {t('admin.users.staffRoles')}
              </p>
              <p className="text-lg font-semibold text-foreground sm:text-2xl">{stats.staff}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="rounded-3xl border-border/60 p-4 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t('admin.users.searchPlaceholder')}
              className="pl-9"
            />
          </div>
        </Card>
      </motion.div>
    </>
  );
}
