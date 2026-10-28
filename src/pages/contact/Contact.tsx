import type React from 'react';
import { AlertTriangle, BookOpen, Flag, Globe, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { contactEmail } from '@/lib/contact';
import { ContactForm } from '@/pages/contact/ContactForm';

const WEBSITE_URL = 'https://civizen.world';

const SECTIONS = [
  { icon: ShieldCheck, to: '/moderation?tab=mine', titleKey: 'contact.decisions.title', bodyKey: 'contact.decisions.body', linkKey: 'contact.decisions.link' },
  { icon: Flag, to: '/guidelines', titleKey: 'contact.report.title', bodyKey: 'contact.report.body', linkKey: 'contact.report.link' },
  { icon: BookOpen, to: '/settings/help', titleKey: 'contact.help.title', bodyKey: 'contact.help.body', linkKey: 'contact.help.link' },
  { icon: Lock, to: '/privacy', titleKey: 'contact.privacy.title', bodyKey: 'contact.privacy.body', linkKey: 'contact.privacy.link' },
] as const;

function PublicContactShell({ children }: { hideNav?: boolean; children: React.ReactNode }) {
  return (
    <PublicPageShell showFooter contentClassName="pb-16">
      {children}
    </PublicPageShell>
  );
}

function SectionCard({ icon: Icon, title, children, testId }: { icon: typeof Mail; title: string; children: React.ReactNode; testId?: string }) {
  return (
    <Card className="rounded-3xl border-border/70 bg-card/95 p-5 shadow-sm" data-testid={testId}>
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {children}
        </div>
      </div>
    </Card>
  );
}

/**
 * Contact (owner decision 2026-10-27): the address the Privacy Notice refers to, plus the in-app routes for each kind
 * of question, and a plain note that Civizen is not an emergency service.
 */
export default function Contact() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const email = contactEmail();
  const Shell = user ? AppLayout : PublicContactShell;
  const linkClass = 'text-sm font-medium text-primary underline-offset-4 hover:underline';

  return (
    <Shell hideNav={false}>
      <div className="space-y-4 px-4 py-6">
        <AppPageHeader
          title={t('contact.title')}
          subtitle={t('contact.subtitle')}
          leading={
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Mail className="h-7 w-7" />
            </div>
          }
        />

        <SectionCard icon={Mail} title={t('contact.email.title')} testId="contact-email">
          <p className="text-sm leading-6 text-muted-foreground">{t('contact.email.body')}</p>
          <ContactForm />
          {email ? (
            <p className="text-sm text-muted-foreground">{t('contact.orWrite')} <a href={`mailto:${email}`} className={linkClass}>{email}</a></p>
          ) : null}
        </SectionCard>

        {SECTIONS.map((section) => (
          <SectionCard key={section.to} icon={section.icon} title={t(section.titleKey)}>
            <p className="text-sm leading-6 text-muted-foreground">{t(section.bodyKey)}</p>
            <Link to={section.to} className={linkClass}>
              {t(section.linkKey)}
            </Link>
          </SectionCard>
        ))}

        <SectionCard icon={AlertTriangle} title={t('contact.safety.title')} testId="contact-safety">
          <p className="text-sm leading-6 text-muted-foreground">{t('contact.safety.body')}</p>
        </SectionCard>

        <p className="px-1 text-sm text-muted-foreground">
          <Link to="/organisation" className={linkClass}>{t('contact.organisation')}</Link>
        </p>

        <p className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
          <Globe className="h-4 w-4" aria-hidden />
          {t('contact.website')}:{' '}
          <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>civizen.world</a>
        </p>
      </div>
    </Shell>
  );
}
