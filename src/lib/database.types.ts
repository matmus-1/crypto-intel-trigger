export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MoveType = "pump" | "dump" | "volume_spike" | "breakout" | "breakdown";
export type PredictionStatus = "pending" | "correct" | "incorrect" | "partial" | "expired";

export interface Database {
  public: {
    Tables: {
      coins: {
        Row: {
          id: string;
          symbol: string;
          name: string;
          platforms: Json;
          categories: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          symbol: string;
          name: string;
          platforms?: Json;
          categories?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          symbol?: string;
          name?: string;
          platforms?: Json;
          categories?: Json;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      price_snapshots: {
        Row: {
          id: string;
          coin_id: string;
          price: number;
          volume_24h: number;
          market_cap: number;
          price_change_1h: number | null;
          price_change_24h: number | null;
          price_change_7d: number | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          coin_id: string;
          price: number;
          volume_24h: number;
          market_cap: number;
          price_change_1h?: number | null;
          price_change_24h?: number | null;
          price_change_7d?: number | null;
          recorded_at?: string;
        };
        Update: {
          price?: number;
          volume_24h?: number;
          market_cap?: number;
          price_change_1h?: number | null;
          price_change_24h?: number | null;
          price_change_7d?: number | null;
        };
      };
      mover_events: {
        Row: {
          id: string;
          coin_id: string;
          symbol: string;
          name: string;
          move_type: MoveType;
          magnitude: number;
          price: number;
          market_cap: number;
          volume_24h: number;
          volume_ratio: number | null;
          btc_relative: number | null;
          rank: number | null;
          metadata: Json;
          detected_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          coin_id: string;
          symbol: string;
          name: string;
          move_type: MoveType;
          magnitude: number;
          price: number;
          market_cap: number;
          volume_24h: number;
          volume_ratio?: number | null;
          btc_relative?: number | null;
          rank?: number | null;
          metadata?: Json;
          detected_at?: string;
          created_at?: string;
        };
        Update: {
          move_type?: MoveType;
          magnitude?: number;
          metadata?: Json;
        };
      };
      research_reports: {
        Row: {
          id: string;
          mover_event_id: string;
          catalyst: string | null;
          catalyst_confidence: number | null;
          news_summary: string | null;
          sentiment_label: string | null;
          sentiment_score: number | null;
          key_factors: Json;
          risks: Json;
          full_analysis: string | null;
          similar_events: Json;
          news_articles: Json;
          tokens_used: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          mover_event_id: string;
          catalyst?: string | null;
          catalyst_confidence?: number | null;
          news_summary?: string | null;
          sentiment_label?: string | null;
          sentiment_score?: number | null;
          key_factors?: Json;
          risks?: Json;
          full_analysis?: string | null;
          similar_events?: Json;
          news_articles?: Json;
          tokens_used?: number | null;
          created_at?: string;
        };
        Update: {
          catalyst?: string | null;
          news_summary?: string | null;
          full_analysis?: string | null;
        };
      };
      predictions: {
        Row: {
          id: string;
          coin_id: string;
          mover_event_id: string | null;
          predicted_direction: string;
          predicted_magnitude: number | null;
          confidence: number;
          reasoning: string | null;
          horizon_hours: number;
          status: PredictionStatus;
          actual_change: number | null;
          predicted_at: string;
          evaluated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          coin_id: string;
          mover_event_id?: string | null;
          predicted_direction: string;
          predicted_magnitude?: number | null;
          confidence: number;
          reasoning?: string | null;
          horizon_hours?: number;
          status?: PredictionStatus;
          actual_change?: number | null;
          predicted_at?: string;
          evaluated_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: PredictionStatus;
          actual_change?: number | null;
          evaluated_at?: string | null;
        };
      };
      daily_stats: {
        Row: {
          id: string;
          date: string;
          total_movers: number;
          pumps: number;
          dumps: number;
          volume_spikes: number;
          research_count: number;
          predictions_made: number;
          predictions_correct: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          total_movers?: number;
          pumps?: number;
          dumps?: number;
          volume_spikes?: number;
          research_count?: number;
          predictions_made?: number;
          predictions_correct?: number;
          created_at?: string;
        };
        Update: {
          total_movers?: number;
          pumps?: number;
          dumps?: number;
          volume_spikes?: number;
          research_count?: number;
          predictions_made?: number;
          predictions_correct?: number;
        };
      };
    };
  };
}
