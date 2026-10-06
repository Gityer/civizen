import type { ReactNode } from 'react';
import { MAIN_CONTENT_ID, SkipToContentLink } from '@/components/layout/SkipToContentLink';

import { PublicPageFooter } from '@/components/public/PublicPageFooter';
import { PublicPageHeader } from '@/components/public/PublicPageHeader';
import type { PublicSectionTrailItem } from '@/components/public/PublicSectionTrail';
import {
  PUBLIC_CHROME_MAX_CLASS,
  PUBLIC_DIRECTORY_MAX_CLASS,
  PUBLIC_READING_MAX_CLASS,
} from '@/lib/responsive-layout';
import { cn } from '@/lib/utils';

export type PublicPageLayout = 'reading' | 'directory';

type PublicPageShellProps = {
  children: ReactNode;
  contentClassName?: string;
  /**
   * @deprecated Prefer `layout`. Kept for pages that still pass an explicit content max.
   * Header chrome always uses the wide public band.
   */
  maxWidthClass?: string;
  /** reading = essay column; directory = wider discovery layout on large screens. */
  layout?: PublicPageLayout;
  /** When true, render the shared public footer under the content. */
  showFooter?: boolean;
  /** Section path on the header’s second line (replaces logo-adjacent labels). */
  sectionTrail?: readonly PublicSectionTrailItem[];
};

function contentMaxForLayout(layout: PublicPageLayout, maxWidthClass?: string) {
  if (maxWidthClass) return maxWidthClass;
  return layout === 'directory' ? PUBLIC_DIRECTORY_MAX_CLASS : PUBLIC_READING_MAX_CLASS;
}

export function PublicPageShell({
  children,
  contentClassName,
  maxWidthClass,
  layout = 'reading',
  showFooter = false,
  sectionTrail,
}: PublicPageShellProps) {
  const contentMax = contentMaxForLayout(layout, maxWidthClass);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SkipToContentLink />
      <PublicPageHeader maxWidthClass={PUBLIC_CHROME_MAX_CLASS} sectionTrail={sectionTrail} />
      <div id={MAIN_CONTENT_ID} tabIndex={-1} className={cn('mx-auto w-full flex-1 outline-none', contentMax, contentClassName)}>
        {children}
      </div>
      {showFooter ? (
        <div className={cn('mx-auto w-full px-4 pb-10 sm:px-6 lg:px-8', PUBLIC_CHROME_MAX_CLASS)}>
          <PublicPageFooter />
        </div>
      ) : null}
    </div>
  );
}
