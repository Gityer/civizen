import { useMemo } from 'react';
import { BookOpen } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

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

type StudyMarkdownReaderProps = {
  title: string;
  badgeLabel?: string;
  markdown: string;
  embedded?: boolean;
  showHeader?: boolean;
};

export function StudyMarkdownReader({
  title,
  badgeLabel = 'Document',
  markdown,
  embedded = false,
  showHeader = true,
}: StudyMarkdownReaderProps) {
  const blocks = useMemo(() => parseMarkdownBlocks(markdown), [markdown]);

  const renderBlocks = (items: MarkdownBlock[]) =>
    items.map((block, index) => {
      const key = `${block.type}-${index}`;

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

  const header = showHeader ? (
    <div className="flex flex-wrap items-center gap-2">
      <BookOpen className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h3>
      <Badge variant="secondary" className="rounded-full">
        {badgeLabel}
      </Badge>
    </div>
  ) : null;

  const content = (
    <>
      {header}
      <div className={showHeader ? 'mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1' : 'space-y-4'}>
        {renderBlocks(blocks)}
      </div>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card className="border-border/70 bg-card/95 p-5 shadow-sm">
      {content}
    </Card>
  );
}
