export type Json =
  | string
  | number
  | boolean
  | null
  | {
      [key: string]:
        | Json
        | undefined;
    }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          avatar_url:
            | string
            | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          avatar_url?:
            | string
            | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          avatar_url?:
            | string
            | null;
          role?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_user_id: string;
          plan: string;
          branding: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          owner_user_id: string;
          plan?: string;
          branding?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          plan?: string;
          branding?: Json;
          updated_at?: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: string;
          active: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: string;
          active?: boolean;
          joined_at?: string;
        };
        Update: {
          role?: string;
          active?: boolean;
        };
      };
      courses: {
        Row: {
          id: string;
          organization_id:
            | string
            | null;
          slug: string;
          code: string;
          title: string;
          description: string;
          status: string;
          price_usd: number;
          instructor_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?:
            | string
            | null;
          slug: string;
          code: string;
          title: string;
          description?: string;
          status?: string;
          price_usd?: number;
          instructor_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          status?: string;
          price_usd?: number;
          updated_at?: string;
        };
      };
    };
    Views: Record<
      string,
      never
    >;
    Functions: Record<
      string,
      never
    >;
    Enums: Record<
      string,
      never
    >;
    CompositeTypes: Record<
      string,
      never
    >;
  };
};
