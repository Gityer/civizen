import { ReportContentDialog } from '@/components/moderation/ReportContentDialog';

type ReportUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Kept for callers; the server records the signed-in member as the reporter. */
  reporterProfileId: string;
  reportedProfileId: string;
  reportedName: string;
};

/** Report another member from their public profile; goes to the same moderation queue as every other report. */
export function ReportUserDialog({ open, onOpenChange, reportedProfileId, reportedName }: ReportUserDialogProps) {
  return (
    <ReportContentDialog
      open={open}
      onOpenChange={onOpenChange}
      targetKind="user"
      targetId={reportedProfileId}
      subject={reportedName}
    />
  );
}
