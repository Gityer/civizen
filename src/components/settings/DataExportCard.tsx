import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadMyData } from '@/lib/data-export';

/** Privacy settings card that downloads everything Civizen keeps about the member. */
export function DataExportCard() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    if (busy || !profile?.id) return;
    setBusy(true);
    const result = await downloadMyData(profile.username);
    setBusy(false);
    if (result.ok === true) {
      toast.success(t('settings.dataExport.done'));
      return;
    }
    toast.error(t(result.reason === 'rate_limited' ? 'settings.dataExport.tooMany' : 'settings.dataExport.failed'));
  };

  return (
    <Card className="space-y-3 border-border/80 p-4" data-testid="data-export-card">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">{t('settings.dataExport.title')}</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">{t('settings.dataExport.body')}</p>
      </div>
      <Button type="button" variant="outline" size="sm" disabled={busy || !profile?.id} onClick={() => void handleDownload()}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
        {busy ? t('settings.dataExport.preparing') : t('settings.dataExport.action')}
      </Button>
    </Card>
  );
}
