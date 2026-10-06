import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Constants } from '@/integrations/supabase/types';
import type { ConstitutionalOfficeAssignment, ConstitutionalOfficeKey } from '@/lib/governance-ui.types';
import {
  appointConstitutionalOfficeHolder,
  endConstitutionalOfficeAssignment,
  fetchConstitutionalOfficeAssignments,
  findProfileByUsername,
  transferConstitutionalOffice,
} from '@/lib/governance-ui-utils';

const OFFICE_KEYS = Constants.public.Enums.constitutional_office_key as readonly ConstitutionalOfficeKey[];

function holderName(assignment: ConstitutionalOfficeAssignment) {
  return assignment.holder?.full_name || assignment.holder?.username || assignment.profile_id;
}

interface StewardConsoleOfficeManagementProps {
  canManage: boolean;
}

export function StewardConsoleOfficeManagement({ canManage }: StewardConsoleOfficeManagementProps) {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<ConstitutionalOfficeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState('');
  const [notes, setNotes] = useState('');
  const [endingId, setEndingId] = useState<string | null>(null);
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const [endReason, setEndReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setAssignments(await fetchConstitutionalOfficeAssignments(supabase));
    } catch (error) {
      console.error('Failed to load office assignments:', error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const formatDate = (value: string) => new Date(value).toLocaleDateString(language);

  const handleAppoint = async (officeKey: ConstitutionalOfficeKey) => {
    if (!profile?.id || !username.trim()) return;
    setBusy(true);
    try {
      const member = await findProfileByUsername(supabase, username);
      if (!member) {
        toast.error(t('governanceDashboard.offices.userNotFound'));
        return;
      }
      const result = await appointConstitutionalOfficeHolder(supabase, {
        officeKey,
        profileId: member.id,
        assignedBy: profile.id,
        notes,
      });
      if ("reason" in result) {
        toast.error(t(`governanceDashboard.offices.errors.${result.reason}`));
        return;
      }
      toast.success(t('governanceDashboard.offices.appointed'));
      setUsername('');
      setNotes('');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleEnd = async (assignment: ConstitutionalOfficeAssignment) => {
    if (!profile?.id) return;
    setBusy(true);
    try {
      const result = await endConstitutionalOfficeAssignment(supabase, {
        assignmentId: assignment.id,
        endedBy: profile.id,
        reason: endReason,
      });
      if ("reason" in result) {
        toast.error(t(`governanceDashboard.offices.errors.${result.reason}`));
        return;
      }
      toast.success(t('governanceDashboard.offices.ended'));
      setEndingId(null);
      setEndReason('');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleTransfer = async (officeKey: ConstitutionalOfficeKey) => {
    if (!username.trim()) return;
    setBusy(true);
    try {
      const member = await findProfileByUsername(supabase, username);
      if (!member) {
        toast.error(t('governanceDashboard.offices.userNotFound'));
        return;
      }
      const result = await transferConstitutionalOffice(supabase, {
        officeKey,
        newHolderId: member.id,
        reason: endReason,
        notes,
      });
      if ('reason' in result) {
        toast.error(t(`governanceDashboard.offices.errors.${result.reason}`));
        return;
      }
      toast.success(t('governanceDashboard.offices.transferred'));
      setTransferringId(null);
      setUsername('');
      setNotes('');
      setEndReason('');
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (failed) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">{t('governanceDashboard.offices.loadFailed')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t('governanceDashboard.offices.title')}</h3>
      {!canManage && <p className="text-sm text-muted-foreground">{t('governanceDashboard.offices.notAuthorized')}</p>}

      {OFFICE_KEYS.map((officeKey) => {
        const forOffice = assignments.filter((assignment) => assignment.office_key === officeKey);
        const active = forOffice.find((assignment) => assignment.is_active);
        const past = forOffice.filter((assignment) => !assignment.is_active);

        return (
          <Card key={officeKey} className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-medium capitalize">{officeKey}</h4>
              {!active && <Badge variant="outline">{t('governanceDashboard.offices.vacant')}</Badge>}
            </div>

            {active && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded bg-muted p-3">
                <div>
                  <p className="text-xs text-muted-foreground">{t('governanceDashboard.offices.holder')}</p>
                  <p className="text-sm font-medium">{holderName(active)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('governanceDashboard.offices.since', { date: formatDate(active.assigned_at) })}
                  </p>
                </div>
                {canManage &&
                  (endingId === active.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="w-full text-xs text-muted-foreground">{t('governanceDashboard.offices.confirmEnd')}</p>
                      <Input
                        className="w-56"
                        placeholder={t('governanceDashboard.offices.endReason')}
                        value={endReason}
                        onChange={(event) => setEndReason(event.target.value)}
                      />
                      <Button size="sm" variant="destructive" disabled={busy} onClick={() => void handleEnd(active)}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('governanceDashboard.offices.end')}
                      </Button>
                    </div>
                  ) : transferringId === active.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="w-full text-xs text-muted-foreground">{t('governanceDashboard.offices.transferHelp')}</p>
                      <Input
                        className="w-44"
                        placeholder={t('governanceDashboard.offices.username')}
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                      />
                      <Input
                        className="w-56"
                        placeholder={t('governanceDashboard.offices.endReason')}
                        value={endReason}
                        onChange={(event) => setEndReason(event.target.value)}
                      />
                      <Button size="sm" disabled={busy || !username.trim()} onClick={() => void handleTransfer(officeKey)}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('governanceDashboard.offices.transfer')}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setTransferringId(null)}>
                        {t('governanceDashboard.offices.cancel')}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setTransferringId(active.id)}>
                        {t('governanceDashboard.offices.transfer')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEndingId(active.id)}>
                        {t('governanceDashboard.offices.end')}
                      </Button>
                    </div>
                  ))}
              </div>
            )}

            {canManage && !active && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium">{t('governanceDashboard.offices.appointTitle')}</h5>
                <div className="flex flex-wrap gap-2">
                  <Input
                    className="w-48"
                    placeholder={t('governanceDashboard.offices.username')}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                  <Input
                    className="min-w-48 flex-1"
                    placeholder={t('governanceDashboard.offices.notes')}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                  <Button size="sm" disabled={busy || !username.trim()} onClick={() => void handleAppoint(officeKey)}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('governanceDashboard.offices.appoint')}
                  </Button>
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div className="space-y-1">
                <h5 className="text-sm font-medium">{t('governanceDashboard.offices.history')}</h5>
                {past.map((assignment) => (
                  <p key={assignment.id} className="text-xs text-muted-foreground">
                    {holderName(assignment)}
                    {assignment.ended_at &&
                      ` · ${t('governanceDashboard.offices.endedOn', { date: formatDate(assignment.ended_at) })}`}
                  </p>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
