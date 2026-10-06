import type { RefObject } from 'react';

import { SocialPostFormatToolbar } from '@/components/posts/SocialPostFormatToolbar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type HomePostInlineEditorProps = {
  editorRef: RefObject<HTMLDivElement | null>;
  disabled?: boolean;
  ariaLabel: string;
  cancelLabel: string;
  saveLabel: string;
  savingLabel: string;
  saving?: boolean;
  canSave: boolean;
  onLiveChange: (html: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function HomePostInlineEditor({
  editorRef,
  disabled,
  ariaLabel,
  cancelLabel,
  saveLabel,
  savingLabel,
  saving,
  canSave,
  onLiveChange,
  onCancel,
  onSave,
}: HomePostInlineEditorProps) {
  return (
    <div className="space-y-2" data-home-post-inline-editor="">
      <div className="rounded-2xl border border-primary/40 bg-background px-3 py-2.5 ring-2 ring-primary/10">
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
          contentEditable={!disabled}
          tabIndex={disabled ? -1 : 0}
          suppressContentEditableWarning
          className={cn(
            'min-h-16 w-full whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-foreground outline-none',
            '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
          )}
          onInput={(event) => onLiveChange(event.currentTarget.innerHTML || '')}
          onPaste={(event) => {
            event.preventDefault();
            const text = event.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
            if (editorRef.current) onLiveChange(editorRef.current.innerHTML || '');
          }}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              onSave();
            }
          }}
        />
      </div>
      <SocialPostFormatToolbar
        editorRef={editorRef}
        onCommand={() => {
          if (editorRef.current) onLiveChange(editorRef.current.innerHTML || '');
        }}
      />
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-11 shrink-0 rounded-2xl px-3 sm:h-12 sm:px-4"
          onClick={onCancel}
          disabled={disabled}
        >
          {cancelLabel}
        </Button>
        <Button
          size="sm"
          className="h-11 shrink-0 rounded-2xl bg-primary px-4 text-primary-foreground shadow-sm hover:bg-primary/90 sm:h-12 sm:px-5"
          onClick={onSave}
          disabled={disabled || !canSave}
        >
          {saving ? savingLabel : saveLabel}
        </Button>
      </div>
    </div>
  );
}
