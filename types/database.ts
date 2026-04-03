export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.4';
  };
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_type: string;
          id: string;
          unlocked_at: string;
          user_id: string;
        };
        Insert: {
          achievement_type: string;
          id?: string;
          unlocked_at?: string;
          user_id: string;
        };
        Update: {
          achievement_type?: string;
          id?: string;
          unlocked_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'achievements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_generation_budget: {
        Row: {
          date: string;
          images_generated: number;
          total_cost_cents: number;
          user_id: string;
        };
        Insert: {
          date?: string;
          images_generated?: number;
          total_cost_cents?: number;
          user_id: string;
        };
        Update: {
          date?: string;
          images_generated?: number;
          total_cost_cents?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_generation_budget_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_generation_log: {
        Row: {
          cost_cents: number;
          created_at: string;
          enhanced_prompt: string;
          error_message: string | null;
          id: string;
          model_used: string;
          recipe_snapshot: Json;
          rolled_axes: Json;
          status: string;
          upload_id: string | null;
          user_id: string;
        };
        Insert: {
          cost_cents?: number;
          created_at?: string;
          enhanced_prompt: string;
          error_message?: string | null;
          id?: string;
          model_used?: string;
          recipe_snapshot: Json;
          rolled_axes: Json;
          status?: string;
          upload_id?: string | null;
          user_id: string;
        };
        Update: {
          cost_cents?: number;
          created_at?: string;
          enhanced_prompt?: string;
          error_message?: string | null;
          id?: string;
          model_used?: string;
          recipe_snapshot?: Json;
          rolled_axes?: Json;
          status?: string;
          upload_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_generation_log_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 'uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_generation_log_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 'uploads_with_score';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_generation_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      blocked_users: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'blocked_users_blocked_id_fkey';
            columns: ['blocked_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocked_users_blocker_id_fkey';
            columns: ['blocker_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      comment_likes: {
        Row: {
          comment_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          comment_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          comment_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comment_likes_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comment_likes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      comments: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          is_deleted: boolean;
          like_count: number;
          parent_id: string | null;
          reply_count: number;
          upload_id: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          is_deleted?: boolean;
          like_count?: number;
          parent_id?: string | null;
          reply_count?: number;
          upload_id: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          is_deleted?: boolean;
          like_count?: number;
          parent_id?: string | null;
          reply_count?: number;
          upload_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comments_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 'uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 'uploads_with_score';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      favorites: {
        Row: {
          created_at: string;
          id: string;
          upload_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          upload_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          upload_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorites_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 'uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 'uploads_with_score';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      feature_flags: {
        Row: {
          description: string | null;
          key: string;
          value: boolean;
        };
        Insert: {
          description?: string | null;
          key: string;
          value?: boolean;
        };
        Update: {
          description?: string | null;
          key?: string;
          value?: boolean;
        };
        Relationships: [];
      };
      follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          follower_id: string;
          following_id: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['follower_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_following_id_fkey';
            columns: ['following_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      friendships: {
        Row: {
          agreed_votes: number;
          created_at: string;
          requester: string;
          shared_votes: number;
          status: string;
          user_a: string;
          user_b: string;
        };
        Insert: {
          agreed_votes?: number;
          created_at?: string;
          requester: string;
          shared_votes?: number;
          status?: string;
          user_a: string;
          user_b: string;
        };
        Update: {
          agreed_votes?: number;
          created_at?: string;
          requester?: string;
          shared_votes?: number;
          status?: string;
          user_a?: string;
          user_b?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'friendships_requester_fkey';
            columns: ['requester'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friendships_user_a_fkey';
            columns: ['user_a'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friendships_user_b_fkey';
            columns: ['user_b'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      likes: {
        Row: {
          created_at: string;
          id: string;
          upload_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          upload_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          upload_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'likes_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 'uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'likes_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 'uploads_with_score';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'likes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          actor_id: string;
          body: string | null;
          comment_id: string | null;
          created_at: string;
          id: string;
          recipient_id: string;
          seen_at: string | null;
          type: string;
          upload_id: string | null;
        };
        Insert: {
          actor_id: string;
          body?: string | null;
          comment_id?: string | null;
          created_at?: string;
          id?: string;
          recipient_id: string;
          seen_at?: string | null;
          type: string;
          upload_id?: string | null;
        };
        Update: {
          actor_id?: string;
          body?: string | null;
          comment_id?: string | null;
          created_at?: string;
          id?: string;
          recipient_id?: string;
          seen_at?: string | null;
          type?: string;
          upload_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 'uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 'uploads_with_score';
            referencedColumns: ['id'];
          },
        ];
      };
      post_shares: {
        Row: {
          created_at: string;
          id: string;
          receiver_id: string;
          seen_at: string | null;
          sender_id: string;
          upload_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          receiver_id: string;
          seen_at?: string | null;
          sender_id: string;
          upload_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          receiver_id?: string;
          seen_at?: string | null;
          sender_id?: string;
          upload_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_shares_receiver_id_fkey';
            columns: ['receiver_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_shares_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_shares_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 'uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_shares_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 'uploads_with_score';
            referencedColumns: ['id'];
          },
        ];
      };
      push_tokens: {
        Row: {
          created_at: string;
          id: string;
          platform: string;
          token: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          platform?: string;
          token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          platform?: string;
          token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      rank_thresholds: {
        Row: {
          bad: number;
          id: number;
          legendary: number;
          mid: number;
          rad: number;
          solid: number;
          updated_at: string;
        };
        Insert: {
          bad?: number;
          id?: number;
          legendary?: number;
          mid?: number;
          rad?: number;
          solid?: number;
          updated_at?: string;
        };
        Update: {
          bad?: number;
          id?: number;
          legendary?: number;
          mid?: number;
          rad?: number;
          solid?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      recipe_registry: {
        Row: {
          created_at: string;
          fingerprint: string;
          id: string;
          recipe: Json;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          fingerprint: string;
          id?: string;
          recipe: Json;
          user_id: string;
        };
        Update: {
          created_at?: string;
          fingerprint?: string;
          id?: string;
          recipe?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recipe_registry_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          id: string;
          reason: string;
          reporter_id: string;
          resolved: boolean;
          upload_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          reason: string;
          reporter_id: string;
          resolved?: boolean;
          upload_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reason?: string;
          reporter_id?: string;
          resolved?: boolean;
          upload_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 'uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 'uploads_with_score';
            referencedColumns: ['id'];
          },
        ];
      };
      sparkle_transactions: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          reason: string;
          reference_id: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          reason: string;
          reference_id?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          reason?: string;
          reference_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sparkle_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      uploads: {
        Row: {
          ai_prompt: string | null;
          bad_votes: number;
          bot_message: string | null;
          caption: string | null;
          categories: string[];
          comment_count: number;
          created_at: string;
          from_wish: string | null;
          fuse_count: number;
          fuse_of: string | null;
          height: number | null;
          id: string;
          image_url: string;
          is_active: boolean;
          is_ai_generated: boolean;
          is_approved: boolean | null;
          is_moderated: boolean;
          like_count: number;
          media_type: string;
          rad_votes: number;
          recipe_id: string | null;
          thumbnail_url: string | null;
          total_votes: number;
          twin_count: number;
          twin_of: string | null;
          user_id: string;
          width: number | null;
          wilson_score: number;
        };
        Insert: {
          ai_prompt?: string | null;
          bad_votes?: number;
          bot_message?: string | null;
          caption?: string | null;
          categories?: string[];
          comment_count?: number;
          created_at?: string;
          from_wish?: string | null;
          fuse_count?: number;
          fuse_of?: string | null;
          height?: number | null;
          id?: string;
          image_url: string;
          is_active?: boolean;
          is_ai_generated?: boolean;
          is_approved?: boolean | null;
          is_moderated?: boolean;
          like_count?: number;
          media_type?: string;
          rad_votes?: number;
          recipe_id?: string | null;
          thumbnail_url?: string | null;
          total_votes?: number;
          twin_count?: number;
          twin_of?: string | null;
          user_id: string;
          width?: number | null;
          wilson_score?: number;
        };
        Update: {
          ai_prompt?: string | null;
          bad_votes?: number;
          bot_message?: string | null;
          caption?: string | null;
          categories?: string[];
          comment_count?: number;
          created_at?: string;
          from_wish?: string | null;
          fuse_count?: number;
          fuse_of?: string | null;
          height?: number | null;
          id?: string;
          image_url?: string;
          is_active?: boolean;
          is_ai_generated?: boolean;
          is_approved?: boolean | null;
          is_moderated?: boolean;
          like_count?: number;
          media_type?: string;
          rad_votes?: number;
          recipe_id?: string | null;
          thumbnail_url?: string | null;
          total_votes?: number;
          twin_count?: number;
          twin_of?: string | null;
          user_id?: string;
          width?: number | null;
          wilson_score?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'uploads_fuse_of_fkey';
            columns: ['fuse_of'];
            isOneToOne: false;
            referencedRelation: 'uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'uploads_fuse_of_fkey';
            columns: ['fuse_of'];
            isOneToOne: false;
            referencedRelation: 'uploads_with_score';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'uploads_recipe_id_fkey';
            columns: ['recipe_id'];
            isOneToOne: false;
            referencedRelation: 'recipe_registry';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'uploads_twin_of_fkey';
            columns: ['twin_of'];
            isOneToOne: false;
            referencedRelation: 'uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'uploads_twin_of_fkey';
            columns: ['twin_of'];
            isOneToOne: false;
            referencedRelation: 'uploads_with_score';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'uploads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      user_recipes: {
        Row: {
          ai_enabled: boolean;
          created_at: string;
          dream_wish: string | null;
          onboarding_completed: boolean;
          recipe: Json;
          updated_at: string;
          user_id: string;
          wish_modifiers: Json | null;
          wish_recipient_ids: Json | null;
        };
        Insert: {
          ai_enabled?: boolean;
          created_at?: string;
          dream_wish?: string | null;
          onboarding_completed?: boolean;
          recipe?: Json;
          updated_at?: string;
          user_id: string;
          wish_modifiers?: Json | null;
          wish_recipient_ids?: Json | null;
        };
        Update: {
          ai_enabled?: boolean;
          created_at?: string;
          dream_wish?: string | null;
          onboarding_completed?: boolean;
          recipe?: Json;
          updated_at?: string;
          user_id?: string;
          wish_modifiers?: Json | null;
          wish_recipient_ids?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_recipes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          has_ai_recipe: boolean;
          id: string;
          last_active_at: string | null;
          needs_rank_recalc: boolean;
          preferred_categories: string[] | null;
          pro_subscription: boolean;
          sparkle_balance: number;
          subscription_expires: string | null;
          upload_count_week: number;
          username: string;
          week_reset_date: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          has_ai_recipe?: boolean;
          id: string;
          last_active_at?: string | null;
          needs_rank_recalc?: boolean;
          preferred_categories?: string[] | null;
          pro_subscription?: boolean;
          sparkle_balance?: number;
          subscription_expires?: string | null;
          upload_count_week?: number;
          username: string;
          week_reset_date?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          has_ai_recipe?: boolean;
          id?: string;
          last_active_at?: string | null;
          needs_rank_recalc?: boolean;
          preferred_categories?: string[] | null;
          pro_subscription?: boolean;
          sparkle_balance?: number;
          subscription_expires?: string | null;
          upload_count_week?: number;
          username?: string;
          week_reset_date?: string;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          created_at: string;
          id: string;
          upload_id: string;
          vote: Database['public']['Enums']['vote_type'];
          voter_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          upload_id: string;
          vote: Database['public']['Enums']['vote_type'];
          voter_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          upload_id?: string;
          vote?: Database['public']['Enums']['vote_type'];
          voter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'votes_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 'uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'votes_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 'uploads_with_score';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'votes_voter_id_fkey';
            columns: ['voter_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      ai_cost_summary: {
        Row: {
          cost_cents: number | null;
          date: string | null;
          images: number | null;
        };
        Relationships: [];
      };
      uploads_with_score: {
        Row: {
          bad_votes: number | null;
          caption: string | null;
          categories: string[] | null;
          created_at: string | null;
          height: number | null;
          hotness_score: number | null;
          id: string | null;
          image_url: string | null;
          is_active: boolean | null;
          is_approved: boolean | null;
          is_moderated: boolean | null;
          media_type: string | null;
          rad_votes: number | null;
          thumbnail_url: string | null;
          total_votes: number | null;
          user_id: string | null;
          width: number | null;
          wilson_score: number | null;
        };
        Insert: {
          bad_votes?: number | null;
          caption?: string | null;
          categories?: string[] | null;
          created_at?: string | null;
          height?: number | null;
          hotness_score?: never;
          id?: string | null;
          image_url?: string | null;
          is_active?: boolean | null;
          is_approved?: boolean | null;
          is_moderated?: boolean | null;
          media_type?: string | null;
          rad_votes?: number | null;
          thumbnail_url?: string | null;
          total_votes?: number | null;
          user_id?: string | null;
          width?: number | null;
          wilson_score?: number | null;
        };
        Update: {
          bad_votes?: number | null;
          caption?: string | null;
          categories?: string[] | null;
          created_at?: string | null;
          height?: number | null;
          hotness_score?: never;
          id?: string | null;
          image_url?: string | null;
          is_active?: boolean | null;
          is_approved?: boolean | null;
          is_moderated?: boolean | null;
          media_type?: string | null;
          rad_votes?: number | null;
          thumbnail_url?: string | null;
          total_votes?: number | null;
          user_id?: string | null;
          width?: number | null;
          wilson_score?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'uploads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      are_friends: { Args: { a: string; b: string }; Returns: boolean };
      delete_own_account: { Args: never; Returns: undefined };
      get_comments: {
        Args: { p_limit?: number; p_offset?: number; p_upload_id: string };
        Returns: {
          avatar_url: string;
          body: string;
          created_at: string;
          id: string;
          like_count: number;
          parent_id: string;
          reply_count: number;
          user_id: string;
          username: string;
        }[];
      };
      get_feed: {
        Args: {
          p_limit?: number;
          p_offset?: number;
          p_seed?: number;
          p_user_id: string;
        };
        Returns: {
          avatar_url: string;
          bad_votes: number;
          caption: string;
          categories: string[];
          comment_count: number;
          created_at: string;
          feed_score: number;
          height: number;
          id: string;
          image_url: string;
          like_count: number;
          media_type: string;
          rad_votes: number;
          thumbnail_url: string;
          total_votes: number;
          user_id: string;
          username: string;
          width: number;
        }[];
      };
      get_friend_count: { Args: { p_user_id: string }; Returns: number };
      get_friend_ids: {
        Args: { p_user_id: string };
        Returns: {
          friend_id: string;
        }[];
      };
      get_inbox: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string };
        Returns: {
          bad_votes: number;
          caption: string;
          categories: string[];
          height: number;
          image_url: string;
          is_seen: boolean;
          media_type: string;
          post_avatar_url: string;
          post_created_at: string;
          post_user_id: string;
          post_user_rank: string;
          post_username: string;
          rad_votes: number;
          sender_avatar_url: string;
          sender_id: string;
          sender_username: string;
          share_id: string;
          shared_at: string;
          thumbnail_url: string;
          total_votes: number;
          upload_id: string;
          width: number;
        }[];
      };
      get_notifications: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string };
        Returns: {
          actor_avatar_url: string;
          actor_id: string;
          actor_username: string;
          body: string;
          comment_id: string;
          created_at: string;
          id: string;
          image_url: string;
          is_seen: boolean;
          thumbnail_url: string;
          type: string;
          upload_id: string;
        }[];
      };
      get_pending_requests: {
        Args: { p_user_id: string };
        Returns: {
          avatar_url: string;
          requested_at: string;
          requester_id: string;
          username: string;
        }[];
      };
      get_public_profile: {
        Args: { p_user_id: string };
        Returns: {
          avatar_url: string;
          follower_count: number;
          following_count: number;
          friend_count: number;
          id: string;
          post_count: number;
          username: string;
        }[];
      };
      get_replies: {
        Args: { p_comment_id: string; p_limit?: number };
        Returns: {
          avatar_url: string;
          body: string;
          created_at: string;
          id: string;
          is_liked: boolean;
          like_count: number;
          parent_id: string;
          user_id: string;
          user_rank: string;
          username: string;
        }[];
      };
      get_shareable_vibers: {
        Args: { p_user_id: string };
        Returns: {
          avatar_url: string;
          interaction_count: number;
          user_id: string;
          user_rank: string;
          username: string;
          vibe_score: number;
        }[];
      };
      get_unread_notification_count: {
        Args: { p_user_id: string };
        Returns: number;
      };
      get_unread_share_count: { Args: { p_user_id: string }; Returns: number };
      get_vibe_stats: {
        Args: { p_other_id: string; p_user_id: string };
        Returns: {
          best_streak: number;
          is_vibing: boolean;
          shared_count: number;
          vibe_score: number;
        }[];
      };
      get_vibe_suggestions: {
        Args: { p_limit?: number; p_user_id: string };
        Returns: {
          avatar_url: string;
          shared_count: number;
          user_id: string;
          username: string;
          vibe_score: number;
        }[];
      };
      grant_sparkles: {
        Args: { p_amount: number; p_reason: string; p_user_id: string };
        Returns: undefined;
      };
      refresh_rank_thresholds: { Args: never; Returns: undefined };
      remove_friend: { Args: { p_friend_id: string }; Returns: undefined };
      respond_friend_request: {
        Args: { p_accept: boolean; p_requester_id: string };
        Returns: undefined;
      };
      send_friend_request: { Args: { p_target_id: string }; Returns: undefined };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
      spend_sparkles: {
        Args: {
          p_amount: number;
          p_reason: string;
          p_reference_id?: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      get_friends_feed: {
        Args: { p_user_id: string; p_limit?: number };
        Returns: Record<string, unknown>[];
      };
      get_following_feed: {
        Args: { p_user_id: string; p_limit?: number };
        Returns: Record<string, unknown>[];
      };
      get_top_streaks: {
        Args: { p_user_id: string };
        Returns: Record<string, unknown>[];
      };
      get_friend_votes_on_post: {
        Args: { p_upload_id: string; p_user_id: string };
        Returns: Record<string, unknown>[];
      };
      wilson_lower_bound: {
        Args: { gas: number; total: number };
        Returns: number;
      };
    };
    Enums: {
      vote_type: 'rad' | 'bad' | 'skip';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      vote_type: ['rad', 'bad', 'skip'],
    },
  },
} as const;

/** Category type — categories are free-form strings in the DB */
export type Category = string;
