import { Flag, Star } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ReportUserDialog } from '@/components/profile/ReportUserDialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

type UserProfileActionsProps = {
  viewerProfileId: string;
  profileId: string;
  profileName: string;
};

/** Endorse and report another member from their public profile. */
export function UserProfileActions({ viewerProfileId, profileId, profileName }: UserProfileActionsProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="mt-4 flex justify-center gap-2">
      <Button className="gap-2" onClick={() => navigate(`/endorse/${profileId}`)}>
        <Star className="h-4 w-4" />
        {t('userProfile.endorse')}
      </Button>
      <Button variant="outline" size="icon" aria-label={t('userProfile.reportTitle')} onClick={() => setReportOpen(true)}>
        <Flag className="h-4 w-4" />
      </Button>
      <ReportUserDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        reporterProfileId={viewerProfileId}
        reportedProfileId={profileId}
        reportedName={profileName}
      />
    </div>
  );
}
