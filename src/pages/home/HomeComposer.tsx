import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { focusHomePostComposerFromChrome } from '@/lib/home-post-composer-focus';
import { SocialPostFormatToolbar } from '@/components/posts/SocialPostFormatToolbar';
import { cn } from '@/lib/utils';
import { SlowRunningText } from '@/components/ui/slow-running-text';
import type { useHome } from '@/pages/home/useHome';

type HomeModel = ReturnType<typeof useHome>;

export function HomeComposer({ model }: { model: HomeModel }) {
  const {
    isPosting, isComposerFocused, setIsComposerFocused, editingPost, isSavingEdit, profile, t,
    postEditorRef, postContentRef, composerPlain, canPost, composerPlaceholder, emitPostEditor,
    persistPostDraft, clearPostComposerDraft, showComposer, getInitials, createPost, cancelEditPost,
    saveEditedPost,
  } = model;
  return (
    <>
    {showComposer && !editingPost ? (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card
          data-home-post-composer-card=""
          data-home-composer-focused={isComposerFocused || editingPost ? 'true' : 'false'}
          data-home-composer-editing={editingPost ? 'true' : 'false'}
          className={`p-3 transition-all duration-200 sm:p-4 ${
            isComposerFocused
              ? 'border-primary/20 shadow-md shadow-primary/10 -translate-y-0.5'
              : 'border-border/80 shadow-none'
          }`}
        >
          <div
            className={cn(
              'flex min-w-0 gap-2 sm:gap-3',
              canPost || editingPost || isComposerFocused ? 'flex-col' : 'items-center',
            )}
          >
            <div
              data-home-post-composer=""
              className={cn(
                'relative min-w-0 flex-1 overflow-hidden rounded-2xl border px-3 py-2.5 transition-[border-color,box-shadow,background-color] sm:px-4 sm:py-3',
                canPost
                  ? 'border-primary/30 bg-primary/5 shadow-sm'
                  : 'border-border bg-background',
                isComposerFocused && 'border-primary/60 ring-2 ring-primary/10',
              )}
              onMouseDown={(event) => {
                const movedFocus = focusHomePostComposerFromChrome(event, postEditorRef.current, {
                  disabled: isPosting || isSavingEdit,
                });
                if (
                  movedFocus ||
                  event.target === postEditorRef.current ||
                  postEditorRef.current?.contains(event.target as Node)
                ) {
                  setIsComposerFocused(true);
                }
              }}
              onPointerDown={(event) => {
                // Touch / pen: same chrome-focus path as mouse.
                if (event.pointerType === 'mouse') return;
                const movedFocus = focusHomePostComposerFromChrome(event, postEditorRef.current, {
                  disabled: isPosting || isSavingEdit,
                });
                if (
                  movedFocus ||
                  event.target === postEditorRef.current ||
                  postEditorRef.current?.contains(event.target as Node)
                ) {
                  setIsComposerFocused(true);
                }
              }}
            >
              <Avatar
                aria-hidden
                className="pointer-events-none float-left mb-1.5 mr-3 h-10 w-10 [shape-outside:circle(50%)] [shape-margin:0.45rem] sm:mb-2 sm:mr-3.5 sm:h-12 sm:w-12"
              >
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              {!composerPlain ? (
                <div className="pointer-events-none absolute inset-y-0 left-[3.35rem] right-3 z-1 flex items-center sm:left-[4.15rem] sm:right-4">
                  <SlowRunningText
                    text={composerPlaceholder}
                    onlyWhenOverflow
                    className="min-w-0 flex-1 text-sm leading-6 text-muted-foreground"
                  />
                </div>
              ) : null}
              <div
                ref={postEditorRef}
                role="textbox"
                aria-multiline="true"
                aria-label={composerPlaceholder}
                contentEditable={!(isPosting || isSavingEdit)}
                tabIndex={isPosting || isSavingEdit ? -1 : 0}
                suppressContentEditableWarning
                className={cn(
                  'min-h-10 w-full whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-foreground outline-none sm:min-h-12',
                  '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
                )}
                onInput={(event) => {
                  emitPostEditor(event.currentTarget);
                }}
                onFocus={() => setIsComposerFocused(true)}
                onClick={() => {
                  postEditorRef.current?.focus();
                  setIsComposerFocused(true);
                }}
                onBlur={() => {
                  const card = document.querySelector('[data-home-post-composer-card]');
                  window.requestAnimationFrame(() => {
                    if (card?.contains(document.activeElement)) return;
                    setIsComposerFocused(false);
                    if (!editingPost) persistPostDraft(postContentRef.current);
                  });
                }}
                onPaste={(event) => {
                  event.preventDefault();
                  const text = event.clipboardData.getData('text/plain');
                  document.execCommand('insertText', false, text);
                  if (postEditorRef.current) emitPostEditor(postEditorRef.current);
                }}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault();
                    if (editingPost) void saveEditedPost();
                    else void createPost();
                  }
                }}
              />
              <div className="clear-both h-0 w-full" aria-hidden />
            </div>
            {isComposerFocused || editingPost || canPost ? (
              <SocialPostFormatToolbar
                editorRef={postEditorRef}
                onCommand={() => {
                  if (postEditorRef.current) emitPostEditor(postEditorRef.current);
                }}
                className="self-start"
              />
            ) : null}
            {!canPost && !editingPost ? (
              <Button
                size="sm"
                className="h-11 shrink-0 rounded-2xl px-4 transition-all sm:h-12 sm:px-5 disabled:border disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
                onClick={() => void createPost()}
                disabled={isPosting || !canPost}
              >
                {isPosting ? t('home.posting') : t('home.post')}
              </Button>
            ) : (
              <div className="flex justify-end gap-2 sm:gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-11 shrink-0 rounded-2xl px-3 sm:h-12 sm:px-4"
                  onClick={editingPost ? cancelEditPost : clearPostComposerDraft}
                  disabled={isPosting || isSavingEdit}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  className="h-11 shrink-0 rounded-2xl bg-primary px-4 text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md sm:h-12 sm:px-5"
                  onClick={() => {
                    if (editingPost) void saveEditedPost();
                    else void createPost();
                  }}
                  disabled={isPosting || isSavingEdit || !canPost}
                >
                  {editingPost
                    ? isSavingEdit
                      ? t('home.savingChanges')
                      : t('home.saveChanges')
                    : isPosting
                      ? t('home.posting')
                      : t('home.post')}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    ) : null}
    </>
  );
}
