import { type PillarId } from '@/lib/constants';

export interface RecentEndorsement {
  id: string;
  stars: number;
  pillar: PillarId;
  comment?: string;
  created_at: string;
  endorser: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface Post {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  is_edited: boolean | null;
  edited_at?: string | null;
  syncStatus?: 'local' | 'remote';
  author: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface PostComment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  author_id: string;
  author: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export type RawPostRecord = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  is_edited: boolean | null;
  edited_at?: string | null;
  syncStatus?: 'local' | 'remote';
  author: Post['author'];
};

export type FeedQueryError = {
  code?: string;
  message?: string;
} | null | undefined;
