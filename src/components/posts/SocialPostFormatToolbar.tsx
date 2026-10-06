import type { RefObject } from 'react';
import { useState } from 'react';
import { AlignVerticalSpaceAround, Bold, Italic, List, ListOrdered, Underline } from 'lucide-react';

import { FormatFlyout, FormatMenuItem, FormatToolButton } from '@/components/rich-text/format-toolbar';
import { applyRichTextCommand } from '@/components/rich-text/rich-text-commands';
import { useLanguage } from '@/contexts/LanguageContext';
import { applyPostSpacing, type PostSpacingPreset } from '@/lib/posts-html';
import { cn } from '@/lib/utils';

type SocialPostFormatToolbarProps = {
  editorRef: RefObject<HTMLElement | null>;
  onCommand?: () => void;
  className?: string;
};

export function SocialPostFormatToolbar({ editorRef, onCommand, className }: SocialPostFormatToolbarProps) {
  const { t } = useLanguage();
  const [menu, setMenu] = useState<string | null>(null);

  const run = (command: string) => {
    applyRichTextCommand(editorRef.current, command);
    onCommand?.();
  };

  const setSpacing = (preset: PostSpacingPreset) => {
    applyPostSpacing(editorRef.current, preset);
    setMenu(null);
    onCommand?.();
  };

  return (
    <div
      role="toolbar"
      aria-label={t('agreements.format.toolbar')}
      data-post-format-toolbar=""
      className={cn(
        'flex max-w-full shrink-0 flex-wrap items-center gap-1 rounded-full bg-zinc-900 px-1.5 py-1 shadow-lg',
        className,
      )}
      onMouseDown={(event) => event.preventDefault()}
      onPointerDown={(event) => event.preventDefault()}
    >
      <FormatToolButton label={t('agreements.format.bold')} onClick={() => run('bold')}>
        <Bold className="h-3.5 w-3.5" />
      </FormatToolButton>
      <FormatToolButton label={t('agreements.format.italic')} onClick={() => run('italic')}>
        <Italic className="h-3.5 w-3.5" />
      </FormatToolButton>
      <FormatToolButton label={t('agreements.format.underline')} onClick={() => run('underline')}>
        <Underline className="h-3.5 w-3.5" />
      </FormatToolButton>
      <FormatToolButton label={t('agreements.format.listBullets')} onClick={() => run('insertUnorderedList')}>
        <List className="h-3.5 w-3.5" />
      </FormatToolButton>
      <FormatToolButton label={t('agreements.format.listNumbers')} onClick={() => run('insertOrderedList')}>
        <ListOrdered className="h-3.5 w-3.5" />
      </FormatToolButton>
      <FormatFlyout
        id="spacing"
        label={t('agreements.format.spacing')}
        menu={menu}
        setMenu={setMenu}
        placement="up"
        openOnHover={false}
        icon={<AlignVerticalSpaceAround className="h-3.5 w-3.5" />}
      >
        <FormatMenuItem label={t('agreements.format.spacingTight')} onClick={() => setSpacing('tight')}>
          {t('agreements.format.spacingTight')}
        </FormatMenuItem>
        <FormatMenuItem label={t('agreements.format.spacingDefault')} onClick={() => setSpacing('default')}>
          {t('agreements.format.spacingDefault')}
        </FormatMenuItem>
        <FormatMenuItem label={t('agreements.format.spacingLoose')} onClick={() => setSpacing('loose')}>
          {t('agreements.format.spacingLoose')}
        </FormatMenuItem>
      </FormatFlyout>
    </div>
  );
}
