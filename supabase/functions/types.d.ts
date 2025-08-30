/* eslint-disable @typescript-eslint/no-explicit-any */
// Type shims for Deno-edge Supabase functions to satisfy VS Code/TS server
// These do not affect runtime (Deno fetches remote module types).

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  // Minimal typing for editor only
  export function createClient(...args: any[]): any;
}

// Global Deno env types for editor
declare const Deno: { env: { get: (name: string) => string | undefined } };
