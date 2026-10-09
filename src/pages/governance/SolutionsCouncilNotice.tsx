import { Loader2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import type { SolutionTurn } from '@/lib/solutions-api';
import { unavailableSpeakersInLatestRound } from '@/lib/solutions-council-client';

const AGENT_NAMES: Record<string, string> = { chatgpt: 'ChatGPT', gemini: 'Gemini', claude: 'Claude' };

type Props = {
  status: string;
  turns: readonly SolutionTurn[];
  t: (key: string, params?: Record<string, string | number>) => string;
};

/** Tells members what the council is doing and which agents are missing, instead of a spinner that never ends. */
export function SolutionsCouncilNotice({ status, turns, t }: Props) {
  const unavailable = unavailableSpeakersInLatestRound(turns).map((speaker) => AGENT_NAMES[speaker] ?? speaker);
  const agentTurns = turns.some((turn) => turn.speaker !== 'citizen');
  return (
    <div className="space-y-2" data-testid="solutions-council-notice">
      {status === 'debating' ? (
        <Card className="flex items-center gap-2 rounded-2xl border-border/60 p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          {t('solutions.debatingHint')}
        </Card>
      ) : null}
      {status === 'open' && !agentTurns ? (
        <p className="text-xs text-muted-foreground">{t('solutions.councilIdle')}</p>
      ) : null}
      {unavailable.length > 0 ? (
        <p className="text-xs text-muted-foreground" data-testid="solutions-council-partial">
          {t('solutions.councilPartial', { names: unavailable.join(', ') })}
        </p>
      ) : null}
    </div>
  );
}
