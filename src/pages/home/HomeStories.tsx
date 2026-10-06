import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { behaviorHighlightsBeyondSummary, buildReaderFacingSummary, expectedBehaviorAddsUniqueDetail, originalInstructionAddsUniqueDetail, rephrasedAddsUniqueDetail } from '@/lib/development-story-curation';
import type { useHome } from '@/pages/home/useHome';

type HomeModel = ReturnType<typeof useHome>;

export function HomeStories({ model }: { model: HomeModel }) {
  const {
    storyGroupTab, setStoryGroupTab, storySectionFilter, setStorySectionFilter, storyAreaFilter,
    setStoryAreaFilter, selectedStoryId, setSelectedStoryId, t, storiesLoading,
    showDevelopmentStories, sectionFilters, areaFilters, visibleStories,
  } = model;
  return (
    <>
    {showDevelopmentStories ? (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <Card className="border-border/70 bg-card/95 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={storyGroupTab === 'development' ? 'default' : 'outline'}
              onClick={() => setStoryGroupTab('development')}
              className="h-8 rounded-full px-3"
            >
              Development
            </Button>
            <Button
              size="sm"
              variant={storyGroupTab === 'suggestions' ? 'default' : 'outline'}
              onClick={() => setStoryGroupTab('suggestions')}
              className="h-8 rounded-full px-3"
            >
              Suggestions
            </Button>
            <div className="group relative">
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground"
              >
                Section
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <div className="pointer-events-none invisible absolute right-0 top-9 z-20 w-[min(88vw,220px)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border/70 bg-popover p-1 opacity-0 shadow-lg transition group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setStorySectionFilter('all')}
                  className={cn(
                    'block w-full rounded-lg px-3 py-2 text-left text-xs break-words whitespace-normal',
                    storySectionFilter === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                >
                  All sections
                </button>
                {sectionFilters.map((section) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => setStorySectionFilter(section)}
                    className={cn(
                      'mt-1 block w-full rounded-lg px-3 py-2 text-left text-xs break-words whitespace-normal',
                      storySectionFilter === section ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                    )}
                  >
                    {section}
                  </button>
                ))}
              </div>
            </div>
            <div className="group relative">
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground"
              >
                Area
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <div className="pointer-events-none invisible absolute right-0 top-9 z-20 w-[min(88vw,260px)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border/70 bg-popover p-1 opacity-0 shadow-lg transition group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setStoryAreaFilter('all')}
                  className={cn(
                    'block w-full rounded-lg px-3 py-2 text-left text-xs break-words whitespace-normal',
                    storyAreaFilter === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                >
                  All areas
                </button>
                {areaFilters.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setStoryAreaFilter(area)}
                    className={cn(
                      'mt-1 block w-full rounded-lg px-3 py-2 text-left text-xs break-words whitespace-normal',
                      storyAreaFilter === area ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                    )}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {storiesLoading ? (
          <Card className="border-border/70 bg-card/95 p-4 text-sm text-muted-foreground">
            {t('common.loading')}
          </Card>
        ) : null}

        {!storiesLoading && visibleStories.length > 0 ? (
          <Card className="border-border/70 bg-card/95 p-2 shadow-sm">
            <ul className="divide-y divide-border/60">
              {visibleStories.map((story) => {
                const extraBehaviorLines = behaviorHighlightsBeyondSummary(story);
                return (
                <li key={story.id} className="py-1 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    onClick={() => setSelectedStoryId((prev) => (prev === story.id ? null : story.id))}
                    className={cn(
                      'group w-full rounded-lg border border-border/70 p-3 text-left shadow-sm transition-all',
                      'cursor-pointer bg-card/95 hover:border-border hover:shadow-md active:border-border active:bg-card/90',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selectedStoryId === story.id && 'border-primary/40 bg-primary/5 shadow-md',
                    )}
                  >
                    <div className="flex w-full items-start gap-2">
                      <span
                        className={cn(
                          'mt-0.5 text-xs font-semibold text-muted-foreground transition-colors',
                          'group-hover:text-foreground',
                          selectedStoryId === story.id && 'text-foreground',
                        )}
                      >
                        •
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'text-sm font-semibold text-muted-foreground transition-colors',
                            'group-hover:text-foreground',
                            selectedStoryId === story.id && 'text-foreground',
                          )}
                        >
                          {story.featureTitle}
                        </p>
                        {extraBehaviorLines[0] ? (
                          <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground/90">
                            {extraBehaviorLines[0]}
                          </p>
                        ) : story.behaviorHighlights[0] &&
                          buildReaderFacingSummary(story) !== story.featureTitle ? (
                          <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground/90">
                            {buildReaderFacingSummary(story)}
                          </p>
                        ) : null}
                      </div>
                      {story.relatedCount > 1 ? (
                        <span className="ml-auto shrink-0 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {story.relatedCount} updates
                        </span>
                      ) : null}
                    </div>
                  </button>

                  {selectedStoryId === story.id ? (
                    <div className="mt-2 rounded-xl border border-border/60 bg-card p-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{story.section}</Badge>
                        <Badge variant="outline">{story.area}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(story.requestedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="mb-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
                        <p className="mt-1.5 text-sm leading-relaxed text-foreground">{buildReaderFacingSummary(story)}</p>
                      </div>
                      {extraBehaviorLines.length > 0 ? (
                        <div className="mb-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Behavior and refinements
                          </p>
                          <ul className="mt-2 space-y-2 text-sm text-foreground">
                            {extraBehaviorLines.map((line, idx) => (
                              <li key={idx} className="leading-snug">
                                {line}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {rephrasedAddsUniqueDetail(story) ? (
                        <p className="text-sm text-muted-foreground">{story.rephrasedDescription}</p>
                      ) : null}
                      {originalInstructionAddsUniqueDetail(story) ? (
                        <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Original instruction</p>
                          <p className="mt-1 text-sm text-foreground">{story.originalInstruction}</p>
                        </div>
                      ) : null}
                      {story.createdFeatures.some(
                        (f) => f.trim() && !/backfilled from chat transcript|chat transcript/i.test(f),
                      ) ? (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created components and features</p>
                        <ul className="mt-1 space-y-1 text-sm text-foreground">
                          {story.createdFeatures
                            .filter((f) => f.trim() && !/backfilled from chat transcript|chat transcript/i.test(f))
                            .map((feature) => (
                            <li key={feature}>- {feature}</li>
                          ))}
                        </ul>
                      </div>
                      ) : null}
                      {expectedBehaviorAddsUniqueDetail(story) ? (
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Purpose and expected behavior
                          </p>
                          <p className="mt-1 text-sm text-foreground">{story.expectedBehavior}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
              })}
            </ul>
          </Card>
        ) : null}

        {!storiesLoading && visibleStories.length === 0 ? (
          <Card className="border-2 border-dashed border-border/70 bg-card/70 p-6 text-sm text-muted-foreground">
            {storyGroupTab === 'suggestions'
              ? 'No suggestion stories yet for the selected filters.'
              : 'No stories match the selected filters.'}
          </Card>
        ) : null}
      </motion.div>
    ) : null}
    </>
  );
}
