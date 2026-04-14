import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co')
);

// Valid-looking dummy values to satisfy the library's internal validation during build/init
const DUMMY_URL = 'https://placeholder-project.supabase.co';
const DUMMY_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE1MTYyMzkMDIyfQ.placeholder';

let client: any;

export const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (!client) {
      try {
        client = createClient(
          supabaseUrl || DUMMY_URL,
          supabaseAnonKey || DUMMY_KEY
        );
      } catch (e) {
        console.warn('Supabase client initialization failed, using fallback.', e);
        // Fallback to a very basic mock if even createClient fails
        return (target as any)[prop];
      }
    }
    
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});
