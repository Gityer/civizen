import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, Loader2, MessageCircle, Star } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { permissionListHasAny } from '@/lib/access-control';

/** Actions on someone else's profile: endorse, message and report. */
export function UserProfileActions({ profileId }: { profileId: string }) {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [openingChat, setOpeningChat] = useState(false);
  const permissions = profile?.effective_permissions ?? [];
  const canMessage = permissionListHasAny(permissions, ['message.create']);
  const canReport = permissionListHasAny(permissions, ['report.create']);

  const openChat = async () => {
    setOpeningChat(true);
    const { data, error } = await supabase.rpc('private_get_or_create_direct_conversation', {
      p_other_profile_id: profileId,
    });
    setOpeningChat(false);
    if (error || !data) {
      const refused = /messaging_not_accepted|messaging_blocked/.test(error?.message ?? '');
      toast.error(t(refused ? 'userProfile.messageNotAccepted' : 'userProfile.messageFailed'));
      return;
    }
    navigate(`/messaging/${data as string}`);
  };

  return (
    <div className="mt-4 flex justify-center gap-2">
      <Button className="gap-2" onClick={() => navigate(`/endorse/${profileId}`)}>
        <Star className="h-4 w-4" />
        {t('userProfile.endorse')}
      </Button>
      {canMessage ? (
        <Button variant="outline" className="gap-2" disabled={openingChat} onClick={() => void openChat()}>
          {openingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          {t('userProfile.message')}
        </Button>
      ) : null}
      {canReport ? (
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(`/report/user/${profileId}`)}
          aria-label={t('settings.reportUser.title')}
          title={t('settings.reportUser.title')}
        >
          <Flag className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
