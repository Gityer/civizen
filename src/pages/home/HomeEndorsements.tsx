import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Briefcase, Sparkles, Star, Users } from 'lucide-react';
import type { useHome } from '@/pages/home/useHome';

type HomeModel = ReturnType<typeof useHome>;

export function HomeEndorsements({ model }: { model: HomeModel }) {
  const {
    recentEndorsements, profile, t, navigate, showRecentEndorsements, getInitials, getPillarName,
  } = model;
  return (
    <>
    {showRecentEndorsements ? (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
      <h2 className="mb-3 text-lg font-semibold text-foreground">{t('home.recentActivity')}</h2>
      {recentEndorsements.length === 0 ? (
        <Card className="p-6 text-center">
          <Star className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="font-medium text-foreground">{t('home.noActivityYet')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('home.activityBuildingHint')}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('/profile')}>
              <Briefcase className="h-3.5 w-3.5" />
              {t('home.addExperience')}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('/profile')}>
              <Sparkles className="h-3.5 w-3.5" />
              {t('home.addSkill')}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('/profile')}>
              <Users className="h-3.5 w-3.5" />
              {t('home.addContribution')}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => navigate('/profile')}>
              {t('home.addQualification')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/search?tab=people')}>
              {t('home.requestEndorsement')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {recentEndorsements.map((endorsement, index) => (
            <motion.div
              key={endorsement.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
            >
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={endorsement.endorser?.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                      {getInitials(endorsement.endorser?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      {t('home.endorsedYouOn', {
                        person: endorsement.endorser?.full_name || t('home.someone'),
                        pillar: getPillarName(endorsement.pillar),
                      })}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < endorsement.stars
                              ? 'fill-accent text-accent'
                              : 'text-muted-foreground/30'
                          }`}
                        />
                      ))}
                    </div>
                      {endorsement.comment && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          "{endorsement.comment}"
                        </p>
                      )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
      </motion.div>
    ) : null}
    </>
  );
}
