import { useEffect, useState } from 'react';
import { ArrowRight, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { listCivicElections, type CivicElection } from '@/lib/civic-voting';
import { selectOpenVotes } from '@/components/study/study-open-votes';

/** Open votes list used on the Study hub. Pure view; the card loads real elections. */
export function StudyOpenVotesList({
  t,
  elections,
  loading,
  error,
  onOpen,
}: {
  t: (key: string) => string;
  elections: CivicElection[];
  loading: boolean;
  error: boolean;
  onOpen: (electionId: string) => void;
}) {
  if (loading) {
    return <p className="text-xs text-muted-foreground">{t('common.loading')}</p>;
  }
  if (error) {
    return <p className="text-xs text-muted-foreground">{t('study.openVotesLoadFailed')}</p>;
  }
  if (elections.length === 0) {
    return <p className="text-xs text-muted-foreground">{t('study.openVotesEmpty')}</p>;
  }
  return (
    <div className="space-y-2">
      {elections.map((election) => (
        <Card key={election.id} className="border-border/70 bg-background/50 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-foreground">{election.title}</p>
              {election.summary ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">{election.summary}</p>
              ) : null}
            </div>
            <Badge variant="outline" className="shrink-0 rounded-full">
              {t(`civicVoting.status.${election.status}`)}
            </Badge>
          </div>
          <div className="mt-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => onOpen(election.id)}>
              {t('study.openBallot')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function StudyOpenVotesCard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [elections, setElections] = useState<CivicElection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await listCivicElections();
      if (cancelled) return;
      setElections(selectOpenVotes(result.elections));
      setError(Boolean(result.error));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="border-border/70 bg-card/95 p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t('study.pendingVotes')}
        </h3>
      </div>
      <div className="mt-3">
        <StudyOpenVotesList
          t={t}
          elections={elections}
          loading={loading}
          error={error}
          onOpen={(electionId) => navigate(`/governance/voting/${electionId}`)}
        />
      </div>
    </Card>
  );
}
