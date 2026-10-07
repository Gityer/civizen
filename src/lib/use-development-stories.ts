import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSeedDevelopmentStories, type DevelopmentStory } from '@/lib/development-stories';
import { useAuth } from '@/contexts/AuthContext';

function normalizeTextArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

function normalizeStoryKind(value: unknown): 'development' | 'suggestion' {
  return value === 'suggestion' ? 'suggestion' : 'development';
}

function toStoryModel(row: Record<string, unknown>): DevelopmentStory | null {
  const id = row.id != null ? String(row.id) : '';
  const requestedAt = typeof row.requested_at === 'string' ? row.requested_at : null;
  const title = typeof row.title === 'string' ? row.title : null;
  const originalInstruction = typeof row.original_instruction === 'string' ? row.original_instruction : null;
  const rephrasedDescription = typeof row.rephrased_description === 'string' ? row.rephrased_description : null;
  const section = typeof row.section === 'string' ? row.section : null;
  const area = typeof row.area === 'string' ? row.area : null;
  const expectedBehavior = typeof row.expected_behavior === 'string' ? row.expected_behavior : null;

  if (!id || !requestedAt || !title || !originalInstruction || !rephrasedDescription || !section || !area || !expectedBehavior) {
    return null;
  }

  return {
    id,
    requestedAt,
    storyKind: normalizeStoryKind(row.story_kind),
    section,
    area,
    title,
    originalInstruction,
    rephrasedDescription,
    createdFeatures: normalizeTextArray(row.created_features),
    expectedBehavior,
  };
}

function mapRowsToStories(rows: unknown[]): DevelopmentStory[] {
  const out: DevelopmentStory[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const story = toStoryModel(row as Record<string, unknown>);
    if (story) out.push(story);
  }
  return out;
}

type UseDevelopmentStoriesOptions = {
  /** When false, skip seed ingest + list fetch (Home All tab should not pay this cost). */
  enabled?: boolean;
};

export function useDevelopmentStories(options: UseDevelopmentStoriesOptions = {}) {
  const enabled = options.enabled !== false;
  const { profile } = useAuth();
  const [stories, setStories] = useState<DevelopmentStory[]>([]);
  const [loading, setLoading] = useState(enabled);

  const seedStories = useMemo(() => getSeedDevelopmentStories(), []);

  // Seed upserts must not share try/catch with list fetch — a thrown ingest error
  // would previously wipe the full list back to the four local seeds.
  useEffect(() => {
    if (!enabled || !profile?.id) return;

    let cancelled = false;
    (async () => {
      for (const story of seedStories) {
        if (cancelled) return;
        const { error } = await supabase.rpc('ingest_development_story', {
          p_source_story_key: story.id,
          p_title: story.title,
          p_original_instruction: story.originalInstruction,
          p_rephrased_description: story.rephrasedDescription,
          p_section: story.section,
          p_area: story.area,
          p_created_features: story.createdFeatures,
          p_expected_behavior: story.expectedBehavior,
          p_source: 'cursor-seed',
          p_requested_at: story.requestedAt,
          p_story_kind: story.storyKind,
          p_status: 'published',
          p_visibility: 'public',
        });
        if (error) {
          console.warn('ingest_development_story (seed):', error.message);
        }
      }
    })().catch((err) => {
      console.warn('development story seed ingest failed:', err);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, profile?.id, seedStories]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadStories = async () => {
      setLoading(true);
      try {
        let rows: unknown[] = [];
        // Call supabase.rpc on the client instance — never assign `const rpc = supabase.rpc`
        // and invoke it unbound; that throws (undefined `this`) and falls through to seeds.
        const { data: rpcData, error: rpcError } = await supabase.rpc('list_published_development_stories');
        if (rpcError) {
          const { data, error } = await supabase
            .from('development_stories')
            .select(
              'id, requested_at, story_kind, section, area, title, original_instruction, rephrased_description, created_features, expected_behavior',
            )
            .eq('status', 'published')
            .eq('visibility', 'public')
            .order('requested_at', { ascending: false });

          if (error) {
            console.error('Error loading development stories (RPC + table):', {
              rpcError: rpcError.message,
              tableError: error.message,
            });
            if (!cancelled) {
              setStories(seedStories);
            }
            return;
          }

          rows = (data || []) as unknown[];
        } else {
          rows = Array.isArray(rpcData) ? rpcData : [];
        }

        if (cancelled) return;
        const mapped = mapRowsToStories(rows);
        if (mapped.length === 0 && rows.length > 0) {
          console.warn(
            'development_stories: received',
            rows.length,
            'rows but none matched the expected shape; check RPC/table columns',
          );
        }
        setStories(mapped);
      } catch (err) {
        console.error('useDevelopmentStories load failed:', err);
        if (!cancelled) {
          setStories(seedStories);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadStories();

    return () => {
      cancelled = true;
    };
  }, [enabled, seedStories]);

  return { stories, loading };
}
