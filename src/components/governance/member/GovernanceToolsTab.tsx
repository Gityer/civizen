import { ChevronRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Card } from '@/components/ui/card';

type Translate = (key: string) => string;

const TOOLS = [
  { icon: ShieldCheck, titleKey: 'governanceMember.stewardConsole', bodyKey: 'governanceMember.stewardConsoleBody', path: '/governance/tools/steward' },
] as const;

/** Advanced depth: the steward console, for people who can act there. */
export function GovernanceToolsTab({ t }: { t: Translate }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-3">
      {TOOLS.map((tool) => (
        <Card
          key={tool.path}
          role="link"
          tabIndex={0}
          className="cursor-pointer p-4 transition-shadow hover:shadow-elevated"
          onClick={() => navigate(tool.path)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              navigate(tool.path);
            }
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <tool.icon className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-foreground">{t(tool.titleKey)}</h2>
              <p className="text-sm text-muted-foreground">{t(tool.bodyKey)}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          </div>
        </Card>
      ))}
    </div>
  );
}
