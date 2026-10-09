import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';
import { motion } from 'framer-motion';

import { StudyMarkdownReader } from '@/components/study/StudyMarkdownReader';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { PublicPageFooter } from '@/components/public/PublicPageFooter';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { docTextFor, type InstitutionalDoc } from '@/lib/institutional-docs';
import { cn } from '@/lib/utils';

type InstitutionalDocumentPageProps = {
  doc: InstitutionalDoc;
  actions?: ReactNode;
};

function reviewStatusBadgeClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'superseded') return 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200';
  if (normalized === 'archived') return 'border-muted-foreground/40 bg-muted text-muted-foreground';
  if (normalized === 'interim') return 'border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200';
  return 'border-border bg-muted/40 text-foreground';
}

export function InstitutionalDocumentPage({ doc, actions }: InstitutionalDocumentPageProps) {
  const { t, language } = useLanguage();
  const text = docTextFor(doc, language);
  usePageMeta({
    title: `Civizen — ${doc.title}`,
    description: `${doc.title} (v${doc.version}, ${doc.reviewStatus})`,
  });

  const statusLabelKey = `institutionalDocs.status.${doc.reviewStatus}` as const;
  const statusLabel = t(statusLabelKey);
  const resolvedStatusLabel = statusLabel === statusLabelKey ? doc.reviewStatus : statusLabel;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <AppPageHeader
            title={doc.title}
            subtitle={t('institutionalDocs.controllingNote')}
            padForChrome={false}
            fallbackPath="/documents"
            leading={
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileText className="h-6 w-6" aria-hidden />
              </div>
            }
          />
        </motion.header>

        <Card className="border-border/70 bg-card/95 p-5 shadow-sm">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {t('institutionalDocs.version')}
              </dt>
              <dd className="mt-1 font-medium text-foreground">{doc.version}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {t('institutionalDocs.reviewStatus')}
              </dt>
              <dd className="mt-1">
                <Badge variant="outline" className={cn('rounded-full capitalize', reviewStatusBadgeClass(doc.reviewStatus))}>
                  {resolvedStatusLabel}
                </Badge>
              </dd>
            </div>
            {doc.publicationDate ? (
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {t('institutionalDocs.published')}
                </dt>
                <dd className="mt-1 font-medium text-foreground">{doc.publicationDate}</dd>
              </div>
            ) : null}
            {doc.effectiveDate ? (
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {t('institutionalDocs.effectiveDate')}
                </dt>
                <dd className="mt-1 font-medium text-foreground">{doc.effectiveDate}</dd>
              </div>
            ) : null}
            {doc.lastUpdated ? (
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {t('institutionalDocs.lastUpdated')}
                </dt>
                <dd className="mt-1 font-medium text-foreground">{doc.lastUpdated}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {t('institutionalDocs.professionalReviewRequired')}
              </dt>
              <dd className="mt-1 font-medium text-foreground">
                {doc.professionalReviewRequired ? t('institutionalDocs.yes') : t('institutionalDocs.no')}
              </dd>
            </div>
            {doc.supersededBy ? (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {t('institutionalDocs.supersededBy')}
                </dt>
                <dd className="mt-1 font-medium text-foreground">{doc.supersededBy}</dd>
              </div>
            ) : null}
            {doc.archivedDate ? (
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {t('institutionalDocs.archivedDate')}
                </dt>
                <dd className="mt-1 font-medium text-foreground">{doc.archivedDate}</dd>
              </div>
            ) : null}
          </dl>
        </Card>

        <Card className="border-border/70 bg-card/95 p-5 shadow-sm">
          {text.translated ? (
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground" data-testid="institutional-doc-translation-note">
              {t('institutionalDocs.translationNote')}
            </p>
          ) : null}
          <StudyMarkdownReader
            title={text.title}
            badgeLabel={doc.reviewStatus}
            markdown={text.markdown}
            embedded
            showHeader={false}
          />
        </Card>

        {actions}

        <PublicPageFooter />
      </div>
    </div>
  );
}
