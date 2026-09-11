// Generated via the Supabase MCP `generate_typescript_types` tool from
// the migrations in supabase/migrations/. Do not hand-edit — regenerate
// after any schema change and commit the diff.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          is_active: boolean;
          role: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          is_active?: boolean;
          role?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          is_active?: boolean;
          role?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          position: number;
          slug: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          position?: number;
          slug: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          position?: number;
          slug?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          diff: Json | null;
          entity: string;
          entity_id: string | null;
          id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          diff?: Json | null;
          entity: string;
          entity_id?: string | null;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          diff?: Json | null;
          entity?: string;
          entity_id?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      directory_contacts: {
        Row: {
          address: string | null;
          created_at: string;
          department: string;
          email: string | null;
          id: string;
          location_id: string | null;
          name: string;
          phone_cell: string | null;
          phone_office: string | null;
          photo_url: string | null;
          position: number;
          role: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          department: string;
          email?: string | null;
          id?: string;
          location_id?: string | null;
          name: string;
          phone_cell?: string | null;
          phone_office?: string | null;
          photo_url?: string | null;
          position?: number;
          role?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          department?: string;
          email?: string | null;
          id?: string;
          location_id?: string | null;
          name?: string;
          phone_cell?: string | null;
          phone_office?: string | null;
          photo_url?: string | null;
          position?: number;
          role?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "directory_contacts_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      form_submissions: {
        Row: {
          created_at: string;
          form_key: string;
          id: string;
          ip_hash: string | null;
          page_slug: string | null;
          payload: Json;
          status: string;
          user_agent: string | null;
        };
        Insert: {
          created_at?: string;
          form_key: string;
          id?: string;
          ip_hash?: string | null;
          page_slug?: string | null;
          payload: Json;
          status?: string;
          user_agent?: string | null;
        };
        Update: {
          created_at?: string;
          form_key?: string;
          id?: string;
          ip_hash?: string | null;
          page_slug?: string | null;
          payload?: Json;
          status?: string;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      industries: {
        Row: {
          created_at: string;
          description: string | null;
          icon_key: string | null;
          id: string;
          name: string;
          position: number;
          slug: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          icon_key?: string | null;
          id?: string;
          name: string;
          position?: number;
          slug: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          icon_key?: string | null;
          id?: string;
          name?: string;
          position?: number;
          slug?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          address: string | null;
          city: string | null;
          country: string;
          country_code: string | null;
          created_at: string;
          email: string | null;
          id: string;
          is_featured: boolean;
          kind: string;
          lat: number | null;
          lng: number | null;
          name: string;
          phone: string | null;
          position: number;
          region: string | null;
          state: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          country: string;
          country_code?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_featured?: boolean;
          kind: string;
          lat?: number | null;
          lng?: number | null;
          name: string;
          phone?: string | null;
          position?: number;
          region?: string | null;
          state?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          country?: string;
          country_code?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_featured?: boolean;
          kind?: string;
          lat?: number | null;
          lng?: number | null;
          name?: string;
          phone?: string | null;
          position?: number;
          region?: string | null;
          state?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      media_assets: {
        Row: {
          alt: string | null;
          created_at: string;
          folder: string | null;
          height: number | null;
          id: string;
          mime: string | null;
          source: string;
          title: string | null;
          updated_at: string;
          url: string;
          width: number | null;
        };
        Insert: {
          alt?: string | null;
          created_at?: string;
          folder?: string | null;
          height?: number | null;
          id?: string;
          mime?: string | null;
          source?: string;
          title?: string | null;
          updated_at?: string;
          url: string;
          width?: number | null;
        };
        Update: {
          alt?: string | null;
          created_at?: string;
          folder?: string | null;
          height?: number | null;
          id?: string;
          mime?: string | null;
          source?: string;
          title?: string | null;
          updated_at?: string;
          url?: string;
          width?: number | null;
        };
        Relationships: [];
      };
      nav_items: {
        Row: {
          badge: string | null;
          created_at: string;
          href: string;
          id: string;
          is_external: boolean;
          label: string;
          menu_id: string;
          parent_id: string | null;
          position: number;
          updated_at: string;
        };
        Insert: {
          badge?: string | null;
          created_at?: string;
          href: string;
          id?: string;
          is_external?: boolean;
          label: string;
          menu_id: string;
          parent_id?: string | null;
          position?: number;
          updated_at?: string;
        };
        Update: {
          badge?: string | null;
          created_at?: string;
          href?: string;
          id?: string;
          is_external?: boolean;
          label?: string;
          menu_id?: string;
          parent_id?: string | null;
          position?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "nav_items_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "nav_menus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nav_items_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "nav_items";
            referencedColumns: ["id"];
          },
        ];
      };
      nav_menus: {
        Row: {
          created_at: string;
          id: string;
          key: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          key: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          key?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      news_posts: {
        Row: {
          body: Json | null;
          cover_image_url: string | null;
          created_at: string;
          cta_label: string | null;
          cta_url: string | null;
          event_date: string | null;
          event_location: string | null;
          excerpt: string | null;
          id: string;
          is_featured: boolean;
          kind: string;
          locale: string;
          published_at: string | null;
          slug: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          body?: Json | null;
          cover_image_url?: string | null;
          created_at?: string;
          cta_label?: string | null;
          cta_url?: string | null;
          event_date?: string | null;
          event_location?: string | null;
          excerpt?: string | null;
          id?: string;
          is_featured?: boolean;
          kind: string;
          locale?: string;
          published_at?: string | null;
          slug: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: Json | null;
          cover_image_url?: string | null;
          created_at?: string;
          cta_label?: string | null;
          cta_url?: string | null;
          event_date?: string | null;
          event_location?: string | null;
          excerpt?: string | null;
          id?: string;
          is_featured?: boolean;
          kind?: string;
          locale?: string;
          published_at?: string | null;
          slug?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      page_blocks: {
        Row: {
          created_at: string;
          data: Json;
          id: string;
          is_visible: boolean;
          page_id: string;
          position: number;
          type: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          data?: Json;
          id?: string;
          is_visible?: boolean;
          page_id: string;
          position: number;
          type: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          data?: Json;
          id?: string;
          is_visible?: boolean;
          page_id?: string;
          position?: number;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "page_blocks_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "pages";
            referencedColumns: ["id"];
          },
        ];
      };
      page_revisions: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          page_id: string;
          snapshot: Json;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          page_id: string;
          snapshot: Json;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          page_id?: string;
          snapshot?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "page_revisions_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "pages";
            referencedColumns: ["id"];
          },
        ];
      };
      pages: {
        Row: {
          created_at: string;
          id: string;
          is_system: boolean;
          locale: string;
          noindex: boolean;
          og_image_url: string | null;
          published_at: string | null;
          seo_description: string | null;
          seo_title: string | null;
          slug: string;
          status: string;
          template: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_system?: boolean;
          locale?: string;
          noindex?: boolean;
          og_image_url?: string | null;
          published_at?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          slug: string;
          status?: string;
          template?: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_system?: boolean;
          locale?: string;
          noindex?: boolean;
          og_image_url?: string | null;
          published_at?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          slug?: string;
          status?: string;
          template?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      product_applications: {
        Row: {
          application_id: string;
          product_id: string;
        };
        Insert: {
          application_id: string;
          product_id: string;
        };
        Update: {
          application_id?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_applications_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_applications_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_benefits: {
        Row: {
          body: string | null;
          created_at: string;
          icon_key: string | null;
          id: string;
          position: number;
          product_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          icon_key?: string | null;
          id?: string;
          position?: number;
          product_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          icon_key?: string | null;
          id?: string;
          position?: number;
          product_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_benefits_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          position: number;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          position?: number;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          position?: number;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_industries: {
        Row: {
          industry_id: string;
          product_id: string;
        };
        Insert: {
          industry_id: string;
          product_id: string;
        };
        Update: {
          industry_id?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_industries_industry_id_fkey";
            columns: ["industry_id"];
            isOneToOne: false;
            referencedRelation: "industries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_industries_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_related: {
        Row: {
          position: number;
          product_id: string;
          related_product_id: string;
        };
        Insert: {
          position?: number;
          product_id: string;
          related_product_id: string;
        };
        Update: {
          position?: number;
          product_id?: string;
          related_product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_related_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_related_related_product_id_fkey";
            columns: ["related_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_specs: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          position: number;
          product_id: string;
          unit: string | null;
          updated_at: string;
          value: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label: string;
          position?: number;
          product_id: string;
          unit?: string | null;
          updated_at?: string;
          value: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          position?: number;
          product_id?: string;
          unit?: string | null;
          updated_at?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_specs_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_stages: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          image_url: string | null;
          position: number;
          product_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          position?: number;
          product_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          position?: number;
          product_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_stages_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          badge: string | null;
          body: Json | null;
          brochure_pdf_url: string | null;
          category_id: string | null;
          created_at: string;
          diagram_image_url: string | null;
          eyebrow: string | null;
          hero_image_url: string | null;
          id: string;
          locale: string;
          model_3d_url: string | null;
          name: string;
          position: number;
          seo_description: string | null;
          seo_title: string | null;
          slug: string;
          status: string;
          summary: string | null;
          tagline: string | null;
          updated_at: string;
          video_url: string | null;
        };
        Insert: {
          badge?: string | null;
          body?: Json | null;
          brochure_pdf_url?: string | null;
          category_id?: string | null;
          created_at?: string;
          diagram_image_url?: string | null;
          eyebrow?: string | null;
          hero_image_url?: string | null;
          id?: string;
          locale?: string;
          model_3d_url?: string | null;
          name: string;
          position?: number;
          seo_description?: string | null;
          seo_title?: string | null;
          slug: string;
          status?: string;
          summary?: string | null;
          tagline?: string | null;
          updated_at?: string;
          video_url?: string | null;
        };
        Update: {
          badge?: string | null;
          body?: Json | null;
          brochure_pdf_url?: string | null;
          category_id?: string | null;
          created_at?: string;
          diagram_image_url?: string | null;
          eyebrow?: string | null;
          hero_image_url?: string | null;
          id?: string;
          locale?: string;
          model_3d_url?: string | null;
          name?: string;
          position?: number;
          seo_description?: string | null;
          seo_title?: string | null;
          slug?: string;
          status?: string;
          summary?: string | null;
          tagline?: string | null;
          updated_at?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      redirects: {
        Row: {
          created_at: string;
          from_path: string;
          id: string;
          status_code: number;
          to_path: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          from_path: string;
          id?: string;
          status_code?: number;
          to_path: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          from_path?: string;
          id?: string;
          status_code?: number;
          to_path?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      resources: {
        Row: {
          category: string | null;
          created_at: string;
          file_url: string;
          id: string;
          kind: string;
          position: number;
          product_id: string | null;
          status: string;
          thumbnail_url: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          file_url: string;
          id?: string;
          kind: string;
          position?: number;
          product_id?: string | null;
          status?: string;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          file_url?: string;
          id?: string;
          kind?: string;
          position?: number;
          product_id?: string | null;
          status?: string;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resources_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          body: Json | null;
          created_at: string;
          hero_image_url: string | null;
          id: string;
          locale: string;
          name: string;
          position: number;
          slug: string;
          status: string;
          summary: string | null;
          updated_at: string;
        };
        Insert: {
          body?: Json | null;
          created_at?: string;
          hero_image_url?: string | null;
          id?: string;
          locale?: string;
          name: string;
          position?: number;
          slug: string;
          status?: string;
          summary?: string | null;
          updated_at?: string;
        };
        Update: {
          body?: Json | null;
          created_at?: string;
          hero_image_url?: string | null;
          id?: string;
          locale?: string;
          name?: string;
          position?: number;
          slug?: string;
          status?: string;
          summary?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          address_lines: string[] | null;
          announcement_bar: Json | null;
          created_at: string;
          default_og_image: string | null;
          email: string | null;
          footer_tagline: string | null;
          id: boolean;
          map_embed_url: string | null;
          phone: string | null;
          social_facebook: string | null;
          social_instagram: string | null;
          social_linkedin: string | null;
          social_youtube: string | null;
          updated_at: string;
        };
        Insert: {
          address_lines?: string[] | null;
          announcement_bar?: Json | null;
          created_at?: string;
          default_og_image?: string | null;
          email?: string | null;
          footer_tagline?: string | null;
          id?: boolean;
          map_embed_url?: string | null;
          phone?: string | null;
          social_facebook?: string | null;
          social_instagram?: string | null;
          social_linkedin?: string | null;
          social_youtube?: string | null;
          updated_at?: string;
        };
        Update: {
          address_lines?: string[] | null;
          announcement_bar?: Json | null;
          created_at?: string;
          default_og_image?: string | null;
          email?: string | null;
          footer_tagline?: string | null;
          id?: boolean;
          map_embed_url?: string | null;
          phone?: string | null;
          social_facebook?: string | null;
          social_instagram?: string | null;
          social_linkedin?: string | null;
          social_youtube?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: { Args: never; Returns: boolean };
      is_staff: { Args: never; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
