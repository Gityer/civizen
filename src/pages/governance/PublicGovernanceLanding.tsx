import { Link } from 'react-router-dom';
import { Vote, FileText, BookOpen, Lightbulb } from 'lucide-react';

import { PublicPageShell } from '@/components/public/PublicPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';

/**
 * Public Governance entry for visitors and members.
 * Election catalogs are public; member proposal workspace stays sign-in gated.
 */
export default function PublicGovernanceLanding() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const governanceLabel = t('civicVoting.publicLanding.title');

  usePageMeta({
    title: t('civicVoting.publicLanding.metaTitle'),
    description: t('civicVoting.publicLanding.metaDescription'),
  });

  return (
    <PublicPageShell
      contentClassName="px-6 pb-16 sm:px-8"
      layout="directory"
      showFooter
      sectionTrail={[{ label: governanceLabel }]}
    >
      <div className="space-y-6 pt-2">
        <p className="text-sm text-muted-foreground sm:text-base">
          {t('civicVoting.publicLanding.subtitle')}
        </p>

        <Card className="rounded-2xl border-border/60 p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">{t('civicVoting.institutionalNotice')}</p>
        </Card>

        <Card className="rounded-2xl border-border/60 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Vote className="h-4 w-4" />
            <h1 className="text-base font-semibold text-foreground">
              {t('civicVoting.publicLanding.electionsTitle')}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('civicVoting.publicLanding.electionsBody')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{t('civicVoting.publicLanding.badgePublic')}</Badge>
            <Badge variant="outline">{t('civicVoting.publicLanding.badgeSample')}</Badge>
          </div>
          <Button type="button" asChild>
            <Link to="/governance/voting">{t('civicVoting.publicLanding.openElections')}</Link>
          </Button>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="rounded-2xl border-border/60 p-4 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="h-4 w-4" />
              <h2 className="text-sm font-semibold text-foreground">
                {t('civicVoting.publicLanding.charterTitle')}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">{t('civicVoting.publicLanding.charterBody')}</p>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link to="/governance/charter">{t('civicVoting.publicLanding.readCharter')}</Link>
            </Button>
          </Card>
          <Card className="rounded-2xl border-border/60 p-4 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="h-4 w-4" />
              <h2 className="text-sm font-semibold text-foreground">
                {t('civicVoting.publicLanding.aboutTitle')}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">{t('civicVoting.publicLanding.aboutBody')}</p>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link to="/governance/about">{t('civicVoting.publicLanding.readAbout')}</Link>
            </Button>
          </Card>
        </div>

        {user ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="rounded-2xl border-border/60 p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Lightbulb className="h-4 w-4" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t('civicVoting.publicLanding.solutionsTitle')}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">{t('civicVoting.publicLanding.solutionsBody')}</p>
              <Button type="button" variant="secondary" asChild>
                <Link to="/governance/solutions">{t('civicVoting.publicLanding.openSolutions')}</Link>
              </Button>
            </Card>
            <Card className="rounded-2xl border-border/60 p-4 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-foreground">
                {t('civicVoting.publicLanding.memberTitle')}
              </h2>
              <p className="text-xs text-muted-foreground">{t('civicVoting.publicLanding.memberBody')}</p>
              <Button type="button" variant="secondary" asChild>
                <Link to="/governance">{t('civicVoting.publicLanding.openWorkspace')}</Link>
              </Button>
            </Card>
          </div>
        ) : (
          <Card className="rounded-2xl border-dashed border-border/70 p-4 shadow-none space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              {t('civicVoting.publicLanding.signInTitle')}
            </h2>
            <p className="text-xs text-muted-foreground">{t('civicVoting.publicLanding.signInBody')}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" asChild>
                <Link to="/login">{t('civicVoting.publicLanding.signIn')}</Link>
              </Button>
              <Button type="button" size="sm" variant="outline" asChild>
                <Link to="/signup">{t('civicVoting.publicLanding.signUp')}</Link>
              </Button>
            </div>
          </Card>
        )}

        <p className="text-sm text-muted-foreground">
          <Link
            to="/areas"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            {t('civicVoting.publicLanding.areasLink')}
          </Link>
        </p>
      </div>
    </PublicPageShell>
  );
}
