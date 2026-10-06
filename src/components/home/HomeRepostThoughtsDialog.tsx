import { useEffect, useState } from 'react';

import { HomePostEmbeddedOriginal } from '@/components/home/HomePostEmbeddedOriginal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PostPreview } from '@/lib/post-reposts';

type HomeRepostThoughtsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeName: string;
  activeAvatarUrl?: string | null;
  postingAsLabel: string;
  title: string;
  placeholder: string;
  cancelLabel: string;
  postLabel: string;
  postingLabel: string;
  originalBadgeLabel: string;
  unavailableLabel: string;
  seeFullLabel: string;
  original: PostPreview | null;
  /** Prepared unpublished draft — applied when the dialog opens; never auto-posted. */
  initialDraft?: string;
  onSubmit: (commentary: string) => Promise<void>;
  onOpenOriginal: () => void;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function HomeRepostThoughtsDialog({
  open,
  onOpenChange,
  activeName,
  activeAvatarUrl,
  postingAsLabel,
  title,
  placeholder,
  cancelLabel,
  postLabel,
  postingLabel,
  originalBadgeLabel,
  unavailableLabel,
  seeFullLabel,
  original,
  initialDraft = '',
  onSubmit,
  onOpenOriginal,
}: HomeRepostThoughtsDialogProps) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(initialDraft || '');
  }, [open, initialDraft, original?.id]);

  const close = () => {
    if (busy) return;
    setDraft('');
    onOpenChange(false);
  };

  const submit = async () => {
    const next = draft.trim();
    if (!next || busy) return;
    setBusy(true);
    try {
      await onSubmit(next);
      setDraft('');
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {postingAsLabel}: <span className="font-medium text-foreground">{activeName}</span>
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={activeAvatarUrl || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary">{initials(activeName)}</AvatarFallback>
            </Avatar>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={placeholder}
              rows={4}
              className="min-h-24 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              disabled={busy}
            />
          </div>

          <HomePostEmbeddedOriginal
            original={original}
            unavailableLabel={unavailableLabel}
            originalBadgeLabel={originalBadgeLabel}
            seeFullLabel={seeFullLabel}
            onOpenFull={onOpenOriginal}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={close} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={busy || !draft.trim()}>
            {busy ? postingLabel : postLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
