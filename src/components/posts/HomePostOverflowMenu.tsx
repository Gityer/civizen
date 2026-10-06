import type { ReactNode } from 'react';
import { EyeOff, Flag, Pencil, Trash2, MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type HomePostOverflowMenuProps = {
  moreLabel: string;
  editLabel: string;
  deleteLabel: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  /** Shown on other people's posts. */
  reportLabel?: string;
  hideLabel?: string;
  onReport?: () => void;
  onHide?: () => void;
};

function IconMenuItem({
  label,
  testId,
  className,
  onSelect,
  children,
}: {
  label: string;
  testId: string;
  className?: string;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenuItem
          data-testid={testId}
          aria-label={label}
          title={label}
          className={className}
          onSelect={onSelect}
        >
          {children}
          <span className="sr-only">{label}</span>
        </DropdownMenuItem>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function HomePostOverflowMenu({
  moreLabel,
  editLabel,
  deleteLabel,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  reportLabel,
  hideLabel,
  onReport,
  onHide,
}: HomePostOverflowMenuProps) {
  if (!canEdit && !canDelete && !onReport && !onHide) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 shrink-0 rounded-md p-0 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            aria-label={moreLabel}
            title={moreLabel}
            data-testid="home-post-overflow"
            data-post-can-edit={canEdit ? 'true' : 'false'}
            data-post-can-delete={canDelete ? 'true' : 'false'}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-0 p-1">
          {canEdit ? (
            <IconMenuItem
              label={editLabel}
              testId="home-post-edit"
              className="flex h-9 w-9 cursor-pointer items-center justify-center p-0"
              onSelect={() => onEdit()}
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </IconMenuItem>
          ) : null}
          {canDelete ? (
            <IconMenuItem
              label={deleteLabel}
              testId="home-post-delete"
              className="flex h-9 w-9 cursor-pointer items-center justify-center p-0 text-destructive focus:text-destructive"
              onSelect={() => onDelete()}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </IconMenuItem>
          ) : null}
          {onHide && hideLabel ? (
            <IconMenuItem
              label={hideLabel}
              testId="home-post-hide"
              className="flex h-9 w-9 cursor-pointer items-center justify-center p-0"
              onSelect={() => onHide()}
            >
              <EyeOff className="h-4 w-4" aria-hidden />
            </IconMenuItem>
          ) : null}
          {onReport && reportLabel ? (
            <IconMenuItem
              label={reportLabel}
              testId="home-post-report"
              className="flex h-9 w-9 cursor-pointer items-center justify-center p-0 text-destructive focus:text-destructive"
              onSelect={() => onReport()}
            >
              <Flag className="h-4 w-4" aria-hidden />
            </IconMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
