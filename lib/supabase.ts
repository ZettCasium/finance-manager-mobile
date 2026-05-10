import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xbdnxbljfdcxctkkggsk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiZG54YmxqZmRjeGN0a2tnZ3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTM2ODAsImV4cCI6MjA5Mzg4OTY4MH0.w9tAinRuS6OluTphb7z4gmCE0N6ME7FKPD2zNlAEsvE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
