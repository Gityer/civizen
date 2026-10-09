import { motion } from 'framer-motion';

import { PillarBadge } from '@/components/ui/PillarBadge';
import { PILLARS } from '@/lib/constants';
import type { calculateCivizenScore } from '@/lib/scoring';

/** Endorsement badges per pillar; the profile page shows it only when the owner allows (step 3.7). */
export function EndorsementPillarGrid({ title, pillarScore }: { title: string; pillarScore: ReturnType<typeof calculateCivizenScore> }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} data-testid="endorsement-pillar-grid">
      <h2 className="mb-4 text-lg font-semibold text-foreground">{title}</h2>
      <div className="grid grid-cols-3 gap-3">
        {PILLARS.map((pillar, index) => {
          const match = pillarScore.pillars.find((p) => p.pillar === pillar.id);
          return (
            <motion.div key={pillar.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + index * 0.05 }}>
              <PillarBadge pillarId={pillar.id} score={match?.score} endorsementCount={match?.endorsementCount} size="sm" />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
