export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          allow_captions: boolean | null
          brand_domain: string | null
          created_at: string | null
          cta_voice_line: string | null
          forbidden_claims: string[] | null
          id: string
          knowledge_base_urls: string[] | null
          name: string
          org_id: string
          product_service: string | null
          target_platforms: string[] | null
          tone_profile: string | null
          updated_at: string | null
        }
        Insert: {
          allow_captions?: boolean | null
          brand_domain?: string | null
          created_at?: string | null
          cta_voice_line?: string | null
          forbidden_claims?: string[] | null
          id?: string
          knowledge_base_urls?: string[] | null
          name: string
          org_id: string
          product_service?: string | null
          target_platforms?: string[] | null
          tone_profile?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_captions?: boolean | null
          brand_domain?: string | null
          created_at?: string | null
          cta_voice_line?: string | null
          forbidden_claims?: string[] | null
          id?: string
          knowledge_base_urls?: string[] | null
          name?: string
          org_id?: string
          product_service?: string | null
          target_platforms?: string[] | null
          tone_profile?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cloned_sources: {
        Row: {
          clone_count: number | null
          created_at: string
          first_cloned_at: string
          id: string
          last_checked_at: string
          metadata: Json | null
          org_id: string
          source_author: string | null
          source_engagement_score: number | null
          source_platform: string
          source_title: string | null
          source_url: string
          source_video_id: string | null
          source_views: number | null
          video_job_id: string | null
        }
        Insert: {
          clone_count?: number | null
          created_at?: string
          first_cloned_at?: string
          id?: string
          last_checked_at?: string
          metadata?: Json | null
          org_id: string
          source_author?: string | null
          source_engagement_score?: number | null
          source_platform: string
          source_title?: string | null
          source_url: string
          source_video_id?: string | null
          source_views?: number | null
          video_job_id?: string | null
        }
        Update: {
          clone_count?: number | null
          created_at?: string
          first_cloned_at?: string
          id?: string
          last_checked_at?: string
          metadata?: Json | null
          org_id?: string
          source_author?: string | null
          source_engagement_score?: number | null
          source_platform?: string
          source_title?: string | null
          source_url?: string
          source_video_id?: string | null
          source_views?: number | null
          video_job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cloned_sources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cloned_sources_video_job_id_fkey"
            columns: ["video_job_id"]
            isOneToOne: false
            referencedRelation: "video_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      credits_wallet: {
        Row: {
          credits_used: number | null
          current_credits: number | null
          last_topup: string | null
          next_reset: string | null
          org_id: string
          plan_allocation: number | null
          stripe_customer_id: string | null
        }
        Insert: {
          credits_used?: number | null
          current_credits?: number | null
          last_topup?: string | null
          next_reset?: string | null
          org_id: string
          plan_allocation?: number | null
          stripe_customer_id?: string | null
        }
        Update: {
          credits_used?: number | null
          current_credits?: number | null
          last_topup?: string | null
          next_reset?: string | null
          org_id?: string
          plan_allocation?: number | null
          stripe_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credits_wallet_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_replication_log: {
        Row: {
          created_at: string
          date: string
          id: string
          org_id: string
          platform: string
          scheduled_time: string | null
          source_video_url: string
          status: string
          video_job_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          org_id: string
          platform: string
          scheduled_time?: string | null
          source_video_url: string
          status?: string
          video_job_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          org_id?: string
          platform?: string
          scheduled_time?: string | null
          source_video_url?: string
          status?: string
          video_job_id?: string | null
        }
        Relationships: []
      }
      org_market_insights: {
        Row: {
          brand_voice_notes: string | null
          competitor_angle: string | null
          created_at: string | null
          headline_offers: string[] | null
          id: string
          last_generated_at: string | null
          niche_vertical: string | null
          objections: string[] | null
          org_id: string
          pain_points: string[] | null
          proof_points: string[] | null
          source_id: string | null
        }
        Insert: {
          brand_voice_notes?: string | null
          competitor_angle?: string | null
          created_at?: string | null
          headline_offers?: string[] | null
          id?: string
          last_generated_at?: string | null
          niche_vertical?: string | null
          objections?: string[] | null
          org_id: string
          pain_points?: string[] | null
          proof_points?: string[] | null
          source_id?: string | null
        }
        Update: {
          brand_voice_notes?: string | null
          competitor_angle?: string | null
          created_at?: string | null
          headline_offers?: string[] | null
          id?: string
          last_generated_at?: string | null
          niche_vertical?: string | null
          objections?: string[] | null
          org_id?: string
          pain_points?: string[] | null
          proof_points?: string[] | null
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_market_insights_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_market_insights_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "org_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      org_sources: {
        Row: {
          active: boolean | null
          crawl_status: string | null
          created_at: string | null
          id: string
          label: string | null
          last_crawled_at: string | null
          org_id: string
          type: string | null
          url: string
        }
        Insert: {
          active?: boolean | null
          crawl_status?: string | null
          created_at?: string | null
          id?: string
          label?: string | null
          last_crawled_at?: string | null
          org_id: string
          type?: string | null
          url: string
        }
        Update: {
          active?: boolean | null
          crawl_status?: string | null
          created_at?: string | null
          id?: string
          label?: string | null
          last_crawled_at?: string | null
          org_id?: string
          type?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_sources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_trend_history: {
        Row: {
          framework_id: string
          org_id: string
          performance_score: number | null
          used_at: string
        }
        Insert: {
          framework_id: string
          org_id: string
          performance_score?: number | null
          used_at?: string
        }
        Update: {
          framework_id?: string
          org_id?: string
          performance_score?: number | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_trend_history_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "viral_frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_trend_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_usage: {
        Row: {
          last_reset: string | null
          org_id: string
          total_memory_tokens: number | null
          total_storage_mb: number | null
          total_videos_generated: number | null
        }
        Insert: {
          last_reset?: string | null
          org_id: string
          total_memory_tokens?: number | null
          total_storage_mb?: number | null
          total_videos_generated?: number | null
        }
        Update: {
          last_reset?: string | null
          org_id?: string
          total_memory_tokens?: number | null
          total_storage_mb?: number | null
          total_videos_generated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "org_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active_platforms: string[] | null
          allow_captions: boolean | null
          allow_external_clients: boolean | null
          allow_internal_brands: boolean | null
          auto_generate_daily: boolean | null
          auto_post_daily: boolean | null
          auto_purge_old: boolean | null
          autopilot_enabled: boolean | null
          brand_domain: string | null
          created_at: string | null
          cta_voice_line: string | null
          default_post_time: string | null
          forbidden_claims: string[] | null
          id: string
          industry: string | null
          knowledge_base_urls: string[] | null
          legal_content_only: boolean | null
          memory_allocation_mb: number | null
          memory_used_mb: number | null
          name: string
          offer: string | null
          plan_tier: string | null
          platform_optimize: boolean | null
          product_focus: string[] | null
          requires_manual_review_before_post: boolean | null
          service_area: string | null
          target_verticals: string[] | null
          tone_profile: string | null
          updated_at: string | null
        }
        Insert: {
          active_platforms?: string[] | null
          allow_captions?: boolean | null
          allow_external_clients?: boolean | null
          allow_internal_brands?: boolean | null
          auto_generate_daily?: boolean | null
          auto_post_daily?: boolean | null
          auto_purge_old?: boolean | null
          autopilot_enabled?: boolean | null
          brand_domain?: string | null
          created_at?: string | null
          cta_voice_line?: string | null
          default_post_time?: string | null
          forbidden_claims?: string[] | null
          id?: string
          industry?: string | null
          knowledge_base_urls?: string[] | null
          legal_content_only?: boolean | null
          memory_allocation_mb?: number | null
          memory_used_mb?: number | null
          name: string
          offer?: string | null
          plan_tier?: string | null
          platform_optimize?: boolean | null
          product_focus?: string[] | null
          requires_manual_review_before_post?: boolean | null
          service_area?: string | null
          target_verticals?: string[] | null
          tone_profile?: string | null
          updated_at?: string | null
        }
        Update: {
          active_platforms?: string[] | null
          allow_captions?: boolean | null
          allow_external_clients?: boolean | null
          allow_internal_brands?: boolean | null
          auto_generate_daily?: boolean | null
          auto_post_daily?: boolean | null
          auto_purge_old?: boolean | null
          autopilot_enabled?: boolean | null
          brand_domain?: string | null
          created_at?: string | null
          cta_voice_line?: string | null
          default_post_time?: string | null
          forbidden_claims?: string[] | null
          id?: string
          industry?: string | null
          knowledge_base_urls?: string[] | null
          legal_content_only?: boolean | null
          memory_allocation_mb?: number | null
          memory_used_mb?: number | null
          name?: string
          offer?: string | null
          plan_tier?: string | null
          platform_optimize?: boolean | null
          product_focus?: string[] | null
          requires_manual_review_before_post?: boolean | null
          service_area?: string | null
          target_verticals?: string[] | null
          tone_profile?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_variants: {
        Row: {
          caption: string | null
          created_at: string | null
          engagement_prediction: number | null
          hashtags: string[] | null
          id: string
          platform: string
          thumbnail_url: string | null
          variant_status: string | null
          variant_url: string | null
          video_job_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          engagement_prediction?: number | null
          hashtags?: string[] | null
          id?: string
          platform: string
          thumbnail_url?: string | null
          variant_status?: string | null
          variant_url?: string | null
          video_job_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          engagement_prediction?: number | null
          hashtags?: string[] | null
          id?: string
          platform?: string
          thumbnail_url?: string | null
          variant_status?: string | null
          variant_url?: string | null
          video_job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_variants_video_job_id_fkey"
            columns: ["video_job_id"]
            isOneToOne: false
            referencedRelation: "video_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_virality_profiles: {
        Row: {
          audio_rules: Json | null
          caption_style: string | null
          engagement_triggers: Json | null
          hashtag_strategy: Json | null
          hook_window_seconds: number | null
          ideal_length_seconds: number | null
          last_synced: string | null
          platform: string
          update_frequency_days: number | null
          visual_rules: Json | null
        }
        Insert: {
          audio_rules?: Json | null
          caption_style?: string | null
          engagement_triggers?: Json | null
          hashtag_strategy?: Json | null
          hook_window_seconds?: number | null
          ideal_length_seconds?: number | null
          last_synced?: string | null
          platform: string
          update_frequency_days?: number | null
          visual_rules?: Json | null
        }
        Update: {
          audio_rules?: Json | null
          caption_style?: string | null
          engagement_triggers?: Json | null
          hashtag_strategy?: Json | null
          hook_window_seconds?: number | null
          ideal_length_seconds?: number | null
          last_synced?: string | null
          platform?: string
          update_frequency_days?: number | null
          visual_rules?: Json | null
        }
        Relationships: []
      }
      policies: {
        Row: {
          active: boolean | null
          applies_to_product_focus: string[] | null
          category: string | null
          created_at: string | null
          effective_date: string | null
          id: string
          json_schema: Json | null
          rule_text: string | null
          tool_or_platform: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          applies_to_product_focus?: string[] | null
          category?: string | null
          created_at?: string | null
          effective_date?: string | null
          id?: string
          json_schema?: Json | null
          rule_text?: string | null
          tool_or_platform?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          applies_to_product_focus?: string[] | null
          category?: string | null
          created_at?: string | null
          effective_date?: string | null
          id?: string
          json_schema?: Json | null
          rule_text?: string | null
          tool_or_platform?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      policy_changes: {
        Row: {
          change_date: string | null
          change_description: string | null
          created_at: string | null
          diff_notes: Json | null
          id: string
          policy_id: string | null
        }
        Insert: {
          change_date?: string | null
          change_description?: string | null
          created_at?: string | null
          diff_notes?: Json | null
          id?: string
          policy_id?: string | null
        }
        Update: {
          change_date?: string | null
          change_description?: string | null
          created_at?: string | null
          diff_notes?: Json | null
          id?: string
          policy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_changes_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      publish_queue: {
        Row: {
          brand_label: string | null
          caption: string | null
          created_at: string | null
          final_url: string | null
          id: string
          org_id: string
          platform: string | null
          platform_response: Json | null
          platform_specific_variant_id: string | null
          scheduled_time: string | null
          status: string | null
          target_vertical: string | null
          updated_at: string | null
          video_job_id: string | null
        }
        Insert: {
          brand_label?: string | null
          caption?: string | null
          created_at?: string | null
          final_url?: string | null
          id?: string
          org_id: string
          platform?: string | null
          platform_response?: Json | null
          platform_specific_variant_id?: string | null
          scheduled_time?: string | null
          status?: string | null
          target_vertical?: string | null
          updated_at?: string | null
          video_job_id?: string | null
        }
        Update: {
          brand_label?: string | null
          caption?: string | null
          created_at?: string | null
          final_url?: string | null
          id?: string
          org_id?: string
          platform?: string | null
          platform_response?: Json | null
          platform_specific_variant_id?: string | null
          scheduled_time?: string | null
          status?: string | null
          target_vertical?: string | null
          updated_at?: string | null
          video_job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publish_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_queue_platform_specific_variant_id_fkey"
            columns: ["platform_specific_variant_id"]
            isOneToOne: false
            referencedRelation: "platform_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_queue_video_job_id_fkey"
            columns: ["video_job_id"]
            isOneToOne: false
            referencedRelation: "video_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_ads: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          performance_score: number | null
          script: string | null
          structural_pattern: Json | null
          tone_profile: string | null
          updated_at: string | null
          video_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          performance_score?: number | null
          script?: string | null
          structural_pattern?: Json | null
          tone_profile?: string | null
          updated_at?: string | null
          video_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          performance_score?: number | null
          script?: string | null
          structural_pattern?: Json | null
          tone_profile?: string | null
          updated_at?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_ads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      related_trends: {
        Row: {
          created_at: string | null
          id: string
          reason: string | null
          related_video_id: string
          similarity_score: number | null
          video_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: string | null
          related_video_id: string
          similarity_score?: number | null
          video_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string | null
          related_video_id?: string
          similarity_score?: number | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "related_trends_related_video_id_fkey"
            columns: ["related_video_id"]
            isOneToOne: false
            referencedRelation: "trends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_trends_related_video_id_fkey"
            columns: ["related_video_id"]
            isOneToOne: false
            referencedRelation: "viral_ranking"
            referencedColumns: ["trend_id"]
          },
          {
            foreignKeyName: "related_trends_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "trends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_trends_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "viral_ranking"
            referencedColumns: ["trend_id"]
          },
        ]
      }
      replication_history: {
        Row: {
          created_at: string | null
          id: string
          org_id: string | null
          platform: string | null
          processed_at: string | null
          remake_job_id: string | null
          scheduled_time: string | null
          source_video_url: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id?: string | null
          platform?: string | null
          processed_at?: string | null
          remake_job_id?: string | null
          scheduled_time?: string | null
          source_video_url: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string | null
          platform?: string | null
          processed_at?: string | null
          remake_job_id?: string | null
          scheduled_time?: string | null
          source_video_url?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "replication_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replication_history_remake_job_id_fkey"
            columns: ["remake_job_id"]
            isOneToOne: false
            referencedRelation: "video_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      trends: {
        Row: {
          brand_notes: string | null
          captured_at: string | null
          category: string | null
          clone_ready: boolean | null
          clone_score: number | null
          comments: number | null
          detected_language: string | null
          duration_seconds: number | null
          embed_html: string | null
          engagement_score: number | null
          hashtags: string[] | null
          hook_text: string | null
          id: string
          is_ad: boolean | null
          likes: number | null
          platform: string | null
          source_video_url: string | null
          spoken_content: boolean | null
          thumbnail_url: string | null
          title: string | null
          transcript: string | null
          views: number | null
          viral_notes: string | null
        }
        Insert: {
          brand_notes?: string | null
          captured_at?: string | null
          category?: string | null
          clone_ready?: boolean | null
          clone_score?: number | null
          comments?: number | null
          detected_language?: string | null
          duration_seconds?: number | null
          embed_html?: string | null
          engagement_score?: number | null
          hashtags?: string[] | null
          hook_text?: string | null
          id?: string
          is_ad?: boolean | null
          likes?: number | null
          platform?: string | null
          source_video_url?: string | null
          spoken_content?: boolean | null
          thumbnail_url?: string | null
          title?: string | null
          transcript?: string | null
          views?: number | null
          viral_notes?: string | null
        }
        Update: {
          brand_notes?: string | null
          captured_at?: string | null
          category?: string | null
          clone_ready?: boolean | null
          clone_score?: number | null
          comments?: number | null
          detected_language?: string | null
          duration_seconds?: number | null
          embed_html?: string | null
          engagement_score?: number | null
          hashtags?: string[] | null
          hook_text?: string | null
          id?: string
          is_ad?: boolean | null
          likes?: number | null
          platform?: string | null
          source_video_url?: string | null
          spoken_content?: boolean | null
          thumbnail_url?: string | null
          title?: string | null
          transcript?: string | null
          views?: number | null
          viral_notes?: string | null
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          created_at: string | null
          credits_cost: number
          description: string | null
          feature: string
          id: string
          org_id: string
        }
        Insert: {
          created_at?: string | null
          credits_cost: number
          description?: string | null
          feature: string
          id?: string
          org_id: string
        }
        Update: {
          created_at?: string | null
          credits_cost?: number
          description?: string | null
          feature?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          org_id: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          org_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          org_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      video_jobs: {
        Row: {
          actual_ctr: number | null
          actual_views: number | null
          actual_watch_time_seconds: number | null
          adaptation_notes: string | null
          adapted_script: string | null
          autopilot_enabled: boolean | null
          autopilot_snapshot: boolean | null
          brand_id: string | null
          brand_label: string | null
          campaign_type: string | null
          cinematic_structure: Json | null
          cloned_at: string | null
          compliance_report: Json | null
          compliance_status: string | null
          created_at: string | null
          cta_custom: string | null
          dna_match_score: number | null
          early_ctr: number | null
          early_watch_time: number | null
          emotional_variant_generated: boolean | null
          final_url: string | null
          id: string
          insight_id: string | null
          merged_url: string | null
          org_id: string
          performance_score: number | null
          post_targets: string[] | null
          posted_metadata: Json | null
          scene_prompts: Json | null
          script_approved: boolean | null
          script_draft: string | null
          selected_variant: boolean | null
          source_platform: string | null
          source_title: string | null
          source_video_id: string | null
          source_video_url: string | null
          status: string | null
          storage_path: string | null
          super_tone: string | null
          super_variant_generated: boolean | null
          target_vertical: string | null
          tone_variant: string | null
          transcript: string | null
          trend_id: string | null
          updated_at: string | null
          variant_group_id: string | null
          veo_urls: string[] | null
          virality_score: number | null
        }
        Insert: {
          actual_ctr?: number | null
          actual_views?: number | null
          actual_watch_time_seconds?: number | null
          adaptation_notes?: string | null
          adapted_script?: string | null
          autopilot_enabled?: boolean | null
          autopilot_snapshot?: boolean | null
          brand_id?: string | null
          brand_label?: string | null
          campaign_type?: string | null
          cinematic_structure?: Json | null
          cloned_at?: string | null
          compliance_report?: Json | null
          compliance_status?: string | null
          created_at?: string | null
          cta_custom?: string | null
          dna_match_score?: number | null
          early_ctr?: number | null
          early_watch_time?: number | null
          emotional_variant_generated?: boolean | null
          final_url?: string | null
          id?: string
          insight_id?: string | null
          merged_url?: string | null
          org_id: string
          performance_score?: number | null
          post_targets?: string[] | null
          posted_metadata?: Json | null
          scene_prompts?: Json | null
          script_approved?: boolean | null
          script_draft?: string | null
          selected_variant?: boolean | null
          source_platform?: string | null
          source_title?: string | null
          source_video_id?: string | null
          source_video_url?: string | null
          status?: string | null
          storage_path?: string | null
          super_tone?: string | null
          super_variant_generated?: boolean | null
          target_vertical?: string | null
          tone_variant?: string | null
          transcript?: string | null
          trend_id?: string | null
          updated_at?: string | null
          variant_group_id?: string | null
          veo_urls?: string[] | null
          virality_score?: number | null
        }
        Update: {
          actual_ctr?: number | null
          actual_views?: number | null
          actual_watch_time_seconds?: number | null
          adaptation_notes?: string | null
          adapted_script?: string | null
          autopilot_enabled?: boolean | null
          autopilot_snapshot?: boolean | null
          brand_id?: string | null
          brand_label?: string | null
          campaign_type?: string | null
          cinematic_structure?: Json | null
          cloned_at?: string | null
          compliance_report?: Json | null
          compliance_status?: string | null
          created_at?: string | null
          cta_custom?: string | null
          dna_match_score?: number | null
          early_ctr?: number | null
          early_watch_time?: number | null
          emotional_variant_generated?: boolean | null
          final_url?: string | null
          id?: string
          insight_id?: string | null
          merged_url?: string | null
          org_id?: string
          performance_score?: number | null
          post_targets?: string[] | null
          posted_metadata?: Json | null
          scene_prompts?: Json | null
          script_approved?: boolean | null
          script_draft?: string | null
          selected_variant?: boolean | null
          source_platform?: string | null
          source_title?: string | null
          source_video_id?: string | null
          source_video_url?: string | null
          status?: string | null
          storage_path?: string | null
          super_tone?: string | null
          super_variant_generated?: boolean | null
          target_vertical?: string | null
          tone_variant?: string | null
          transcript?: string | null
          trend_id?: string | null
          updated_at?: string | null
          variant_group_id?: string | null
          veo_urls?: string[] | null
          virality_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_video_jobs_insight"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "org_market_insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_jobs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      viral_frameworks: {
        Row: {
          created_at: string | null
          derived_from_trend_id: string | null
          freshness_score: number | null
          id: string
          key_traits: Json | null
          platform: string | null
          script_template: string | null
          summary: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          derived_from_trend_id?: string | null
          freshness_score?: number | null
          id?: string
          key_traits?: Json | null
          platform?: string | null
          script_template?: string | null
          summary?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          derived_from_trend_id?: string | null
          freshness_score?: number | null
          id?: string
          key_traits?: Json | null
          platform?: string | null
          script_template?: string | null
          summary?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "viral_frameworks_derived_from_trend_id_fkey"
            columns: ["derived_from_trend_id"]
            isOneToOne: false
            referencedRelation: "trends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viral_frameworks_derived_from_trend_id_fkey"
            columns: ["derived_from_trend_id"]
            isOneToOne: false
            referencedRelation: "viral_ranking"
            referencedColumns: ["trend_id"]
          },
        ]
      }
      viral_scores: {
        Row: {
          ad_type: string | null
          ai_reasoning: string | null
          calculated_at: string
          category: string | null
          clone_match_percent: number | null
          clone_score: number
          commercial_dna_score: number | null
          emotional_depth: number | null
          engagement_velocity: number | null
          id: string
          informational_value: number | null
          overall_score: number
          product_fit_score: number
          replication_feasibility: number | null
          shareability_score: number | null
          shock_score: number | null
          shock_warmth_ratio: number | null
          tone_recommendations: Json | null
          transformation_score: number | null
          trend_id: string
          viral_rank: number | null
          virality_score: number
          warmth_score: number | null
        }
        Insert: {
          ad_type?: string | null
          ai_reasoning?: string | null
          calculated_at?: string
          category?: string | null
          clone_match_percent?: number | null
          clone_score?: number
          commercial_dna_score?: number | null
          emotional_depth?: number | null
          engagement_velocity?: number | null
          id?: string
          informational_value?: number | null
          overall_score?: number
          product_fit_score?: number
          replication_feasibility?: number | null
          shareability_score?: number | null
          shock_score?: number | null
          shock_warmth_ratio?: number | null
          tone_recommendations?: Json | null
          transformation_score?: number | null
          trend_id: string
          viral_rank?: number | null
          virality_score?: number
          warmth_score?: number | null
        }
        Update: {
          ad_type?: string | null
          ai_reasoning?: string | null
          calculated_at?: string
          category?: string | null
          clone_match_percent?: number | null
          clone_score?: number
          commercial_dna_score?: number | null
          emotional_depth?: number | null
          engagement_velocity?: number | null
          id?: string
          informational_value?: number | null
          overall_score?: number
          product_fit_score?: number
          replication_feasibility?: number | null
          shareability_score?: number | null
          shock_score?: number | null
          shock_warmth_ratio?: number | null
          tone_recommendations?: Json | null
          transformation_score?: number | null
          trend_id?: string
          viral_rank?: number | null
          virality_score?: number
          warmth_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "viral_scores_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: true
            referencedRelation: "trends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viral_scores_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: true
            referencedRelation: "viral_ranking"
            referencedColumns: ["trend_id"]
          },
        ]
      }
    }
    Views: {
      viral_ranking: {
        Row: {
          clone_match_percent: number | null
          clone_score: number | null
          final_score: number | null
          is_ad: boolean | null
          overall_score: number | null
          platform: string | null
          product_fit_score: number | null
          title: string | null
          trend_id: string | null
          views: number | null
          viral_rank: number | null
          virality_score: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_credits: {
        Args: { _amount: number; _description?: string; _org_id: string }
        Returns: boolean
      }
      auto_select_best_variant: { Args: never; Returns: undefined }
      charge_credits: {
        Args: {
          _cost: number
          _description?: string
          _feature: string
          _org_id: string
        }
        Returns: boolean
      }
      charge_platform_variant: {
        Args: { _org_id: string; _platform: string; _video_job_id: string }
        Returns: boolean
      }
      filter_uncloned_sources: {
        Args: { p_org_id: string; p_source_urls: string[] }
        Returns: string[]
      }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_source_cloned: {
        Args: { p_org_id: string; p_source_url: string }
        Returns: boolean
      }
      mark_source_cloned: {
        Args: {
          p_org_id: string
          p_source_author?: string
          p_source_engagement_score?: number
          p_source_platform: string
          p_source_title?: string
          p_source_url: string
          p_source_video_id: string
          p_source_views?: number
          p_video_job_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
