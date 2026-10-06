import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, Landmark } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  CONSTITUTION_ARTICLE_BOOKMARK_PREFIX,
  CONSTITUTION_STUDY_SECTIONS,
  OPEN_ARTICLE_STORAGE_KEY,
} from '@/lib/constitution-study';

type MarkdownBlock =
  | { type: 'h1' | 'h2' | 'h3' | 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'hr' };

const HEADING_PATTERN = /^(#{1,3})\s+(.+)$/;
const ORDERED_ITEM_PATTERN = /^\d+\.\s+(.+)$/;
const BULLET_ITEM_PATTERN = /^-\s+(.+)$/;

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (line === '---') {
      blocks.push({ type: 'hr' });
      index += 1;
      continue;
    }

    const headingMatch = line.match(HEADING_PATTERN);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const type = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
      blocks.push({ type, text });
      index += 1;
      continue;
    }

    if (ORDERED_ITEM_PATTERN.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const match = lines[index].trim().match(ORDERED_ITEM_PATTERN);
        if (!match) break;
        items.push(match[1].trim());
        index += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    if (BULLET_ITEM_PATTERN.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const match = lines[index].trim().match(BULLET_ITEM_PATTERN);
        if (!match) break;
        items.push(match[1].trim());
        index += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const current = lines[index].trim();
      if (
        !current
        || current === '---'
        || HEADING_PATTERN.test(current)
        || ORDERED_ITEM_PATTERN.test(current)
        || BULLET_ITEM_PATTERN.test(current)
      ) {
        break;
      }

      paragraphLines.push(current);
      index += 1;
    }

    if (paragraphLines.length > 0) {
      blocks.push({ type: 'p', text: paragraphLines.join(' ') });
    }
  }

  return blocks;
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={`${part}-${index}`} className="rounded bg-muted px-1.5 py-0.5 text-[0.92em]">
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function firstHeading(markdown: string) {
  const line = markdown.replace(/\r\n/g, '\n').split('\n').find((candidate) => candidate.startsWith('## '));
  if (!line) return 'Section';
  return line.replace(/^##\s+/, '').trim();
}

function subArticleHeadings(blocks: MarkdownBlock[]) {
  return blocks
    .filter((block): block is Extract<MarkdownBlock, { text: string }> => block.type === 'h3')
    .map((block) => block.text.trim());
}

type ConstitutionReaderProps = {
  mode?: 'full' | 'summary' | 'articles';
  bookmarkedKeys?: Set<string>;
  onToggleArticleBookmark?: (articleId: string, articleHeading: string) => void;
  searchQuery?: string;
};

export function ConstitutionReader({
  mode = 'full',
  bookmarkedKeys,
  onToggleArticleBookmark,
  searchQuery = '',
}: ConstitutionReaderProps) {
  const parsedSections = useMemo(
    () =>
      CONSTITUTION_STUDY_SECTIONS.map((section) => ({
        ...section,
        heading: firstHeading(section.markdown),
        blocks: parseMarkdownBlocks(section.markdown),
      })),
    [],
  );

  const navigationSections = parsedSections.filter((section) => section.kind !== 'frontMatter');
  const articleSections = useMemo(
    () => parsedSections.filter((section) => section.kind === 'article'),
    [parsedSections],
  );
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const articleMatches = useMemo(() => {
    if (!normalizedQuery) return new Map<string, string[]>();

    const stripMarkdown = (text: string) =>
      text
        .replace(/\r\n/g, '\n')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const splitIntoSentences = (text: string) =>
      text
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);

    const nextMatches = new Map<string, string[]>();
    articleSections.forEach((section) => {
      const sentences = splitIntoSentences(stripMarkdown(section.markdown))
        .filter((sentence) => sentence.toLowerCase().includes(normalizedQuery))
        .slice(0, 4);
      if (sentences.length > 0) {
        nextMatches.set(section.id, sentences);
      }
    });
    return nextMatches;
  }, [articleSections, normalizedQuery]);
  const visibleArticleSections = useMemo(
    () => (normalizedQuery ? articleSections.filter((section) => articleMatches.has(section.id)) : articleSections),
    [articleMatches, articleSections, normalizedQuery],
  );
  const [openArticleId, setOpenArticleId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(OPEN_ARTICLE_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!openArticleId) return;
    if (!articleSections.some((section) => section.id === openArticleId)) {
      setOpenArticleId(null);
    }
  }, [articleSections, openArticleId]);

  useEffect(() => {
    if (!normalizedQuery) return;
    if (visibleArticleSections.length === 0) {
      setOpenArticleId(null);
      return;
    }
    setOpenArticleId((current) => {
      if (current && visibleArticleSections.some((section) => section.id === current)) {
        return current;
      }
      return visibleArticleSections[0].id;
    });
  }, [normalizedQuery, visibleArticleSections]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (openArticleId) {
        window.localStorage.setItem(OPEN_ARTICLE_STORAGE_KEY, openArticleId);
      } else {
        window.localStorage.removeItem(OPEN_ARTICLE_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors and keep in-memory behavior.
    }
  }, [openArticleId]);

  const jumpToSection = (id: string) => {
    if (typeof document === 'undefined') return;
    const node = document.getElementById(`constitution-section-${id}`);
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderBlocks = (sectionId: string, blocks: MarkdownBlock[]) =>
    blocks.map((block, index) => {
      const key = `${sectionId}-${block.type}-${index}`;

      if (block.type === 'h1') {
        return (
          <h4 key={key} className="text-xl font-bold text-foreground">
            {renderInlineMarkdown(block.text)}
          </h4>
        );
      }

      if (block.type === 'h2') {
        return (
          <h5 key={key} className="text-lg font-semibold text-foreground">
            {renderInlineMarkdown(block.text)}
          </h5>
        );
      }

      if (block.type === 'h3') {
        return (
          <h6 key={key} className="text-base font-semibold text-foreground">
            {renderInlineMarkdown(block.text)}
          </h6>
        );
      }

      if (block.type === 'ol') {
        return (
          <ol key={key} className="list-decimal space-y-1.5 pl-5 text-sm text-foreground/95">
            {block.items.map((item, itemIndex) => (
              <li key={`${key}-item-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
            ))}
          </ol>
        );
      }

      if (block.type === 'ul') {
        return (
          <ul key={key} className="list-disc space-y-1.5 pl-5 text-sm text-foreground/95">
            {block.items.map((item, itemIndex) => (
              <li key={`${key}-item-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
            ))}
          </ul>
        );
      }

      if (block.type === 'hr') {
        return <hr key={key} className="border-border/70" />;
      }

      return (
        <p key={key} className="text-sm leading-6 text-foreground/95">
          {renderInlineMarkdown((block as Extract<MarkdownBlock, { text: string }>).text)}
        </p>
      );
    });

  if (mode === 'articles') {
    const renderHighlightedQuery = (sentence: string) => {
      if (!normalizedQuery) return sentence;
      const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = sentence.split(new RegExp(`(${escapedQuery})`, 'gi'));
      return parts.map((part, index) => {
        if (part.toLowerCase() === normalizedQuery) {
          return (
            <mark key={`${part}-${index}`} className="rounded bg-primary/20 px-1 text-foreground">
              {part}
            </mark>
          );
        }
        return <span key={`${part}-${index}`}>{part}</span>;
      });
    };

    return (
      <Card className="border-border/70 bg-card/95 p-4 shadow-sm">
        <div className="space-y-2">
          {visibleArticleSections.length === 0 && normalizedQuery ? (
            <p className="px-1 py-2 text-sm text-muted-foreground">
              No constitution articles contain this exact keyword or phrase.
            </p>
          ) : visibleArticleSections.map((section) => {
            const isOpen = openArticleId === section.id;
            const subHeadings = subArticleHeadings(section.blocks);
            const matchingSentences = articleMatches.get(section.id) ?? [];
            const articleBookmarkKey = `${CONSTITUTION_ARTICLE_BOOKMARK_PREFIX}${section.id}`;
            const isBookmarked = bookmarkedKeys?.has(articleBookmarkKey) || false;
            return (
              <section key={section.id} className="rounded-xl border border-border/70 bg-background/40">
                <div
                  role="button"
                  tabIndex={0}
                  className="group w-full px-4 py-3 text-left"
                  onClick={() => setOpenArticleId(isOpen ? null : section.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setOpenArticleId(isOpen ? null : section.id);
                    }
                  }}
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
                      {section.heading}
                      {isOpen && (
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded p-0.5 text-primary hover:bg-primary/10"
                          aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleArticleBookmark?.(section.id, section.heading);
                          }}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          {isBookmarked ? (
                            <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Bookmark className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      )}
                    </span>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {normalizedQuery && matchingSentences.length > 0 && (
                  <div className="border-t border-border/70 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                      Matching sentences
                    </p>
                    <ul className="mt-2 space-y-2">
                      {matchingSentences.map((sentence) => (
                        <li key={`${section.id}-${sentence}`} className="text-sm text-muted-foreground">
                          {renderHighlightedQuery(sentence)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {isOpen && (
                  <div className="border-t border-border/70 px-4 py-3">
                    {subHeadings.length > 0 && (
                      <div className="mb-3 text-xs text-muted-foreground">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                          Sub-articles
                        </p>
                        <ul className="mt-1 space-y-1">
                          {subHeadings.map((subHeading) => (
                            <li key={`${section.id}-${subHeading}`} className="flex gap-2 leading-5">
                              <span className="text-muted-foreground/60">-</span>
                              <span>{subHeading}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="space-y-3">
                      {renderBlocks(
                        section.id,
                        section.blocks.filter((block, index) => !(index === 0 && block.type === 'h2')),
                      )}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </Card>
    );
  }

  if (mode === 'summary') {
    const summarySections = parsedSections.filter((section) => section.kind === 'article').map((section) => {
      const firstParagraph = section.blocks.find((block) => block.type === 'p');
      return {
        id: section.id,
        heading: section.heading,
        summary: firstParagraph && firstParagraph.type === 'p'
          ? firstParagraph.text
          : 'See the full article for complete constitutional language.',
      };
    });

    return (
      <Card className="border-border/70 bg-card/95 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Constitution Citizen Summary
          </h3>
          <Badge variant="secondary" className="rounded-full">
            Plain Language
          </Badge>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          A concise guide to each article so citizens can quickly understand the core protections and duties.
        </p>

        <div className="mt-4 space-y-3">
          {summarySections.map((section) => (
            <section key={section.id} className="rounded-xl border border-border/70 bg-background/40 p-4">
              <h4 className="text-base font-semibold text-foreground">{section.heading}</h4>
              <p className="mt-1 text-sm leading-6 text-foreground/95">{renderInlineMarkdown(section.summary)}</p>
            </section>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 bg-card/95 p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Landmark className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Constitution Reader
        </h3>
        <Badge variant="secondary" className="rounded-full">
          Structured Study View
        </Badge>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        Read the full constitution in organized sections. Use the quick navigation buttons to jump to each article.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {navigationSections.map((section) => (
          <Button
            key={section.id}
            size="sm"
            variant="outline"
            className="h-auto rounded-full px-3 py-1.5 text-xs"
            onClick={() => jumpToSection(section.id)}
          >
            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            {section.heading}
          </Button>
        ))}
      </div>

      <div className="mt-5 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {parsedSections.map((section) => (
          <section
            key={section.id}
            id={`constitution-section-${section.id}`}
            className="rounded-xl border border-border/70 bg-background/40 p-4"
          >
            <div className="space-y-3">{renderBlocks(section.id, section.blocks)}</div>
          </section>
        ))}
      </div>
    </Card>
  );
}
