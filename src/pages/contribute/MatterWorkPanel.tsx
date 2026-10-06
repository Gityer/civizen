import { type MatterWorkPanelProps } from '@/pages/contribute/matter-work-panel/matter-work-panel-shared';
import { useMatterWorkPanel } from '@/pages/contribute/matter-work-panel/useMatterWorkPanel';
import { MatterWorkGroups } from '@/pages/contribute/matter-work-panel/MatterWorkGroups';
import { MatterWorkManage, MatterWorkAddTask, MatterWorkDecision } from '@/pages/contribute/matter-work-panel/MatterWorkForms';

export function MatterWorkPanel({ bundle, profileId, linkedIds, canManageWork, busy, onBusy, onReload, t }: MatterWorkPanelProps) {
  const model = useMatterWorkPanel({ bundle, profileId, linkedIds, canManageWork, busy, onBusy, onReload, t });

  return (
    <div className="space-y-5">
      <MatterWorkGroups model={model} />

      <MatterWorkManage model={model} />

      <MatterWorkAddTask model={model} />

      <MatterWorkDecision model={model} />
    </div>
  );
}
