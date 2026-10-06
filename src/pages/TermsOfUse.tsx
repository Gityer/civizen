import { motion } from 'framer-motion';
import { FileText, Scale, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { TERMS_ACCEPTANCE_VERSION } from '@/lib/terms-version';

const sectionKeys = [
  'serviceScope',
  'codeOfConduct',
  'accounts',
  'verification',
  'citizenship',
  'governance',
  'privacy',
  'contributions',
  'enforcement',
  'internalOrder',
  'changes',
] as const;

export default function TermsOfUse() {
  const { t, getNode } = useLanguage();
  const bullets = (getNode('terms.acceptanceBullets') as string[] | undefined) || [];

  return (
    <AppLayout hideNav={false}>
      <div className="space-y-6 px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AppPageHeader
            title={t('terms.title')}
            subtitle={t('terms.subtitle')}
            leading={
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileText className="h-7 w-7" />
              </div>
            }
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <Card className="rounded-3xl border-border/70 bg-linear-to-br from-primary/5 via-card to-accent/5 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Scale className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t('legalStatusNotice.title')}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t('legalStatusNotice.short')}</p>
                <p className="mt-3 text-sm">
                  <Link to="/about/legal-status" className="text-primary underline-offset-4 hover:underline">
                    {t('legalStatusNotice.title')}
                  </Link>
                  {' · '}
                  <Link to="/about/world-citizenship" className="text-primary underline-offset-4 hover:underline">
                    {t('worldCitizenshipNotice.title')}
                  </Link>
                  {' · '}
                  <Link to="/documents" className="text-primary underline-offset-4 hover:underline">
                    {t('onboarding.footerDocuments')}
                  </Link>
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="rounded-3xl border-border/70 bg-linear-to-br from-primary/5 via-card to-accent/5 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Scale className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t('terms.acceptanceTitle')}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t('terms.acceptanceDescription')}</p>
                <ul className="mt-4 space-y-2">
                  {bullets.map((bullet, index) => (
                    <li key={index} className="flex gap-2 text-sm text-foreground/90">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          className="grid gap-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          {sectionKeys.map((sectionKey, index) => (
            <motion.div
              key={sectionKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.04 }}
            >
              <Card className="rounded-3xl border-border/70 bg-card/95 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {sectionKey === 'governance' || sectionKey === 'citizenship' ? (
                      <Scale className="h-5 w-5" />
                    ) : sectionKey === 'codeOfConduct' ? (
                      <FileText className="h-5 w-5" />
                    ) : (
                      <Shield className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{t(`terms.sections.${sectionKey}.title`)}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {t(`terms.sections.${sectionKey}.body`)}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground"
        >
          <p>
            {t('terms.versionLabel')}:{' '}
            <span className="font-medium text-foreground">{TERMS_ACCEPTANCE_VERSION}</span>
          </p>
          <p className="mt-1">{t('terms.versionFooterNote')}</p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
