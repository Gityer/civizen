import { formatDueDate, type MatterActionRequirement } from '@/lib/matters';
import { type MatterDetailBundle } from '@/lib/matters-api';
import { type CollaborationTask } from '@/lib/matters-work';

export function dueLine(action: MatterActionRequirement | null | undefined): string {
  if (!action?.dueAt) return '';
  return `Due ${formatDueDate(action.dueAt)}.`;
}

export function taskActionFor(task: CollaborationTask, pending: MatterActionRequirement[]): MatterActionRequirement | null {
  return pending.find((row) => row.contextKind === 'task' && row.contextId === task.id) ?? null;
}

export type MatterWorkPanelProps = {
  bundle: MatterDetailBundle;
  profileId: string;
  linkedIds: string[];
  canManageWork: boolean;
  busy: boolean;
  onBusy: (value: boolean) => void;
  onReload: () => Promise<void>;
  t: (key: string) => string;
};
