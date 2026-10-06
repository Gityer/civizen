import type { WorkJoyPattern } from './joy-patterns';
import type { WorkFitAlignment, WorkFulfillmentProfile } from './types';

export type AdjacentRoleSuggestion = {
  id: string;
  title: string;
  contributePath: string;
  studyPath: string;
  alignment: WorkFitAlignment;
  why: string[];
  explore: string[];
};

const TEMPLATES: Array<{
  id: string;
  title: string;
  tags: string[];
  contributePath: string;
  studyPath: string;
}> = [
  {
    id: 'learning_facilitator',
    title: 'Learning Facilitator',
    tags: ['teaching', 'helping', 'leading'],
    contributePath: '/contribute',
    studyPath: '/study',
  },
  {
    id: 'project_coordinator',
    title: 'Project coordinator',
    tags: ['organizing', 'solving_problems', 'collaborating'],
    contributePath: '/contribute/professional',
    studyPath: '/study/courses',
  },
  {
    id: 'knowledge_contributor',
    title: 'Knowledge contributor',
    tags: ['researching', 'analyzing'],
    contributePath: '/contribute/knowledge',
    studyPath: '/study/materials',
  },
  {
    id: 'design_contributor',
    title: 'Design contributor',
    tags: ['creating', 'building'],
    contributePath: '/contribute/professional',
    studyPath: '/study',
  },
  {
    id: 'community_contributor',
    title: 'Community contributor',
    tags: ['helping', 'customer_public'],
    contributePath: '/contribute/challenges',
    studyPath: '/study/civic',
  },
];

export function suggestAdjacentRoles(input: {
  patterns: WorkJoyPattern[];
  profile: WorkFulfillmentProfile | null;
  memberTitle?: string | null;
}): AdjacentRoleSuggestion[] {
  const fulfilling = new Set(input.patterns.filter((pattern) => pattern.kind === 'fulfilling').map((pattern) => pattern.tag));
  const draining = new Set(input.patterns.filter((pattern) => pattern.kind === 'draining').map((pattern) => pattern.tag));
  const enjoyed = new Set([
    ...(input.profile?.enjoyment.enjoyedActivities ?? []),
    ...(input.profile?.enjoyment.enjoyedTasks ?? []),
  ].map((value) => value.toLowerCase()));

  const suggestions = TEMPLATES.map((template) => {
    const hits = template.tags.filter((tag) => fulfilling.has(tag) || enjoyed.has(tag));
    const tensions = template.tags.filter((tag) => draining.has(tag));
    const why = hits.map((tag) => `You often report higher enjoyment when the activity involves ${tag.replace(/_/g, ' ')}.`);
    const explore = tensions.map(
      (tag) => `This kind of work may still include ${tag.replace(/_/g, ' ')}, which your recent entries associate with lower enjoyment.`,
    );
    if (template.id === 'learning_facilitator' && !hits.length) {
      explore.push('You have limited evidence of group facilitation.');
    }
    explore.push('Consider which skills and contributions you already have, and which this kind of work may still need.');
    let alignment: WorkFitAlignment;
    if (hits.length >= 2) alignment = 'strong_alignment';
    else if (hits.length === 1) alignment = 'some_alignment';
    else alignment = 'worth_exploring';
    return {
      id: template.id,
      title: template.title,
      contributePath: template.contributePath,
      studyPath: template.studyPath,
      alignment,
      why: why.length ? why : ['This is a nearby kind of work you can explore — not an assigned career.'],
      explore,
    };
  });

  const custom = input.memberTitle?.trim();
  if (custom) {
    suggestions.unshift({
      id: 'member-entered',
      title: custom,
      contributePath: '/contribute',
      studyPath: '/study',
      alignment: 'worth_exploring',
      why: ['You entered this as a kind of work to explore.'],
      explore: ['Treat this as a question to test, not a conclusion.'],
    });
  }

  return suggestions
    .sort((a, b) => Number(b.alignment === 'strong_alignment') - Number(a.alignment === 'strong_alignment'))
    .slice(0, 4);
}
