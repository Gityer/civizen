import { Link } from 'react-router-dom';
import {
  Building2,
  Eye,
  HandCoins,
  HeartHandshake,
  Landmark,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { FundPageShell } from '@/components/funding/FundPageShell';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

const lanes = [
  {
    key: 'support',
    path: '/fund/support',
    icon: HeartHandshake,
  },
  {
    key: 'invest',
    path: '/fund/invest',
    icon: TrendingUp,
  },
  {
    key: 'institutional',
    path: '/fund/institutional',
    icon: Landmark,
  },
  {
    key: 'contribute',
    path: '/fund/contribute',
    icon: HandCoins,
  },
  {
    key: 'transparency',
    path: '/fund/transparency',
    icon: Eye,
  },
  {
    key: 'projectFinance',
    path: '/fund/project-finance',
    icon: PieChart,
  },
] as const;

export default function FundHub() {
  const { t } = useLanguage();

  return (
    <FundPageShell
      title={t('fund.hub.title')}
      description={t('fund.hub.description')}
      pageTitle={t('fund.hub.pageTitle')}
      pageDescription={t('fund.hub.pageDescription')}
      showBackToHub={false}
    >
      <section className="rounded-2xl border border-primary/20 bg-linear-to-br from-primary/10 via-card/60 to-accent/5 p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2 text-primary">
          <Building2 className="h-5 w-5" />
          <h2 className="text-lg font-semibold text-foreground">{t('fund.hub.modelTitle')}</h2>
        </div>
        <p className="text-base leading-relaxed text-foreground/90">{t('fund.hub.publicExplanation')}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          <Link to="/about/legal-status" className="text-primary underline-offset-4 hover:underline">
            {t('legalStatusNotice.title')}
          </Link>
          {' · '}
          <Link to="/documents" className="text-primary underline-offset-4 hover:underline">
            {t('onboarding.footerDocuments')}
          </Link>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t('fund.hub.pathwaysTitle')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {lanes.map((lane, index) => {
            const Icon = lane.icon;
            return (
              <motion.div
                key={lane.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + index * 0.04 }}
              >
                <Link to={lane.path} className="block h-full">
                  <Card className="h-full border-border/70 bg-card/95 transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-md">
                    <CardContent className="space-y-2 p-4">
                      <Icon className="h-7 w-7 text-primary" />
                      <h3 className="font-semibold text-foreground">
                        {t(`fund.hub.lanes.${lane.key}.title`)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t(`fund.hub.lanes.${lane.key}.description`)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      <p className="text-sm leading-relaxed text-muted-foreground">{t('fund.hub.legalNote')}</p>
    </FundPageShell>
  );
}
