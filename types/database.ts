export type Category = 'people' | 'animals' | 'food' | 'nature' | 'funny' | 'music' | 'sports' | 'art' | 'memes' | 'beauty' | 'quotes' | 'cute';
export type VoteType = 'rad' | 'bad' | 'skip';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          avatar_url: string | null;
          created_at: string;
          critic_level: number;
          total_ratings_given: number;
          pro_subscription: boolean;
          subscription_expires: string | null;
          skip_tokens: number;
          upload_count_week: number;
          week_reset_date: string;
          rad_score: number | null;
          user_rank: string | null;
        };
        Insert: {
          id: string;
          email: string;
          username: string;
          avatar_url?: string | null;
        };
        Update: {
          username?: string;
          avatar_url?: string | null;
          pro_subscription?: boolean;
          subscription_expires?: string | null;
        };
        Relationships: [];
      };
      uploads: {
        Row: {
          id: string;
          user_id: string;
          category: Category;
          image_url: string;
          media_type: 'image' | 'video';
          thumbnail_url: string | null;
          width: number | null;
          height: number | null;
          caption: string | null;
          created_at: string;
          total_votes: number;
          rad_votes: number;
          bad_votes: number;
          wilson_score: number;
          is_moderated: boolean;
          is_approved: boolean | null;
          is_active: boolean;
        };
        Insert: {
          user_id: string;
          category: Category;
          image_url: string;
          media_type?: 'image' | 'video';
          thumbnail_url?: string | null;
          width?: number | null;
          height?: number | null;
          caption?: string | null;
          is_approved?: boolean | null;
        };
        Update: {
          rad_votes?: number;
          bad_votes?: number;
          total_votes?: number;
          wilson_score?: number;
          is_active?: boolean;
          is_approved?: boolean | null;
          caption?: string | null;
        };
        Relationships: [
          { foreignKeyName: 'uploads_user_id_fkey'; columns: ['user_id']; referencedRelation: 'users'; referencedColumns: ['id'] },
        ];
      };
      votes: {
        Row: {
          id: string;
          voter_id: string;
          upload_id: string;
          vote: VoteType;
          created_at: string;
        };
        Insert: {
          voter_id: string;
          upload_id: string;
          vote: VoteType;
        };
        Update: Record<string, never>;
        Relationships: [
          { foreignKeyName: 'votes_voter_id_fkey'; columns: ['voter_id']; referencedRelation: 'users'; referencedColumns: ['id'] },
          { foreignKeyName: 'votes_upload_id_fkey'; columns: ['upload_id']; referencedRelation: 'uploads'; referencedColumns: ['id'] },
        ];
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          upload_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          upload_id: string;
        };
        Update: Record<string, never>;
        Relationships: [
          { foreignKeyName: 'favorites_user_id_fkey'; columns: ['user_id']; referencedRelation: 'users'; referencedColumns: ['id'] },
          { foreignKeyName: 'favorites_upload_id_fkey'; columns: ['upload_id']; referencedRelation: 'uploads'; referencedColumns: ['id'] },
        ];
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
        };
        Update: Record<string, never>;
        Relationships: [
          { foreignKeyName: 'follows_follower_id_fkey'; columns: ['follower_id']; referencedRelation: 'users'; referencedColumns: ['id'] },
          { foreignKeyName: 'follows_following_id_fkey'; columns: ['following_id']; referencedRelation: 'users'; referencedColumns: ['id'] },
        ];
      };
      achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_type: string;
          unlocked_at: string;
        };
        Insert: {
          user_id: string;
          achievement_type: string;
        };
        Update: Record<string, never>;
        Relationships: [
          { foreignKeyName: 'achievements_user_id_fkey'; columns: ['user_id']; referencedRelation: 'users'; referencedColumns: ['id'] },
        ];
      };
      user_category_affinity: {
        Row: {
          user_id: string;
          category: Category;
          rad_count: number;
          bad_count: number;
        };
        Insert: {
          user_id: string;
          category: Category;
          rad_count?: number;
          bad_count?: number;
        };
        Update: {
          rad_count?: number;
          bad_count?: number;
        };
        Relationships: [
          { foreignKeyName: 'affinity_user_id_fkey'; columns: ['user_id']; referencedRelation: 'users'; referencedColumns: ['id'] },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_feed: {
        Args: { p_user_id: string; p_limit?: number };
        Returns: Array<{
          id: string;
          user_id: string;
          category: Category;
          image_url: string;
          media_type: 'image' | 'video';
          thumbnail_url: string | null;
          width: number | null;
          height: number | null;
          caption: string | null;
          created_at: string;
          total_votes: number;
          rad_votes: number;
          bad_votes: number;
          username: string;
          user_rank: string | null;
          avatar_url: string | null;
          feed_score: number;
        }>;
      };
    };
  };
}
