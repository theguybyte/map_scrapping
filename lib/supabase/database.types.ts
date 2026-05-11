// Hand-written Supabase types matching the migrations in /supabase/migrations.
// Once a real Supabase project is connected, replace this with output from:
//   npx supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts

export type Database = {
  public: {
    Tables: {
      searches: {
        Row: {
          id: string;
          province: string;
          city: string;
          category: string;
          radius_km: number;
          center_lat: number;
          center_lng: number;
          status: string;
          total_results: number | null;
          apify_run_id: string | null;
          error_message: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          province: string;
          city: string;
          category: string;
          radius_km: number;
          center_lat: number;
          center_lng: number;
          status?: string;
          total_results?: number | null;
          apify_run_id?: string | null;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["searches"]["Insert"]>;
        Relationships: [];
      };
      leads: {
        Row: {
          place_id: string;
          name: string;
          address: string | null;
          city: string | null;
          province: string | null;
          phone: string | null;
          website: string | null;
          email: string | null;
          instagram: string | null;
          facebook: string | null;
          rating: number | null;
          review_count: number | null;
          category: string | null;
          category_id: string | null;
          latitude: number | null;
          longitude: number | null;
          google_maps_url: string | null;
          business_status: string | null;
          last_scraped_at: string;
          created_at: string;
        };
        Insert: {
          place_id: string;
          name: string;
          address?: string | null;
          city?: string | null;
          province?: string | null;
          phone?: string | null;
          website?: string | null;
          email?: string | null;
          instagram?: string | null;
          facebook?: string | null;
          rating?: number | null;
          review_count?: number | null;
          category?: string | null;
          category_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          google_maps_url?: string | null;
          business_status?: string | null;
          last_scraped_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
        Relationships: [];
      };
      search_leads: {
        Row: { search_id: string; place_id: string };
        Insert: { search_id: string; place_id: string };
        Update: Partial<{ search_id: string; place_id: string }>;
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: boolean;
          apify_api_token: string | null;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          apify_api_token?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["app_settings"]["Insert"]>;
        Relationships: [];
      };
      cities: {
        Row: {
          id: number;
          province: string;
          name: string;
          lat: number;
          lng: number;
          radius_km: number | null;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          province: string;
          name: string;
          lat: number;
          lng: number;
          radius_km?: number | null;
          source: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cities"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
