import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Globe2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { PublicPageFooter } from '@/components/public/PublicPageFooter';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { onboardingSectionTitleClass } from '@/components/public/onboarding-styles';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { CIVIZEN_REPO_URL, MATURE_HUMANITY_BOOK_URL } from '@/lib/onboarding-links';
import { cn } from '@/lib/utils';

function ProseParagraph({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-base leading-relaxed text-foreground/90 sm:text-lg', className)}>{children}</p>;
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className={cn(onboardingSectionTitleClass, 'scroll-mt-24 text-2xl sm:text-3xl')}>
      {children}
    </h2>
  );
}

function PullQuote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <blockquote className={cn('border-l-4 border-primary/60 py-1 pl-5 sm:pl-6', className)}>
      <p className="text-lg font-semibold leading-relaxed text-foreground sm:text-xl">{children}</p>
    </blockquote>
  );
}

function PrincipleList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-base leading-relaxed text-foreground/90 sm:text-lg">
          <Check className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ActionButtons({
  joinLabel,
  bookLabel,
  sourceLabel,
  backLabel,
}: {
  joinLabel: string;
  bookLabel: string;
  sourceLabel: string;
  backLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <Button asChild className="h-11 min-h-11 flex-1 gap-2 dark:shadow-glow">
          <Link to="/signup">
            {joinLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="secondary" className="h-11 min-h-11 flex-1">
          <a href={MATURE_HUMANITY_BOOK_URL} target="_blank" rel="noopener noreferrer">
            {bookLabel}
          </a>
        </Button>
      </div>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <a
          href={CIVIZEN_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {sourceLabel}
        </a>
        <Button asChild variant="ghost" className="h-11 min-h-11 px-3 text-muted-foreground">
          <Link to="/onboarding">{backLabel}</Link>
        </Button>
      </div>
    </div>
  );
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export default function WhyThisExists() {
  const { t, getNode } = useLanguage();
  const prefersReducedMotion = useReducedMotion();

  const sharedFutureParagraphs = stringArray(getNode('whyThisExists.sharedFutureParagraphs'));
  const costOfDivisionParagraphs = stringArray(getNode('whyThisExists.costOfDivisionParagraphs'));
  const maturityParagraphs = stringArray(getNode('whyThisExists.maturityParagraphs'));
  const proposalParagraphs = stringArray(getNode('whyThisExists.proposalParagraphs'));
  const proposalItems = stringArray(getNode('whyThisExists.proposalItems'));
  const proposalClosingParagraphs = stringArray(getNode('whyThisExists.proposalClosingParagraphs'));
  const diversityParagraphs = stringArray(getNode('whyThisExists.diversityParagraphs'));
  const sharedAreas = stringArray(getNode('whyThisExists.sharedAreas'));
  const diversityClosingParagraphs = stringArray(getNode('whyThisExists.diversityClosingParagraphs'));
  const buildParagraphs = stringArray(getNode('whyThisExists.buildParagraphs'));
  const buildClosingParagraphs = stringArray(getNode('whyThisExists.buildClosingParagraphs'));
  const bookParagraphs = stringArray(getNode('whyThisExists.bookParagraphs'));
  const invitationParagraphs = stringArray(getNode('whyThisExists.invitationParagraphs'));
  const invitationActions = stringArray(getNode('whyThisExists.invitationActions'));
  const invitationClosingParagraphs = stringArray(getNode('whyThisExists.invitationClosingParagraphs'));

  usePageMeta({
    title: t('whyThisExists.pageTitle'),
    description: t('whyThisExists.pageDescription'),
  });

  return (
    <PublicPageShell
      contentClassName="px-6 pb-12 pt-2 sm:px-8"
      sectionTrail={[{ label: t('whyThisExists.title') }]}
    >
      <motion.article
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.45 }}
        className="mx-auto max-w-3xl space-y-10 sm:space-y-12"
      >
        <header className="space-y-3 border-b border-border/40 pb-8">
          <AppPageHeader
            title={t('whyThisExists.title')}
            subtitle={t('whyThisExists.subtitle')}
            padForChrome={false}
            fallbackPath="/"
            titleClassName={cn(onboardingSectionTitleClass, 'text-3xl sm:text-4xl')}
            leading={
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Globe2 className="h-5 w-5" aria-hidden />
              </div>
            }
          />
        </header>

        <section aria-labelledby="shared-future" className="space-y-5">
          <SectionHeading id="shared-future">{t('whyThisExists.sharedFutureTitle')}</SectionHeading>
          {sharedFutureParagraphs.map((paragraph) => (
            <ProseParagraph key={paragraph}>{paragraph}</ProseParagraph>
          ))}
          <PullQuote>{t('whyThisExists.centralQuestion')}</PullQuote>
        </section>

        <section aria-labelledby="cost-of-division" className="space-y-5">
          <SectionHeading id="cost-of-division">{t('whyThisExists.costOfDivisionTitle')}</SectionHeading>
          {costOfDivisionParagraphs.map((paragraph) => (
            <ProseParagraph key={paragraph}>{paragraph}</ProseParagraph>
          ))}
        </section>

        <section aria-labelledby="mature-way-to-live" className="space-y-5">
          <SectionHeading id="mature-way-to-live">{t('whyThisExists.maturityTitle')}</SectionHeading>
          {maturityParagraphs.map((paragraph) => (
            <ProseParagraph key={paragraph}>{paragraph}</ProseParagraph>
          ))}
        </section>

        <section aria-labelledby="what-civizen-proposes" className="space-y-5">
          <SectionHeading id="what-civizen-proposes">{t('whyThisExists.proposalTitle')}</SectionHeading>
          {proposalParagraphs.map((paragraph) => (
            <ProseParagraph key={paragraph}>{paragraph}</ProseParagraph>
          ))}
          <PrincipleList items={proposalItems} />
          {proposalClosingParagraphs.map((paragraph) => (
            <ProseParagraph key={paragraph}>{paragraph}</ProseParagraph>
          ))}
        </section>

        <section
          aria-labelledby="unity-without-erasing-diversity"
          className="space-y-5 rounded-[1.75rem] border border-primary/20 bg-linear-to-br from-primary/8 via-card/60 to-accent/5 p-5 sm:p-6"
        >
          <SectionHeading id="unity-without-erasing-diversity">{t('whyThisExists.diversityTitle')}</SectionHeading>
          {diversityParagraphs.map((paragraph) => (
            <ProseParagraph key={paragraph}>{paragraph}</ProseParagraph>
          ))}
          <ProseParagraph>{t('whyThisExists.sharedAreasIntro')}</ProseParagraph>
          <PrincipleList items={sharedAreas} />
          {diversityClosingParagraphs.map((paragraph) => (
            <ProseParagraph key={paragraph}>{paragraph}</ProseParagraph>
          ))}
        </section>

        <section aria-labelledby="how-civizen-must-be-built" className="space-y-5">
          <SectionHeading id="how-civizen-must-be-built">{t('whyThisExists.buildTitle')}</SectionHeading>
          {buildParagraphs.map((paragraph) => (
            <ProseParagraph key={paragraph}>{paragraph}</ProseParagraph>
          ))}
          <PullQuote className="border-accent/60 bg-accent/5 py-3 pr-4">{t('whyThisExists.founderQuote')}</PullQuote>
          {buildClosingParagraphs.map((paragraph) => (
            <ProseParagraph key={paragraph}>{paragraph}</ProseParagraph>
          ))}
        </section>

        <section aria-labelledby="from-idea-to-system" className="space-y-5">
          <SectionHeading id="from-idea-to-system">{t('whyThisExists.bookTitle')}</SectionHeading>
          {bookParagraphs.map((paragraph) => (
            <ProseParagraph key={paragraph}>{paragraph}</ProseParagraph>
          ))}
        </section>

        <section aria-labelledby="build-together" className="space-y-5">
          <SectionHeading id="build-together">{t('whyThisExists.invitationTitle')}</SectionHeading>
          {invitationParagraphs.map((paragraph) => (
            <ProseParagraph key={paragraph}>{paragraph}</ProseParagraph>
          ))}
          <ul className="space-y-3">
            {invitationActions.map((action) => (
              <li key={action} className="flex gap-3 text-base leading-relaxed text-foreground/90 sm:text-lg">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <span>{action}</span>
              </li>
            ))}
          </ul>
          {invitationClosingParagraphs.map((paragraph, index) => (
            <p
              key={paragraph}
              className={cn(
                'text-lg font-semibold leading-relaxed sm:text-xl',
                index === invitationClosingParagraphs.length - 1 ? 'text-primary' : 'text-foreground',
              )}
            >
              {paragraph}
            </p>
          ))}
        </section>

        <section aria-label={t('whyThisExists.joinCta')} className="space-y-4">
          <ActionButtons
            joinLabel={t('whyThisExists.joinCta')}
            bookLabel={t('whyThisExists.bookCta')}
            sourceLabel={t('whyThisExists.sourceCta')}
            backLabel={t('whyThisExists.backToHome')}
          />
        </section>

        <PublicPageFooter />
      </motion.article>
    </PublicPageShell>
  );
}
