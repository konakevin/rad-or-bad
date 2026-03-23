export type Category = 'setups' | 'fits' | 'rides' | 'eats' | 'pets' | 'people';
export type Vote = 'gas' | 'pass' | 'skip';
export type CriticLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          created_at: string;
          critic_level: CriticLevel;
          total_ratings_given: number;
          pro_subscription: boolean;
          subscription_expires: string | null;
          skip_tokens: number;
          upload_count_week: number;
          week_reset_date: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      uploads: {
        Row: {
          id: string;
          user_id: string;
          category: Category;
          image_url: string;
          caption: string | null;
          created_at: string;
          total_votes: number;
          gas_votes: number;
          pass_votes: number;
          hotness_score: number | null;
          is_moderated: boolean;
          is_approved: boolean | null;
        };
        Insert: Omit<Database['public']['Tables']['uploads']['Row'], 'created_at' | 'total_votes' | 'gas_votes' | 'pass_votes' | 'hotness_score' | 'is_moderated'>;
        Update: Partial<Database['public']['Tables']['uploads']['Insert']>;
      };
      votes: {
        Row: {
          id: string;
          voter_id: string;
          upload_id: string;
          vote: Vote;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['votes']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
      achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_type: string;
          unlocked_at: string;
        };
        Insert: Omit<Database['public']['Tables']['achievements']['Row'], 'id' | 'unlocked_at'>;
        Update: never;
      };
    };
  };
}
